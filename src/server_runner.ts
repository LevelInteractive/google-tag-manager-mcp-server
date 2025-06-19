import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

const PORT = process.env.PORT || 3000;

interface ServerOptions {
  name: string;
  version: string;
  protocolVersion: string;
  vendor?: string;
  homepage?: string;
}

export const ExpressSseMcpServer = (
  options: ServerOptions,
  setupCb: (server: McpServer) => void,
) => {
  const server = new McpServer(
    {
      name: options.name,
      version: options.version,
      protocolVersion: options.protocolVersion,
      vendor: options.vendor,
      homepage: options.homepage,
    },
    {
      capabilities: {
        logging: {},
        tools: {
          listChanged: false,
        },
      },
    },
  );

  setupCb(server);

  const app = express();
  app.use(express.json());

  // Store transports by session ID
  const transports: { [sessionId: string]: SSEServerTransport } = {};

  // SSE endpoint for establishing the stream
  app.get('/sse', async (req: Request, res: Response) => {
    console.log('Received GET request to /sse (establishing SSE stream)');
    try {
      // The endpoint for POST messages is 'messages' (relative to /sse)
      const transport = new SSEServerTransport('messages', res);

      // Store the transport by session ID
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        console.log(`SSE transport closed for session ${sessionId}`);
        delete transports[sessionId];
      };

      // Connect the transport to the MCP server
      await server.connect(transport);

      console.log(`Established SSE stream with session ID: ${sessionId}`);
    } catch (error) {
      console.error('Error establishing SSE stream:', error);
      if (!res.headersSent) {
        res.status(500).send('Error establishing SSE stream');
      }
    }
  });

  // Messages endpoint for receiving client JSON-RPC requests
  app.post('/sse/messages', async (req: Request, res: Response) => {
    console.log('Received POST request to /sse/messages');

    // Extract session ID from URL query parameter
    const sessionId = req.query.sessionId as string | undefined;

    if (!sessionId) {
      console.error('No session ID provided in request URL');
      res.status(400).send('Missing sessionId parameter');
      return;
    }

    const transport = transports[sessionId];
    if (!transport) {
      console.error(`No active transport found for session ID: ${sessionId}`);
      res.status(404).send('Session not found');
      return;
    }

    try {
      // Handle the POST message with the transport
      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error('Error handling request:', error);
      if (!res.headersSent) {
        res.status(500).send('Error handling request');
      }
    }
  });


  const express_server = app.listen(PORT, () => {
    console.log(`MCP SSE Server (deprecated protocol) listening on port ${PORT}`);
  });

  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');

    // Close all active transports to properly clean up resources
    for (const sessionId in transports) {
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(
          `Error closing transport for session ${sessionId}:`,
          error,
        );
      }
    }

    await new Promise((resolve) => express_server.close(resolve));
    await server.close();
    console.log('Server shutdown complete');
    process.exit(0);
  });

  return { process, server, express_server };
};
