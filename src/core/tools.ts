import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSupportedNetworks, getSupportedIlks, getSupportedPsmMarkets, type NetworkKey } from "./chains.js";
import * as services from "./services/index.js";

function asText(data: unknown) {
  return { content: [{ type: "text" as const, text: services.utils.formatJson(data) }] };
}

function asError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true as const };
}

const networkField = z.enum(["tron", "eth", "bsc"]).optional().describe("Target network. Default: tron");
const walletTypeField = z.enum(["tron", "evm"]).describe("Wallet family: tron or evm");
const secretTypeField = z.enum(["private_key", "mnemonic"]).describe("Secret type to import");

export function registerUsddTools(server: McpServer) {
  server.registerTool("get_supported_networks", {
    description: "List supported USDD networks.",
    inputSchema: {},
  }, async () => asText({ networks: getSupportedNetworks(), default: "tron" }));

  server.registerTool("get_wallet_address", {
    description: "Get the active wallet address for a specific network. Automatically generates an encrypted wallet on first use.",
    inputSchema: { network: networkField },
  }, async ({ network = "tron" }) => {
    try {
      return asText({ network, address: services.getWalletAddress(network as NetworkKey) });
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("list_wallets", {
    description: "List encrypted wallets stored in ~/.agent-wallet and show which ones are active.",
    inputSchema: {},
  }, async () => {
    try {
      return asText({
        walletStore: services.getWalletStorePath(),
        wallets: await services.listWallets(),
      });
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("import_wallet", {
    description: "Import a private key or mnemonic into the encrypted local wallet store.",
    inputSchema: {
      walletType: walletTypeField,
      secretType: secretTypeField,
      secret: z.string().min(1).describe("Private key or mnemonic phrase"),
      index: z.number().int().nonnegative().optional().describe("Mnemonic derivation index. Default: 0"),
    },
  }, async ({ walletType, secretType, secret, index }) => {
    try {
      return asText(await services.importWallet({
        walletType,
        secretType,
        secret,
        index,
      }));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("set_active_wallet", {
    description: "Set the active encrypted wallet by ID. Active wallet selection is tracked separately for tron and evm.",
    inputSchema: {
      walletId: z.string().min(1).describe("Wallet id from list_wallets"),
    },
  }, async ({ walletId }) => {
    try {
      return asText(await services.setActiveWallet(walletId));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_protocol_overview", {
    description: "Get protocol addresses, ceilings, configured ilks, and PSM markets for USDD.",
    inputSchema: { network: networkField },
  }, async ({ network = "tron" }) => {
    try {
      return asText(await services.getProtocolOverview(network as NetworkKey));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_supported_ilks", {
    description: "List configured collateral types and PSM joins for a network.",
    inputSchema: { network: networkField },
  }, async ({ network = "tron" }) => asText({
    network,
    ilks: getSupportedIlks(network),
    psmMarkets: getSupportedPsmMarkets(network),
  }));

  server.registerTool("get_oracle_status", {
    description: "Inspect liquidation ratio, penalty, and oracle status for a collateral type.",
    inputSchema: { ilk: z.string().describe("Collateral type like TRX-A, USDT-A, PSM-USDT"), network: networkField },
  }, async ({ ilk, network = "tron" }) => {
    try {
      return asText(await services.getOracleStatus(network as NetworkKey, ilk));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_vault_price", {
    description: "Read the current on-chain oracle price for a supported vault collateral type and return both raw and formatted values.",
    inputSchema: { ilk: z.string().describe("Collateral type like TRX-A, USDT-A, SA001-A"), network: networkField },
  }, async ({ ilk, network = "tron" }) => {
    try {
      return asText(await services.getVaultPrice(network as NetworkKey, ilk));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_psm_status", {
    description: "Inspect PSM fees and enablement state.",
    inputSchema: { market: z.string().describe("PSM market like PSM-USDT"), network: networkField },
  }, async ({ market, network = "tron" }) => {
    try {
      return asText(await services.getPsmStatus(network as NetworkKey, market));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_user_vaults", {
    description: "List all vault IDs for the configured wallet or a given address.",
    inputSchema: { address: z.string().optional().describe("Optional wallet address"), network: networkField },
  }, async ({ address, network = "tron" }) => {
    try {
      const ids = await services.getUserVaultIds(network as NetworkKey, address);
      const queriedOwner = address || await services.getProxyAddress(network as NetworkKey, false);
      return asText({ network, address: queriedOwner, vaultIds: ids.map((id) => id.toString()) });
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_vault_summary", {
    description: "Get collateral, debt, and liquidation metrics for one vault.",
    inputSchema: { cdpId: z.string().describe("Vault/CDP id"), network: networkField },
  }, async ({ cdpId, network = "tron" }) => {
    try {
      return asText(await services.getVaultSummary(network as NetworkKey, BigInt(cdpId)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("analyze_vault_risk", {
    description: "Get risk analysis for one vault with warnings.",
    inputSchema: { cdpId: z.string().describe("Vault/CDP id"), network: networkField },
  }, async ({ cdpId, network = "tron" }) => {
    try {
      return asText(await services.analyzeVaultRisk(network as NetworkKey, BigInt(cdpId)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_savings_status", {
    description: "Inspect DSR/sUSDD metrics where supported.",
    inputSchema: { network: networkField },
  }, async ({ network = "tron" }) => {
    try {
      return asText(await services.getSavingsStatus(network as NetworkKey));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("open_vault", {
    description: "Open a new vault/CDP via DSProxy.",
    inputSchema: { ilk: z.string().describe("Collateral type like TRX-A or SA001-A"), network: networkField },
  }, async ({ ilk, network = "tron" }) => {
    try {
      return asText(await services.openVault(network as NetworkKey, ilk));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_token_balance", {
    description: "Get ERC20/TRC20 token balance for the configured wallet or a specified owner.",
    inputSchema: {
      token: z.string().describe("Token contract address"),
      owner: z.string().optional().describe("Optional owner address; defaults to configured wallet"),
      decimals: z.number().int().positive().optional().describe("Optional token decimals override"),
      network: networkField,
    },
  }, async ({ token, owner, decimals, network = "tron" }) => {
    try {
      return asText(await services.getTokenBalance({
        network: network as NetworkKey,
        token,
        owner,
        decimals,
      }));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("check_allowance", {
    description: "Check ERC20/TRC20 allowance for a spender, optionally against a required amount.",
    inputSchema: {
      token: z.string().describe("Token contract address"),
      spender: z.string().describe("Spender contract or proxy address"),
      owner: z.string().optional().describe("Optional owner address; defaults to configured wallet"),
      amount: z.string().optional().describe("Optional human-readable amount to compare against"),
      decimals: z.number().int().positive().optional().describe("Optional token decimals override"),
      network: networkField,
    },
  }, async ({ token, spender, owner, amount, decimals, network = "tron" }) => {
    try {
      return asText(await services.checkAllowance({
        network: network as NetworkKey,
        token,
        spender,
        owner,
        amount,
        decimals,
      }));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("approve_token", {
    description: "Approve an ERC20/TRC20 token spender. Use before ERC20 collateral or PSM writes when needed.",
    inputSchema: {
      token: z.string().describe("Token contract address"),
      spender: z.string().describe("Spender contract or proxy address"),
      amount: z.string().describe("Human-readable amount or 'max'"),
      decimals: z.number().int().positive().optional().describe("Optional token decimals override"),
      network: networkField,
    },
  }, async ({ token, spender, amount, decimals, network = "tron" }) => {
    try {
      return asText(await services.approveToken({
        network: network as NetworkKey,
        token,
        spender,
        amount,
        decimals,
      }));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("deposit_and_mint", {
    description: "Deposit collateral and mint USDD. If cdpId is omitted, opens a vault and funds it in one transaction.",
    inputSchema: {
      ilk: z.string(),
      collateralAmount: z.string(),
      drawAmount: z.string(),
      cdpId: z.string().optional(),
      transferFrom: z.boolean().optional().describe("For ERC20 collaterals, whether proxy action should pull from wallet. Default: true"),
      network: networkField,
    },
  }, async ({ ilk, collateralAmount, drawAmount, cdpId, transferFrom, network = "tron" }) => {
    try {
      return asText(await services.depositAndMint({
        network: network as NetworkKey,
        ilk,
        collateralAmount,
        drawAmount,
        cdpId: cdpId ? BigInt(cdpId) : undefined,
        transferFrom,
      }));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("mint_usdd", {
    description: "Draw additional USDD debt from an existing vault.",
    inputSchema: { cdpId: z.string(), amount: z.string(), network: networkField },
  }, async ({ cdpId, amount, network = "tron" }) => {
    try {
      return asText(await services.drawUsdd(network as NetworkKey, BigInt(cdpId), amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("repay_usdd", {
    description: "Repay USDD debt for an existing vault.",
    inputSchema: { cdpId: z.string(), amount: z.string(), network: networkField },
  }, async ({ cdpId, amount, network = "tron" }) => {
    try {
      return asText(await services.repayUsdd(network as NetworkKey, BigInt(cdpId), amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("withdraw_collateral", {
    description: "Withdraw collateral from an existing vault.",
    inputSchema: { cdpId: z.string(), ilk: z.string(), amount: z.string(), network: networkField },
  }, async ({ cdpId, ilk, amount, network = "tron" }) => {
    try {
      return asText(await services.withdrawCollateral(network as NetworkKey, BigInt(cdpId), ilk, amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("close_vault", {
    description: "Repay all debt and free collateral using wipeAllAndFree* proxy actions.",
    inputSchema: { cdpId: z.string(), ilk: z.string(), amountToFree: z.string(), network: networkField },
  }, async ({ cdpId, ilk, amountToFree, network = "tron" }) => {
    try {
      return asText(await services.closeVault(network as NetworkKey, BigInt(cdpId), ilk, amountToFree));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("psm_swap_to_usdd", {
    description: "Swap gem collateral into USDD through the PSM.",
    inputSchema: { market: z.string(), amount: z.string(), network: networkField },
  }, async ({ market, amount, network = "tron" }) => {
    try {
      return asText(await services.sellGemForUsdd(network as NetworkKey, market, amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("psm_swap_from_usdd", {
    description: "Swap USDD into the PSM gem asset.",
    inputSchema: { market: z.string(), amount: z.string(), network: networkField },
  }, async ({ market, amount, network = "tron" }) => {
    try {
      return asText(await services.buyGemWithUsdd(network as NetworkKey, market, amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("deposit_savings", {
    description: "Deposit USDD into sUSDD where supported.",
    inputSchema: { amount: z.string(), network: networkField },
  }, async ({ amount, network = "tron" }) => {
    try {
      return asText(await services.depositSavings(network as NetworkKey, amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("withdraw_savings", {
    description: "Withdraw USDD from sUSDD where supported.",
    inputSchema: { amount: z.string(), network: networkField },
  }, async ({ amount, network = "tron" }) => {
    try {
      return asText(await services.withdrawSavings(network as NetworkKey, amount));
    } catch (error) {
      return asError(error);
    }
  });

}
