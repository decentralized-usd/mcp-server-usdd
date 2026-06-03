import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chainsMock = vi.hoisted(() => ({
  getNetworkConfig: vi.fn(),
  getIlkConfig: vi.fn(),
  getSupportedIlks: vi.fn(() => []),
  getSupportedPsmMarkets: vi.fn(() => []),
}));

const contractsMock = vi.hoisted(() => ({
  readContract: vi.fn(),
}));

vi.mock("../../../src/core/chains.js", () => chainsMock);
vi.mock("../../../src/core/services/contracts.js", () => contractsMock);
vi.mock("../../../src/core/services/wallet.js", () => ({
  getConfiguredWallet: vi.fn(() => ({ address: "0xwallet" })),
}));

import { resetChainlogCacheForTests } from "../../../src/core/services/chainlog.js";
import { getProtocolAddresses } from "../../../src/core/services/protocol.js";

function bytes32ToString(value: string) {
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  return Buffer.from(hex.replace(/(00)+$/, ""), "hex").toString("utf8");
}

describe("getProtocolAddresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetChainlogCacheForTests();
    chainsMock.getNetworkConfig.mockReturnValue({
      kind: "tron",
      label: "TRON Mainnet",
      chainId: 728126428,
      chainlogAddress: "TChainlog",
      proxyRegistry: "TProxyRegistry",
      proxyActions: "TProxyActions",
      proxyActionsProxy: "TProxyActionsProxy",
      cdpManager: "TCdpManager",
      vat: "TVat",
      jug: "TJug",
      dog: "TDog",
      spot: "TSpot",
      usdd: "TXDk8mbtRbXeYuMNS83CfKPaYYT8XWv9Hz",
      usddJoin: "TUsddJoin",
      multicall: "TMulticall",
      savings: undefined,
    });
    chainsMock.getSupportedIlks.mockReturnValue([{ key: "TRX-A" }]);
    chainsMock.getSupportedPsmMarkets.mockReturnValue([{ key: "PSM-USDT" }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves protocol addresses from Chainlog", async () => {
    const chainlogValues: Record<string, string> = {
      PROXY_REGISTRY: "TProxyRegistryFromChainlog",
      PROXY_ACTIONS: "TProxyActionsFromChainlog",
      GOV_ACTIONS_PROXY: "TProxyActionsProxyFromChainlog",
      CDP_MANAGER: "TCdpManagerFromChainlog",
      MCD_VAT: "TVatFromChainlog",
      MCD_JUG: "TJugFromChainlog",
      MCD_DOG: "TDogFromChainlog",
      MCD_SPOT: "TSpotFromChainlog",
      MCD_USDD: "TUsddFromChainlog",
      MCD_JOIN_USDD: "TUsddJoinFromChainlog",
      MULTICALL: "TMulticallFromChainlog",
      MCD_JOIN_TRX_A: "TJoinFromChainlog",
      WTRX: "TGemFromChainlog",
      MCD_JOIN_PSM_USDT_A: "TGemJoinFromChainlog",
      MCD_PSM_USDT_A: "TPsmFromChainlog",
      USDT: "TUsdtFromChainlog",
    };
    contractsMock.readContract.mockImplementation(async ({ functionName, args }: any) => {
      if (functionName === "version") return "1.0.0";
      const key = bytes32ToString(args[0]);
      const value = chainlogValues[key];
      if (!value) throw new Error("dss-chain-log/invalid-key");
      return value;
    });

    const result = await getProtocolAddresses("tron");

    expect(result.addressSource.type).toBe("chainlog");
    expect(result.addresses.usdd).toBe("TUsddFromChainlog");
    expect(result.addresses.proxyRegistry).toBe("TProxyRegistryFromChainlog");
    expect(result.ilks[0]).toMatchObject({
      key: "TRX-A",
      join: "TJoinFromChainlog",
      gem: "TGemFromChainlog",
      chainlogKeys: {
        join: "MCD_JOIN_TRX_A",
        gem: "WTRX",
      },
    });
    expect(result.psmMarkets[0]).toMatchObject({
      key: "PSM-USDT",
      psm: "TPsmFromChainlog",
      gemJoin: "TGemJoinFromChainlog",
      gem: "TUsdtFromChainlog",
    });
    expect(contractsMock.readContract).toHaveBeenCalled();
  });

  it("uses a fresh Chainlog cache without a second RPC read", async () => {
    contractsMock.readContract.mockImplementation(async ({ functionName, args }: any) => {
      if (functionName === "version") return "1.0.0";
      const key = bytes32ToString(args[0]);
      if (key === "MCD_USDD") return "TUsddFromChainlog";
      throw new Error("dss-chain-log/invalid-key");
    });

    await getProtocolAddresses("tron");
    contractsMock.readContract.mockClear();

    const cached = await getProtocolAddresses("tron");

    expect(cached.addressSource.type).toBe("chainlog_cache");
    expect(cached.addresses.usdd).toBe("TUsddFromChainlog");
    expect(contractsMock.readContract).not.toHaveBeenCalled();
  });

  it("falls back to cached Chainlog data when live refresh fails", async () => {
    contractsMock.readContract.mockImplementation(async ({ functionName, args }: any) => {
      if (functionName === "version") return "1.0.0";
      const key = bytes32ToString(args[0]);
      if (key === "MCD_USDD") return "TUsddFromChainlog";
      throw new Error("dss-chain-log/invalid-key");
    });
    await getProtocolAddresses("tron");

    contractsMock.readContract.mockRejectedValue(new Error("TronGrid 429"));
    const stale = await getProtocolAddresses("tron", { refresh: true });

    expect(stale.addressSource.type).toBe("chainlog_cache_stale");
    expect(stale.addressSource.warning).toContain("TronGrid 429");
    expect(stale.addresses.usdd).toBe("TUsddFromChainlog");
  });
});
