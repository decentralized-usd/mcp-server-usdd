import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TRON_PRIVATE_KEY = "1111111111111111111111111111111111111111111111111111111111111111";
const EVM_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f094538e9f0e8c9f9d2b7d9922f2a3d09b4d6f77";

describe("wallet store", () => {
  let homeDir: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "usdd-wallet-test-"));
    process.env.HOME = homeDir;
    process.env.AGENT_WALLET_PASSWORD = "unit-test-password";
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(homeDir, { recursive: true, force: true });
    delete process.env.AGENT_WALLET_PASSWORD;
    delete process.env.HOME;
  });

  it("initializes encrypted tron and evm wallets automatically", async () => {
    const wallet = await import("../../../src/core/services/wallet.js");
    const init = wallet.initializeWalletStore();
    expect(init.dir).toContain(".agent-wallet");
    expect(init.tron.address.startsWith("T")).toBe(true);
    expect(init.evm.address.startsWith("0x")).toBe(true);
    expect(wallet.walletStoreExists()).toBe(true);
    expect(await wallet.listWallets()).toHaveLength(1);
  }, 20_000);

  it("imports wallets and de-duplicates existing entries", async () => {
    const wallet = await import("../../../src/core/services/wallet.js");
    wallet.initializeWalletStore();

    const firstImport = await wallet.importWallet({
      walletType: "tron",
      secretType: "private_key",
      secret: TRON_PRIVATE_KEY,
    });
    expect(firstImport.imported).toBe(true);

    const duplicateImport = await wallet.importWallet({
      walletType: "tron",
      secretType: "private_key",
      secret: TRON_PRIVATE_KEY,
    });
    expect(duplicateImport.imported).toBe(false);
    expect(duplicateImport.address).toBe(firstImport.address);
  }, 20_000);

  it("switches the active wallet by id", async () => {
    const wallet = await import("../../../src/core/services/wallet.js");
    wallet.initializeWalletStore();

    const generated = await wallet.generateWallet("evm");
    const activated = await wallet.setActiveWallet(generated.id);
    expect(activated.isActive).toBe(true);
    expect(wallet.getWalletAddress("eth")).toBe(generated.address);
  }, 20_000);

  it("returns decrypted configured wallets for the target family", async () => {
    const wallet = await import("../../../src/core/services/wallet.js");

    const importedEvm = await wallet.importWallet({
      walletType: "evm",
      secretType: "private_key",
      secret: EVM_PRIVATE_KEY,
    });

    await wallet.setActiveWallet(importedEvm.id);
    const configured = wallet.getConfiguredWallet("bsc");
    expect(configured.type).toBe("evm");
    expect(configured.address).toBe(importedEvm.address);
    expect(configured.privateKey).toBe(EVM_PRIVATE_KEY);
  }, 20_000);

  it("prompts once before first TRON wallet operation in each session", async () => {
    const wallet = await import("../../../src/core/services/wallet.js");
    wallet.initializeWalletStore();

    expect(() => wallet.assertWalletReadyForWrite("tron")).toThrow(/Before any TRON wallet operation in this session/i);
    expect(() => wallet.assertWalletReadyForWrite("tron")).not.toThrow();
    expect(() => wallet.assertWalletReadyForWrite("tron")).not.toThrow();
  }, 20_000);

  it("tracks active wallets independently for tron and evm", async () => {
    const wallet = await import("../../../src/core/services/wallet.js");
    wallet.initializeWalletStore();

    const importedTron = await wallet.importWallet({
      walletType: "tron",
      secretType: "private_key",
      secret: TRON_PRIVATE_KEY,
    });
    const importedEvm = await wallet.importWallet({
      walletType: "evm",
      secretType: "private_key",
      secret: EVM_PRIVATE_KEY,
    });

    await wallet.setActiveWallet(importedTron.id, "tron");
    await wallet.setActiveWallet(importedEvm.id, "evm");

    // Advance the once-per-session TRON mode gate so that getWalletAddress
    // calls below do not fire the confirmation prompt.
    expect(() => wallet.assertTronModeConfirmed("tron")).toThrow(/Before any TRON wallet operation in this session/i);

    expect(wallet.getWalletAddress("tron")).toBe(importedTron.address);
    expect(wallet.getWalletAddress("eth")).toBe(importedEvm.address);
  }, 20_000);

});
