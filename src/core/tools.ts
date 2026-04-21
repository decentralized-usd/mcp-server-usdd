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

const networkField = z.enum(["tron", "eth", "bsc", "tron_nile", "eth_sepolia", "bsc_testnet"]).optional().describe("Target network. Default: tron");
const walletTypeField = z.enum(["tron", "evm"]).describe("Wallet family: tron or evm");
const secretTypeField = z.enum(["private_key", "mnemonic"]).describe("Secret type to import");
const walletModeField = z.enum(["browser", "agent"]).describe("Wallet signing mode");

export function registerUsddTools(server: McpServer) {
  const resolveNetwork = (network?: NetworkKey): NetworkKey => network || services.getGlobalNetwork();

  server.registerTool("get_supported_networks", {
    description: "List supported USDD networks.",
    inputSchema: {},
  }, async () => asText({ networks: getSupportedNetworks(), default: services.getGlobalNetwork() }));

  server.registerTool("connect_browser_wallet", {
    description: "Connect a browser wallet (TronLink-compatible) and switch to browser mode.",
    inputSchema: {
      network: networkField,
      address: z.string().optional().describe("Optional browser wallet address override"),
    },
  }, async ({ network, address }) => {
    try {
      return asText(services.connectBrowserWallet({
        network: resolveNetwork(network as NetworkKey),
        address,
      }));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("set_wallet_mode", {
    description: "Switch signing mode between browser and agent.",
    inputSchema: {
      mode: walletModeField,
      network: networkField,
    },
  }, async ({ mode, network }) => {
    try {
      return asText(services.setWalletMode(mode, resolveNetwork(network as NetworkKey)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_wallet_mode", {
    description: "Get current signing mode and active address.",
    inputSchema: {
      network: networkField,
    },
  }, async ({ network }) => {
    try {
      return asText(services.getWalletMode(resolveNetwork(network as NetworkKey)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("set_network", {
    description: "Set global default network. Supports chain-specific aliases (tron_mainnet, tron_nile, eth_mainnet, eth_sepolia, bsc_mainnet, bsc_testnet) or explicit network keys.",
    inputSchema: {
      network: z.string().min(1).describe("Network alias or key, e.g. tron_mainnet, tron_nile, eth_mainnet, bsc_testnet, tron, eth_sepolia"),
    },
  }, async ({ network }) => {
    try {
      services.setGlobalNetwork(network);
      const active = services.getGlobalNetwork();
      return asText(services.getNetworkProfile(active));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_network", {
    description: "Get global default network.",
    inputSchema: {},
  }, async () => {
    const active = services.getGlobalNetwork();
    return asText(services.getNetworkProfile(active));
  });

  server.registerTool("get_wallet_address", {
    description: "Get the active wallet address for a specific network. Automatically generates an encrypted wallet on first use.",
    inputSchema: { network: networkField },
  }, async ({ network }) => {
    try {
      const resolved = resolveNetwork(network as NetworkKey);
      return asText({ network: resolved, address: services.getWalletAddress(resolved) });
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
  }, async ({ network }) => {
    try {
      return asText(await services.getProtocolOverview(resolveNetwork(network as NetworkKey)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_supported_ilks", {
    description: "List configured collateral types and PSM joins for a network.",
    inputSchema: { network: networkField },
  }, async ({ network }) => asText({
    network: resolveNetwork(network as NetworkKey),
    ilks: getSupportedIlks(resolveNetwork(network as NetworkKey)),
    psmMarkets: getSupportedPsmMarkets(resolveNetwork(network as NetworkKey)),
  }));

  server.registerTool("get_oracle_status", {
    description: "Inspect liquidation ratio, penalty, and oracle status for a collateral type.",
    inputSchema: { ilk: z.string().describe("Collateral type like TRX-A, WBTC-A, USDT-A, PSM-USDT"), network: networkField },
  }, async ({ ilk, network }) => {
    try {
      return asText(await services.getOracleStatus(resolveNetwork(network as NetworkKey), ilk));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_psm_status", {
    description: "Inspect PSM fees and enablement state.",
    inputSchema: { market: z.string().describe("PSM market like PSM-USDT"), network: networkField },
  }, async ({ market, network }) => {
    try {
      return asText(await services.getPsmStatus(resolveNetwork(network as NetworkKey), market));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_user_vaults", {
    description: "List all vault IDs for the configured wallet or a given address.",
    inputSchema: { address: z.string().optional().describe("Optional wallet address"), network: networkField },
  }, async ({ address, network }) => {
    try {
      const resolved = resolveNetwork(network as NetworkKey);
      const ids = await services.getUserVaultIds(resolved, address);
      const queriedOwner = address || await services.getProxyAddress(resolved, false);
      return asText({ network: resolved, address: queriedOwner, vaultIds: ids.map((id) => id.toString()) });
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_vault_summary", {
    description: "Get collateral, debt, and liquidation metrics for one vault.",
    inputSchema: { cdpId: z.string().describe("Vault/CDP id"), network: networkField },
  }, async ({ cdpId, network }) => {
    try {
      return asText(await services.getVaultSummary(resolveNetwork(network as NetworkKey), BigInt(cdpId)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("analyze_vault_risk", {
    description: "Get risk analysis for one vault with warnings.",
    inputSchema: { cdpId: z.string().describe("Vault/CDP id"), network: networkField },
  }, async ({ cdpId, network }) => {
    try {
      return asText(await services.analyzeVaultRisk(resolveNetwork(network as NetworkKey), BigInt(cdpId)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("get_savings_status", {
    description: "Inspect USDD Savings metrics where supported.",
    inputSchema: { network: networkField },
  }, async ({ network }) => {
    try {
      return asText(await services.getSavingsStatus(resolveNetwork(network as NetworkKey)));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("open_vault", {
    description: "Open a vault/CDP via DSProxy. Idempotent: if a vault for the given ilk already exists, returns the existing CDP id without submitting a transaction.",
    inputSchema: { ilk: z.string().describe("Collateral type like TRX-A, WBTC-A, or SA001-A"), network: networkField },
  }, async ({ ilk, network }) => {
    try {
      return asText(await services.openVault(resolveNetwork(network as NetworkKey), ilk));
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
  }, async ({ token, owner, decimals, network }) => {
    try {
      return asText(await services.getTokenBalance({
        network: resolveNetwork(network as NetworkKey),
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
  }, async ({ token, spender, owner, amount, decimals, network }) => {
    try {
      return asText(await services.checkAllowance({
        network: resolveNetwork(network as NetworkKey),
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
  }, async ({ token, spender, amount, decimals, network }) => {
    try {
      return asText(await services.approveToken({
        network: resolveNetwork(network as NetworkKey),
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
    description: "Deposit collateral and mint USDD. If cdpId is omitted, reuses an existing vault for the ilk if one exists; otherwise opens a new vault and funds it in one transaction.",
    inputSchema: {
      ilk: z.string(),
      collateralAmount: z.string(),
      drawAmount: z.string(),
      cdpId: z.string().optional(),
      transferFrom: z.boolean().optional().describe("For ERC20 collaterals, whether proxy action should pull from wallet. Default: true"),
      network: networkField,
    },
  }, async ({ ilk, collateralAmount, drawAmount, cdpId, transferFrom, network }) => {
    try {
      return asText(await services.depositAndMint({
        network: resolveNetwork(network as NetworkKey),
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
  }, async ({ cdpId, amount, network }) => {
    try {
      return asText(await services.drawUsdd(resolveNetwork(network as NetworkKey), BigInt(cdpId), amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("repay_usdd", {
    description: "Repay USDD debt for an existing vault.",
    inputSchema: { cdpId: z.string(), amount: z.string(), network: networkField },
  }, async ({ cdpId, amount, network }) => {
    try {
      return asText(await services.repayUsdd(resolveNetwork(network as NetworkKey), BigInt(cdpId), amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("withdraw_collateral", {
    description: "Withdraw collateral from an existing vault.",
    inputSchema: { cdpId: z.string(), ilk: z.string(), amount: z.string(), network: networkField },
  }, async ({ cdpId, ilk, amount, network }) => {
    try {
      return asText(await services.withdrawCollateral(resolveNetwork(network as NetworkKey), BigInt(cdpId), ilk, amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("close_vault", {
    description: "Repay all debt and free collateral using wipeAllAndFree* proxy actions.",
    inputSchema: { cdpId: z.string(), ilk: z.string(), amountToFree: z.string(), network: networkField },
  }, async ({ cdpId, ilk, amountToFree, network }) => {
    try {
      return asText(await services.closeVault(resolveNetwork(network as NetworkKey), BigInt(cdpId), ilk, amountToFree));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("psm_swap_to_usdd", {
    description: "Swap gem collateral into USDD through the PSM.",
    inputSchema: { market: z.string(), amount: z.string(), network: networkField },
  }, async ({ market, amount, network }) => {
    try {
      return asText(await services.sellGemForUsdd(resolveNetwork(network as NetworkKey), market, amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("psm_swap_from_usdd", {
    description: "Swap USDD into the PSM gem asset.",
    inputSchema: { market: z.string(), amount: z.string(), network: networkField },
  }, async ({ market, amount, network }) => {
    try {
      return asText(await services.buyGemWithUsdd(resolveNetwork(network as NetworkKey), market, amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("deposit_savings", {
    description: "Deposit USDD into sUSDD where supported.",
    inputSchema: { amount: z.string(), network: networkField },
  }, async ({ amount, network }) => {
    try {
      return asText(await services.depositSavings(resolveNetwork(network as NetworkKey), amount));
    } catch (error) {
      return asError(error);
    }
  });

  server.registerTool("withdraw_savings", {
    description: "Withdraw USDD from sUSDD where supported.",
    inputSchema: { amount: z.string(), network: networkField },
  }, async ({ amount, network }) => {
    try {
      return asText(await services.withdrawSavings(resolveNetwork(network as NetworkKey), amount));
    } catch (error) {
      return asError(error);
    }
  });

}
