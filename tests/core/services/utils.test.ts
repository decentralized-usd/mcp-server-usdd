import { describe, expect, it } from "vitest";
import { TronWeb } from "tronweb";
import { utils } from "../../../src/core/services/utils.js";

describe("utils", () => {
  it("parses and formats decimal units", () => {
    const raw = utils.parseUnits("123.4567", 6);
    expect(raw).toBe(123456700n);
    expect(utils.formatUnits(raw, 6)).toBe("123.4567");
  });

  it("handles negative values and zero decimals", () => {
    expect(utils.parseUnits("-10.5", 1)).toBe(-105n);
    expect(utils.formatUnits(42n, 0)).toBe("42");
  });

  it("rejects invalid numeric input", () => {
    expect(() => utils.parseUnits("abc", 6)).toThrow("Invalid numeric value");
  });

  it("round-trips bytes32 strings", () => {
    const encoded = utils.toBytes32("TRX-A");
    expect(utils.bytes32ToString(encoded)).toBe("TRX-A");
  });

  it("normalizes and encodes tron addresses", () => {
    const base58 = "TXDk8mbtRbXeYuMNS83CfKPaYYT8XWv9Hz";
    const hex = TronWeb.address.toHex(base58);
    const encoded = utils.toEncodedAddress(base58, "tron");
    expect(encoded.startsWith("0x")).toBe(true);
    expect(utils.fromEncodedAddress(encoded, "tron")).toBe(base58);
    expect(utils.normalizeAddress(hex, "tron")).toBe(base58);
  });

  it("normalizes evm addresses to lowercase", () => {
    expect(utils.normalizeAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "eth")).toBe(
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    );
  });
});
