import { describe, expect, it, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const servicesMock = vi.hoisted(() => {
  const formatJson = (obj: unknown) => JSON.stringify(
    obj,
    (_, value) => typeof value === "bigint" ? value.toString() : value,
    2,
  );

  return {
    utils: { formatJson },
    getWalletAddress: vi.fn(),
    listWallets: vi.fn(),
    getWalletStorePath: vi.fn(),
    importWallet: vi.fn(),
    setActiveWallet: vi.fn(),
    getProtocolOverview: vi.fn(),
    getOracleStatus: vi.fn(),
    getPsmStatus: vi.fn(),
    getUserVaultIds: vi.fn(),
    getProxyAddress: vi.fn(),
    getVaultSummary: vi.fn(),
    analyzeVaultRisk: vi.fn(),
    getSavingsStatus: vi.fn(),
    openVault: vi.fn(),
    getTokenBalance: vi.fn(),
    checkAllowance: vi.fn(),
    approveToken: vi.fn(),
    depositAndMint: vi.fn(),
    drawUsdd: vi.fn(),
    repayUsdd: vi.fn(),
    withdrawCollateral: vi.fn(),
    closeVault: vi.fn(),
    sellGemForUsdd: vi.fn(),
    buyGemWithUsdd: vi.fn(),
    depositSavings: vi.fn(),
    withdrawSavings: vi.fn(),
  };
});

vi.mock("../../src/core/services/index.js", () => servicesMock);

import { registerUsddTools } from "../../src/core/tools.js";

function createServer() {
  const server = new McpServer({ name: "test-server", version: "1.0.0" }) as McpServer & {
    _registeredTools: Record<string, { inputSchema?: unknown; handler: unknown }>;
  };
  registerUsddTools(server);
  return server;
}

async function runTool(server: ReturnType<typeof createServer>, name: string, args: Record<string, unknown> = {}) {
  const tool = server._registeredTools[name];
  await server.validateToolInput(tool as never, args);
  const result = await server.executeToolHandler(tool as never, args, {});
  const text = result.content[0]?.type === "text" ? result.content[0].text : "";
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { raw: result, json, text };
}

describe("registerUsddTools", () => {
  beforeEach(() => {
    Object.values(servicesMock).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) {
        value.mockReset();
      }
    });
  });

  it("registers the expected core tools", () => {
    const server = createServer();
    expect(Object.keys(server._registeredTools)).toEqual([
      "get_supported_networks",
      "get_wallet_address",
      "list_wallets",
      "import_wallet",
      "set_active_wallet",
      "get_protocol_overview",
      "get_supported_ilks",
      "get_oracle_status",
      "get_psm_status",
      "get_user_vaults",
      "get_vault_summary",
      "analyze_vault_risk",
      "get_savings_status",
      "open_vault",
      "get_token_balance",
      "check_allowance",
      "approve_token",
      "deposit_and_mint",
      "mint_usdd",
      "repay_usdd",
      "withdraw_collateral",
      "close_vault",
      "psm_swap_to_usdd",
      "psm_swap_from_usdd",
      "deposit_savings",
      "withdraw_savings",
    ]);
  });

  it("returns supported networks", async () => {
    const server = createServer();
    const result = await runTool(server, "get_supported_networks");
    expect(result.json).toEqual({
      networks: ["tron", "eth", "bsc"],
      default: "tron",
    });
  });

  it("uses tron as the default network for wallet and protocol reads", async () => {
    servicesMock.getWalletAddress.mockReturnValue("TWallet");
    servicesMock.getProtocolOverview.mockResolvedValue({ network: "tron" });
    const server = createServer();

    const wallet = await runTool(server, "get_wallet_address");
    const overview = await runTool(server, "get_protocol_overview");

    expect(servicesMock.getWalletAddress).toHaveBeenCalledWith("tron");
    expect(servicesMock.getProtocolOverview).toHaveBeenCalledWith("tron");
    expect(wallet.json.address).toBe("TWallet");
    expect(overview.json.network).toBe("tron");
  });

  it("lists wallets with the wallet store path", async () => {
    servicesMock.getWalletStorePath.mockReturnValue("/tmp/.agent-wallet");
    servicesMock.listWallets.mockReturnValue([{ id: "tron_1", type: "tron", address: "T1", isActive: true }]);
    const server = createServer();
    const result = await runTool(server, "list_wallets");
    expect(result.json.walletStore).toBe("/tmp/.agent-wallet");
    expect(result.json.wallets).toHaveLength(1);
  });

  it("delegates wallet import and activation", async () => {
    servicesMock.importWallet.mockReturnValue({ id: "evm_1", imported: true });
    servicesMock.setActiveWallet.mockReturnValue({ id: "evm_1", isActive: true });
    const server = createServer();

    const imported = await runTool(server, "import_wallet", {
      walletType: "evm",
      secretType: "private_key",
      secret: "0xabc",
    });
    const activated = await runTool(server, "set_active_wallet", { walletId: "evm_1" });

    expect(servicesMock.importWallet).toHaveBeenCalledWith({
      walletType: "evm",
      secretType: "private_key",
      secret: "0xabc",
      index: undefined,
    });
    expect(servicesMock.setActiveWallet).toHaveBeenCalledWith("evm_1");
    expect(imported.json.id).toBe("evm_1");
    expect(activated.json.isActive).toBe(true);
  });

  it("validates required tool inputs", async () => {
    const server = createServer();
    await expect(
      server.validateToolInput(server._registeredTools["get_oracle_status"] as never, { network: "tron" }),
    ).rejects.toThrow();
    await expect(
      server.validateToolInput(server._registeredTools["get_psm_status"] as never, { network: "eth" }),
    ).rejects.toThrow();
  });

  it("queries oracle, psm, savings, vault summary, and risk analysis", async () => {
    servicesMock.getOracleStatus.mockResolvedValue({ ilk: "TRX-A" });
    servicesMock.getPsmStatus.mockResolvedValue({ market: "PSM-USDT" });
    servicesMock.getSavingsStatus.mockResolvedValue({ supported: true });
    servicesMock.getVaultSummary.mockResolvedValue({ cdpId: "123" });
    servicesMock.analyzeVaultRisk.mockResolvedValue({ warning: "ok" });
    const server = createServer();

    const oracle = await runTool(server, "get_oracle_status", { ilk: "TRX-A", network: "tron" });
    const psm = await runTool(server, "get_psm_status", { market: "PSM-USDT", network: "eth" });
    const savings = await runTool(server, "get_savings_status", { network: "bsc" });
    const summary = await runTool(server, "get_vault_summary", { cdpId: "123", network: "tron" });
    const risk = await runTool(server, "analyze_vault_risk", { cdpId: "123", network: "tron" });

    expect(servicesMock.getOracleStatus).toHaveBeenCalledWith("tron", "TRX-A");
    expect(servicesMock.getPsmStatus).toHaveBeenCalledWith("eth", "PSM-USDT");
    expect(servicesMock.getSavingsStatus).toHaveBeenCalledWith("bsc");
    expect(servicesMock.getVaultSummary).toHaveBeenCalledWith("tron", 123n);
    expect(servicesMock.analyzeVaultRisk).toHaveBeenCalledWith("tron", 123n);
    expect(oracle.json.ilk).toBe("TRX-A");
    expect(psm.json.market).toBe("PSM-USDT");
    expect(savings.json.supported).toBe(true);
    expect(summary.json.cdpId).toBe("123");
    expect(risk.json.warning).toBe("ok");
  });

  it("lists user vaults and falls back to the proxy address when owner is omitted", async () => {
    servicesMock.getUserVaultIds.mockResolvedValue([1n, 2n, 3n]);
    servicesMock.getProxyAddress.mockResolvedValue("TProxy");
    const server = createServer();
    const result = await runTool(server, "get_user_vaults", { network: "tron" });

    expect(servicesMock.getUserVaultIds).toHaveBeenCalledWith("tron", undefined);
    expect(servicesMock.getProxyAddress).toHaveBeenCalledWith("tron", false);
    expect(result.json).toEqual({
      network: "tron",
      address: "TProxy",
      vaultIds: ["1", "2", "3"],
    });
  });

  it("passes through token balance, allowance, and approval arguments", async () => {
    servicesMock.getTokenBalance.mockResolvedValue({ symbol: "USDD" });
    servicesMock.checkAllowance.mockResolvedValue({ sufficient: true });
    servicesMock.approveToken.mockResolvedValue({ txID: "0xapprove" });
    const server = createServer();

    await runTool(server, "get_token_balance", { token: "0xToken", owner: "0xOwner", decimals: 6, network: "eth" });
    await runTool(server, "check_allowance", {
      token: "0xToken",
      spender: "0xSpender",
      owner: "0xOwner",
      amount: "10",
      decimals: 6,
      network: "eth",
    });
    const approved = await runTool(server, "approve_token", {
      token: "0xToken",
      spender: "0xSpender",
      amount: "max",
      decimals: 6,
      network: "eth",
    });

    expect(servicesMock.getTokenBalance).toHaveBeenCalledWith({
      network: "eth",
      token: "0xToken",
      owner: "0xOwner",
      decimals: 6,
    });
    expect(servicesMock.checkAllowance).toHaveBeenCalledWith({
      network: "eth",
      token: "0xToken",
      spender: "0xSpender",
      owner: "0xOwner",
      amount: "10",
      decimals: 6,
    });
    expect(servicesMock.approveToken).toHaveBeenCalledWith({
      network: "eth",
      token: "0xToken",
      spender: "0xSpender",
      amount: "max",
      decimals: 6,
    });
    expect(approved.json.txID).toBe("0xapprove");
  });

  it("passes bigint cdp ids and payloads into vault write tools", async () => {
    servicesMock.openVault.mockResolvedValue({ cdpId: "42" });
    servicesMock.depositAndMint.mockResolvedValue({ txID: "0xdeposit" });
    servicesMock.drawUsdd.mockResolvedValue({ txID: "0xdraw" });
    servicesMock.repayUsdd.mockResolvedValue({ txID: "0xrepay" });
    servicesMock.withdrawCollateral.mockResolvedValue({ txID: "0xwithdraw" });
    servicesMock.closeVault.mockResolvedValue({ txID: "0xclose" });
    const server = createServer();

    await runTool(server, "open_vault", { ilk: "TRX-A", network: "tron" });
    await runTool(server, "deposit_and_mint", {
      ilk: "TRX-A",
      collateralAmount: "1000",
      drawAmount: "100",
      cdpId: "42",
      transferFrom: true,
      network: "tron",
    });
    await runTool(server, "mint_usdd", { cdpId: "42", amount: "10", network: "tron" });
    await runTool(server, "repay_usdd", { cdpId: "42", amount: "5", network: "tron" });
    await runTool(server, "withdraw_collateral", { cdpId: "42", ilk: "TRX-A", amount: "1", network: "tron" });
    const closed = await runTool(server, "close_vault", { cdpId: "42", ilk: "TRX-A", amountToFree: "999", network: "tron" });

    expect(servicesMock.openVault).toHaveBeenCalledWith("tron", "TRX-A");
    expect(servicesMock.depositAndMint).toHaveBeenCalledWith({
      network: "tron",
      ilk: "TRX-A",
      collateralAmount: "1000",
      drawAmount: "100",
      cdpId: 42n,
      transferFrom: true,
    });
    expect(servicesMock.drawUsdd).toHaveBeenCalledWith("tron", 42n, "10");
    expect(servicesMock.repayUsdd).toHaveBeenCalledWith("tron", 42n, "5");
    expect(servicesMock.withdrawCollateral).toHaveBeenCalledWith("tron", 42n, "TRX-A", "1");
    expect(servicesMock.closeVault).toHaveBeenCalledWith("tron", 42n, "TRX-A", "999");
    expect(closed.json.txID).toBe("0xclose");
  });

  it("routes psm and savings writes to the expected services", async () => {
    servicesMock.sellGemForUsdd.mockResolvedValue({ txID: "0xsell" });
    servicesMock.buyGemWithUsdd.mockResolvedValue({ txID: "0xbuy" });
    servicesMock.depositSavings.mockResolvedValue({ txID: "0xdeposit" });
    servicesMock.withdrawSavings.mockResolvedValue({ txID: "0xwithdraw" });
    const server = createServer();

    const sold = await runTool(server, "psm_swap_to_usdd", { market: "PSM-USDT", amount: "100", network: "eth" });
    const bought = await runTool(server, "psm_swap_from_usdd", { market: "PSM-USDT", amount: "50", network: "eth" });
    const deposited = await runTool(server, "deposit_savings", { amount: "10", network: "bsc" });
    const withdrawn = await runTool(server, "withdraw_savings", { amount: "5", network: "bsc" });

    expect(servicesMock.sellGemForUsdd).toHaveBeenCalledWith("eth", "PSM-USDT", "100");
    expect(servicesMock.buyGemWithUsdd).toHaveBeenCalledWith("eth", "PSM-USDT", "50");
    expect(servicesMock.depositSavings).toHaveBeenCalledWith("bsc", "10");
    expect(servicesMock.withdrawSavings).toHaveBeenCalledWith("bsc", "5");
    expect(sold.json.txID).toBe("0xsell");
    expect(bought.json.txID).toBe("0xbuy");
    expect(deposited.json.txID).toBe("0xdeposit");
    expect(withdrawn.json.txID).toBe("0xwithdraw");
  });

  it("wraps service exceptions as tool errors", async () => {
    servicesMock.getPsmStatus.mockRejectedValue(new Error("boom"));
    const server = createServer();
    const result = await runTool(server, "get_psm_status", { market: "PSM-USDT", network: "eth" });
    expect(result.raw.isError).toBe(true);
    expect(result.text).toContain("Error: boom");
  });
});
