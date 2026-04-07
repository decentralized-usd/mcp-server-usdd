import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import startServer from "./server/server.js";

async function main() {
  const server = await startServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("@usdd/mcp-server-usdd running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
