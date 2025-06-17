import { ExpressHttpStreamableMcpServer } from "./server_runner.js";
import { getPackageVersion, loadEnv } from "./utils/index.js";
import { tools } from "./tools/index.js";

loadEnv();

console.log("Initializing MCP Streamable-HTTP Server with Express");

ExpressHttpStreamableMcpServer(
  {
    name: "google-tag-manager",
    version: getPackageVersion(),
    protocolVersion: "1.0",
    vendor: "stape-io",
    homepage: "https://github.com/stape-io/google-tag-manager-mcp-server",
  },
  (server) => {
    tools.forEach((register) => register(server));
  },
);
