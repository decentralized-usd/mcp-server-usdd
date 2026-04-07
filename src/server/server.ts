import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUsddResources } from "../core/resources.js";
import { registerUsddTools } from "../core/tools.js";
import { registerUsddPrompts } from "../core/prompts.js";
import { getSupportedNetworks } from "../core/chains.js";
import { initializeWalletStore, getWalletStorePath } from "../core/services/wallet.js";

async function startServer() {
  const wallets = initializeWalletStore();
  const server = new McpServer(
    {
      name: "mcp-server-usdd",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: false, listChanged: true },
        prompts: { listChanged: true },
        logging: {},
      },
    },
  );

  registerUsddResources(server);
  registerUsddTools(server);
  registerUsddPrompts(server);

  console.error("@usdd/mcp-server-usdd v1.0.0 initialized");
  console.error(`Supported networks: ${getSupportedNetworks().join(", ")}`);
  console.error(`Encrypted wallets directory: ${getWalletStorePath()}`);
  console.error(`Active TRON wallet: ${wallets.tron.address} (${wallets.tron.id})`);
  console.error(`Active EVM wallet: ${wallets.evm.address} (${wallets.evm.id})`);
  return server;
}

export default startServer;
