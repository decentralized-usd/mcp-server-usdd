import { describe, expect, it } from "vitest";
import {
  NETWORKS,
  getIlkConfig,
  getNetworkConfig,
  getPsmMarketConfig,
  getSupportedIlks,
  getSupportedNetworks,
  getSupportedPsmMarkets,
} from "../../src/core/chains.js";

describe("chains", () => {
  it("exposes the three public mainnets", () => {
    expect(getSupportedNetworks()).toEqual(["tron", "eth", "bsc"]);
  });

  it("returns the expected mainnet config", () => {
    expect(getNetworkConfig("tron").label).toBe("TRON Mainnet");
    expect(getNetworkConfig("eth").chainId).toBe(1);
    expect(getNetworkConfig("bsc").nativeSymbol).toBe("BNB");
  });

  it("throws for unsupported networks", () => {
    expect(() => getNetworkConfig("sepolia")).toThrow("Unsupported network");
    expect(() => getNetworkConfig("unknown")).toThrow("Unsupported network");
  });

  it("resolves ilks case-insensitively", () => {
    const tronIlk = getIlkConfig("trx-a", "tron");
    const ethIlk = getIlkConfig("sa001-a", "eth");
    expect(tronIlk.key).toBe("TRX-A");
    expect(tronIlk.kind).toBe("native");
    expect(ethIlk.key).toBe("SA001-A");
    expect(ethIlk.kind).toBe("synthetic");
  });

  it("resolves psm markets case-insensitively", () => {
    const ethPsm = getPsmMarketConfig("psm-usdt", "eth");
    const bscPsm = getPsmMarketConfig("PSM USDC", "bsc");
    expect(ethPsm.key).toBe("PSM-USDT");
    expect(bscPsm.key).toBe("PSM-USDC");
  });

  it("lists supported ilks and psm markets for each network", () => {
    expect(getSupportedIlks("tron").map((item) => item.key)).toContain("TRX-A");
    expect(getSupportedIlks("eth").map((item) => item.key)).toContain("SA001-A");
    expect(getSupportedPsmMarkets("bsc").map((item) => item.key)).toContain("PSM-USDT");
  });

  it("exposes WBTC-A and WBTC-B on TRON", () => {
    const tronIlks = getSupportedIlks("tron").map((item) => item.key);
    expect(tronIlks).toContain("WBTC-A");
    expect(tronIlks).toContain("WBTC-B");
  });

  it("resolves WBTC ilk config with correct gem and decimals", () => {
    const wbtcA = getIlkConfig("WBTC-A", "tron");
    const wbtcB = getIlkConfig("wbtc-b", "tron");
    expect(wbtcA.gem).toBe("TYhWwKpw43ENFWBTGpzLHh3882f2au7SMi");
    expect(wbtcA.decimals).toBe(8);
    expect(wbtcA.kind).toBe("erc20");
    expect(wbtcB.gem).toBe("TYhWwKpw43ENFWBTGpzLHh3882f2au7SMi");
    expect(wbtcB.decimals).toBe(8);
    expect(wbtcB.kind).toBe("erc20");
  });


  it("keeps savings only on evm networks", () => {
    expect(NETWORKS.tron.savings).toBeUndefined();
    expect(NETWORKS.eth.savings).toBeDefined();
    expect(NETWORKS.bsc.savings).toBeDefined();
  });
});
