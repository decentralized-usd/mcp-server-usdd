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
