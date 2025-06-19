import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPackageVersion, loadEnv, log } from "./utils";
import { tools } from "./tools";
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

loadEnv();

const server = new McpServer({
  name: "google-tag-manager",
  version: getPackageVersion(),
  protocolVersion: "1.0",
  vendor: "stape-io",
  homepage: "https://github.com/stape-io/google-tag-manager-mcp-server",
});

tools.forEach((register) => register(server));

const PORT = process.env.PORT || 3000;

// Store transports by session ID
const transports: Record<string, SSEServerTransport> = {};

// Create HTTP server
const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const parsedUrl = parse(req.url || '', true);
  let pathname = parsedUrl.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  const query = parsedUrl.query;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle SSE endpoint for establishing the stream
  if (pathname === '/sse' && req.method === 'GET') {
    log('SSE connection established');
    
    try {
      // Create SSE transport - it will handle its own headers
      const transport = new SSEServerTransport('/sse/message', res as any);
      
      // Store the transport by session ID
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;
      
      // Set up onclose handler to clean up transport
      transport.onclose = () => {
        log(`SSE transport closed for session ${sessionId}`);
        delete transports[sessionId];
      };

      // Connect the existing McpServer instance
      await server.connect(transport);
      
      log(`Established SSE stream with session ID: ${sessionId}`);
    } catch (error) {
      log(`Error establishing SSE stream: ${error}`);
      if (!res.headersSent) {
        res.writeHead(500).end('Error establishing SSE stream');
      }
    }

    return;
  }

  // Handle SSE message endpoint
  if (pathname === '/sse/message' && req.method === 'POST') {
    log('Received POST request to /sse/message');
    
    // Extract session ID from URL query parameter
    const sessionId = query.sessionId as string;
    if (!sessionId) {
      log('No session ID provided in request URL');
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing sessionId parameter');
      return;
    }

    const transport = transports[sessionId];
    if (!transport) {
      log(`No active transport found for session ID: ${sessionId}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Session not found');
      return;
    }

    try {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const message = JSON.parse(body);
          await transport.handlePostMessage(req, res, message);
        } catch (error) {
          log(`Error handling message: ${error}`);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error handling message');
          }
        }
      });
    } catch (error) {
      log(`Error processing message: ${error}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error processing message');
      }
    }

    return;
  }

  // Health check endpoint
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'gtm-mcp' }));
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

httpServer.listen(PORT, () => {
  log(`MCP SSE server running on http://localhost:${PORT}`);
  log(`SSE endpoint: http://localhost:${PORT}/sse`);
});

// Graceful shutdown
const shutdown = async () => {
  log('Shutting down gracefully');
  
  // Close all active transports
  for (const sessionId in transports) {
    try {
      log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      log(`Error closing transport for session ${sessionId}: ${error}`);
    }
  }
  
  httpServer.close(() => {
    log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
