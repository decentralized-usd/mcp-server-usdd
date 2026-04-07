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

import { getVaultPrice } from "../../../src/core/services/protocol.js";

describe("getVaultPrice", () => {
  beforeEach(() => {
    chainsMock.getNetworkConfig.mockReturnValue({
      key: "tron",
      serviceApiUrl: "https://app-api.usdd.io",
      spot: "TSpot",
    });
    chainsMock.getIlkConfig.mockReturnValue({
      key: "TRX-A",
      kind: "native",
      priceFeedKey: "trx",
    });
    contractsMock.readContract.mockResolvedValue(["TPipAddress"]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the price from the configured HTTP service and keeps the protocol pip address", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          trx: 0.31465,
          usdt: 1.0008,
        },
        message: "SUCCESS",
      }),
    }));

    const result = await getVaultPrice("tron", "TRX-A");

    expect(contractsMock.readContract).toHaveBeenCalledWith({
      network: "tron",
      address: "TSpot",
      abi: expect.any(Array),
      functionName: "ilks",
      args: [expect.any(String)],
    });
    expect(result).toEqual({
      network: "tron",
      ilk: "TRX-A",
      kind: "native",
      oracle: {
        address: "TPipAddress",
        sourceType: "http-highestprice",
        endpoint: "https://app-api.usdd.io/liquid/highestprice",
        assetKey: "trx",
        decimals: 18,
        current: {
          valueRaw: "314650000000000000",
          value: "0.31465",
          valid: true,
        },
        next: null,
        pass: null,
        hopSeconds: null,
      },
    });
  });

  it("falls back to inferred asset keys when an ilk does not define one explicitly", async () => {
    chainsMock.getIlkConfig.mockReturnValue({
      key: "USDT-A",
      kind: "erc20",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          usdt: 1.0008,
        },
      }),
    }));

    const result = await getVaultPrice("tron", "USDT-A");
    expect(result.oracle.assetKey).toBe("usdt");
    expect(result.oracle.current.value).toBe("1.0008");
  });

  it("throws a clear error when the price API does not include the requested asset key", async () => {
    chainsMock.getIlkConfig.mockReturnValue({
      key: "WBTC-A",
      kind: "erc20",
      priceFeedKey: "wbtc",
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          trx: 0.31465,
        },
      }),
    }));

    await expect(getVaultPrice("tron", "WBTC-A")).rejects.toThrow(
      "Price API does not provide an entry for asset key 'wbtc'.",
    );
  });
});
