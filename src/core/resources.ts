import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getNetworkConfig, getSupportedNetworks } from "./chains.js";
import { utils } from "./services/utils.js";

export function registerUsddResources(server: McpServer) {
  server.registerResource(
    "usdd://protocol-info",
    "usdd://protocol-info",
    {
      description: "USDD protocol Chainlog roots across supported networks. Resolve addresses through get_protocol_addresses or get_chainlog_address.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "usdd://protocol-info",
        mimeType: "application/json",
        text: utils.formatJson({
          source: "chainlog_roots",
          note: "This resource intentionally does not expose full deployment address tables. Use Chainlog-backed tools for protocol addresses.",
          networks: Object.fromEntries(getSupportedNetworks().map((network) => {
            const config = getNetworkConfig(network);
            return [network, {
              label: config.label,
              kind: config.kind,
              chainId: config.chainId,
              chainlogAddress: config.chainlogAddress || null,
            }];
          })),
        }),
      }],
    }),
  );
}
