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

import { getProtocolAddresses } from "../../../src/core/services/protocol.js";

describe("getProtocolAddresses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chainsMock.getNetworkConfig.mockReturnValue({
      kind: "tron",
      label: "TRON Mainnet",
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

  it("returns configured deployment addresses without making RPC reads", () => {
    const result = getProtocolAddresses("tron");

    expect(result.addresses.usdd).toBe("TXDk8mbtRbXeYuMNS83CfKPaYYT8XWv9Hz");
    expect(result.ilks).toEqual([{ key: "TRX-A" }]);
    expect(result.psmMarkets).toEqual([{ key: "PSM-USDT" }]);
    expect(contractsMock.readContract).not.toHaveBeenCalled();
  });
});
