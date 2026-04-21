import {
  resolveWallet,
  resolveWalletProvider,
  ConfigWalletProvider,
  SecureKVStore,
  type Wallet,
  type WalletConfig,
} from "@bankofai/agent-wallet";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { TronWeb } from "tronweb";
import { privateKeyToAccount } from "viem/accounts";
import * as bip39 from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { getNetworkConfig, type NetworkKey } from "../chains.js";
import { TronWalletSigner } from "../browser-signer.js";
import type { TronNetwork } from "tronlink-signer";

type WalletType = "tron" | "evm";
type WalletSource = "generated" | "imported_private_key" | "imported_mnemonic" | "external";
type SecretType = "private_key" | "mnemonic";
type WalletMode = "agent" | "browser";

export interface ConfiguredWallet {
  id: string;
  type: WalletType;
  privateKey: string;
  address: string;
}

export interface WalletInfo {
  id: string;
  type: string;
  source: WalletSource;
  address: string;
  tronAddress?: string;
  evmAddress?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface WalletModeInfo {
  mode: WalletMode;
  network: NetworkKey;
  address: string | null;
  browserConnected: boolean;
}

interface WalletMetadata {
  source: WalletSource;
  preferredType?: WalletType;
  createdAt: string;
  updatedAt: string;
}

interface WalletState {
  wallets: Record<string, WalletMetadata>;
}

const WALLET_DIR = process.env.AGENT_WALLET_DIR || join(homedir(), ".agent-wallet");
const STATE_FILE = join(WALLET_DIR, "usdd-wallet-state.json");
const MASTER_FILE = join(WALLET_DIR, "master.json");
let activeWalletMode: WalletMode = "agent";
let browserSigner: TronWalletSigner | null = null;

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
}

function ensureWalletStoreLayout() {
  ensureDir(WALLET_DIR);
}

function saveJson(path: string, value: unknown) {
  ensureDir(WALLET_DIR);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function getWalletPassword() {
  ensureWalletStoreLayout();
  const supplied = process.env.AGENT_WALLET_PASSWORD?.trim();
  if (supplied) return supplied;

  const provider = new ConfigWalletProvider(WALLET_DIR, undefined, { network: "tron" });
  const existing = provider.loadRuntimeSecretsPassword();
  if (existing) return existing;

  const generated = randomBytes(32).toString("hex");
  provider.ensureStorage();
  provider.saveRuntimeSecrets(generated);
  return generated;
}

function getProvider(network: string = "tron") {
  ensureWalletStoreLayout();
  const provider = new ConfigWalletProvider(WALLET_DIR, getWalletPassword(), { network });
  provider.ensureStorage();
  if (!provider.hasRuntimeSecrets()) {
    provider.saveRuntimeSecrets(getWalletPassword());
  }
  return provider;
}

function getKvStore() {
  const kvStore = new SecureKVStore(WALLET_DIR, getWalletPassword());
  if (!existsSync(MASTER_FILE)) {
    kvStore.initMaster();
  }
  return kvStore;
}

function getWalletState(): WalletState {
  ensureWalletStoreLayout();
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8")) as WalletState;
  } catch {
    return { wallets: {} };
  }
}

function saveWalletState(state: WalletState) {
  saveJson(STATE_FILE, state);
}

function toAgentNetwork(value: NetworkKey | WalletType | string) {
  if (value === "tron") return "tron";
  if (value === "tron_nile") return "tron";
  if (value === "eth") return "eip155:1";
  if (value === "eth_sepolia") return "eip155:11155111";
  if (value === "bsc") return "eip155:56";
  if (value === "bsc_testnet") return "eip155:97";
  if (value === "evm") return "eip155:1";
  throw new Error(`Unsupported wallet network: ${value}`);
}

function getWalletTypeForNetwork(network: NetworkKey): WalletType {
  return getNetworkConfig(network).kind === "tron" ? "tron" : "evm";
}

function normalizeEvmPrivateKey(value: string) {
  const trimmed = value.trim();
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as `0x${string}`;
}

function deriveTronFromMnemonic(mnemonic: string, index = 0) {
  if (!bip39.validateMnemonic(mnemonic, wordlist)) {
    throw new Error("Invalid mnemonic phrase.");
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const child = hdKey.derive(`m/44'/195'/0'/0/${index}`);
  if (!child.privateKey) throw new Error("Failed to derive TRON wallet from mnemonic.");
  const privateKey = Buffer.from(child.privateKey).toString("hex");
  const address = TronWeb.address.fromPrivateKey(privateKey);
  if (!address) throw new Error("Failed to derive TRON address from mnemonic.");
  return { privateKey, address };
}

function deriveEvmFromMnemonic(mnemonic: string, index = 0) {
  if (!bip39.validateMnemonic(mnemonic, wordlist)) {
    throw new Error("Invalid mnemonic phrase.");
  }
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const hdKey = HDKey.fromMasterSeed(seed);
  const child = hdKey.derive(`m/44'/60'/0'/0/${index}`);
  if (!child.privateKey) throw new Error("Failed to derive EVM wallet from mnemonic.");
  const privateKey = normalizeEvmPrivateKey(Buffer.from(child.privateKey).toString("hex"));
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

function walletFromPrivateKey(type: WalletType, secret: string) {
  if (type === "tron") {
    const privateKey = secret.replace(/^0x/, "").trim();
    const address = TronWeb.address.fromPrivateKey(privateKey);
    if (!address) throw new Error("Invalid TRON private key.");
    return { privateKey, address };
  }

  const privateKey = normalizeEvmPrivateKey(secret);
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

function createGeneratedWallet(type: WalletType) {
  if (type === "tron") {
    const privateKey = randomBytes(32).toString("hex");
    const address = TronWeb.address.fromPrivateKey(privateKey);
    if (!address) throw new Error("Failed to generate TRON wallet.");
    return { privateKey, address };
  }

  const privateKey = normalizeEvmPrivateKey(randomBytes(32).toString("hex"));
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

function deriveFromSecret(params: {
  walletType: WalletType;
  secretType: SecretType;
  secret: string;
  index?: number;
}) {
  if (params.secretType === "mnemonic") {
    return params.walletType === "tron"
      ? deriveTronFromMnemonic(params.secret, params.index ?? 0)
      : deriveEvmFromMnemonic(params.secret, params.index ?? 0);
  }
  return walletFromPrivateKey(params.walletType, params.secret);
}

function toSecretBytes(privateKey: string, type: WalletType) {
  const normalized = type === "tron" ? privateKey.replace(/^0x/, "") : privateKey.replace(/^0x/, "");
  return Buffer.from(normalized, "hex");
}

function readPrivateKeyFromConfig(walletId: string, walletType: WalletType): string {
  const provider = getProvider(toAgentNetwork(walletType));
  const config = provider.getWalletConfig(walletId);

  if (config.type === "local_secure") {
    const localParams = config.params as { secret_ref: string };
    const keyBytes = getKvStore().loadSecret(localParams.secret_ref);
    const hex = Buffer.from(keyBytes).toString("hex");
    return walletType === "tron" ? hex : normalizeEvmPrivateKey(hex);
  }

  const rawParams = config.params as
    | { source: "private_key"; private_key: string }
    | { source: "mnemonic"; mnemonic: string; account_index: number };

  if (rawParams.source === "private_key") {
    return walletType === "tron"
      ? rawParams.private_key.replace(/^0x/, "")
      : normalizeEvmPrivateKey(rawParams.private_key);
  }

  const derived = walletType === "tron"
    ? deriveTronFromMnemonic(rawParams.mnemonic, rawParams.account_index)
    : deriveEvmFromMnemonic(rawParams.mnemonic, rawParams.account_index);
  return derived.privateKey;
}

function deriveAddressFromPrivateKey(privateKey: string, type: WalletType) {
  if (type === "tron") {
    const address = TronWeb.address.fromPrivateKey(privateKey.replace(/^0x/, ""));
    if (!address) throw new Error("Failed to derive TRON address from private key.");
    return address;
  }
  return privateKeyToAccount(normalizeEvmPrivateKey(privateKey)).address;
}

function ensureDefaultWalletId() {
  const provider = getProvider("tron");
  const wallets = provider.listWallets();
  const activeId = provider.getActiveId();
  if (activeId) return activeId;
  if (wallets.length > 0) {
    provider.setActive(wallets[0][0]);
    return wallets[0][0];
  }

  const walletId = "default";
  const kvStore = getKvStore();
  kvStore.generateSecret(walletId, { length: 32 });
  provider.addWallet(walletId, {
    type: "local_secure",
    params: { secret_ref: walletId },
  } as WalletConfig, { setActiveIfMissing: true });

  const now = new Date().toISOString();
  const state = getWalletState();
  state.wallets[walletId] = {
    source: "generated",
    preferredType: "tron",
    createdAt: now,
    updatedAt: now,
  };
  saveWalletState(state);
  return walletId;
}

function resolveAddresses(walletId: string) {
  const tronPrivateKey = readPrivateKeyFromConfig(walletId, "tron");
  const evmPrivateKey = readPrivateKeyFromConfig(walletId, "evm");
  return {
    tronAddress: deriveAddressFromPrivateKey(tronPrivateKey, "tron"),
    evmAddress: deriveAddressFromPrivateKey(evmPrivateKey, "evm"),
  };
}

function toBrowserNetwork(network: NetworkKey): TronNetwork {
  if (network === "tron") return "mainnet";
  if (network === "tron_nile") return "nile";
  throw new Error(`Browser wallet signing is only supported for TRON networks (tron/tron_nile). Received ${network}.`);
}

function getBrowserSigner() {
  if (!browserSigner) browserSigner = new TronWalletSigner();
  return browserSigner;
}

export function initializeWalletStore() {
  const walletId = ensureDefaultWalletId();
  const tron = getConfiguredWallet("tron");
  const evm = getConfiguredWallet("eth");
  return {
    dir: WALLET_DIR,
    tron: { id: walletId, address: tron.address },
    evm: { id: walletId, address: evm.address },
  };
}

function normalizeBrowserAddress(network: NetworkKey, address: string): string {
  const config = getNetworkConfig(network);
  const trimmed = address.trim();
  if (config.kind === "tron") {
    if (!TronWeb.isAddress(trimmed)) {
      throw new Error(`Invalid TRON browser wallet address: ${address}`);
    }
    return trimmed.startsWith("T") ? trimmed : TronWeb.address.fromHex(trimmed.startsWith("0x") ? `41${trimmed.slice(2)}` : trimmed);
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new Error(`Invalid EVM browser wallet address: ${address}`);
  }
  return trimmed.toLowerCase();
}

export async function connectBrowserWallet(params?: { network?: NetworkKey; address?: string }) {
  const network = params?.network || "tron";
  const config = getNetworkConfig(network);
  if (config.kind !== "tron") {
    throw new Error("Browser wallet mode currently supports TRON-compatible browser wallets only.");
  }

  const requiredAddress = params?.address ? normalizeBrowserAddress(network, params.address) : undefined;
  const signer = getBrowserSigner();
  const { address, approvalUrl } = await signer.connectWallet({
    address: requiredAddress,
    network: toBrowserNetwork(network),
  });

  activeWalletMode = "browser";
  return {
    mode: activeWalletMode,
    network,
    address,
    approvalUrl,
    browserConnected: true,
    message: `Connected browser wallet ${address} on ${network}.`,
  };
}

export function setWalletMode(mode: WalletMode, network?: NetworkKey) {
  if (mode === "browser") {
    const target = network || "tron";
    if (getNetworkConfig(target).kind !== "tron") {
      throw new Error(`Browser mode currently supports TRON networks only. Received ${target}.`);
    }
    const browserAddress = getBrowserSigner().getConnectedAddress();
    if (!browserAddress) {
      throw new Error(`No browser wallet connected for ${target}. Call connect_browser_wallet first.`);
    }
  }
  activeWalletMode = mode;
  return getWalletMode(network);
}

export function getWalletMode(network?: NetworkKey): WalletModeInfo {
  const target = network || "tron";
  const browserAddress = getBrowserSigner().getConnectedAddress();
  const browserSupported = getNetworkConfig(target).kind === "tron";
  if (activeWalletMode === "browser") {
    return {
      mode: "browser",
      network: target,
      address: browserSupported ? browserAddress : null,
      browserConnected: browserSupported && Boolean(browserAddress),
    };
  }

  return {
    mode: "agent",
    network: target,
    address: getConfiguredWallet(target).address,
    browserConnected: browserSupported && Boolean(browserAddress),
  };
}

export function isBrowserWalletMode(): boolean {
  return activeWalletMode === "browser";
}

export function listWallets(): WalletInfo[] {
  const provider = getProvider("tron");
  const state = getWalletState();
  const activeId = ensureDefaultWalletId();
  const wallets = provider.listWallets();

  return wallets.map(([id]) => {
    const meta = state.wallets[id];
    const addresses = resolveAddresses(id);
    const preferredType = meta?.preferredType || "tron";
    return {
      id,
      type: preferredType,
      source: meta?.source || "external",
      address: preferredType === "tron" ? addresses.tronAddress : addresses.evmAddress,
      tronAddress: addresses.tronAddress,
      evmAddress: addresses.evmAddress,
      createdAt: meta?.createdAt || "",
      updatedAt: meta?.updatedAt || "",
      isActive: id === activeId,
    };
  });
}

export function importWallet(params: {
  walletType: WalletType;
  secretType: SecretType;
  secret: string;
  index?: number;
}) {
  const derived = deriveFromSecret(params);
  const candidateAddress = derived.address.toLowerCase();
  const existing = listWallets();
  const duplicate = existing.find((wallet) => {
    const matchAddress = params.walletType === "tron"
      ? wallet.tronAddress?.toLowerCase()
      : wallet.evmAddress?.toLowerCase();
    return matchAddress === candidateAddress;
  });

  if (duplicate) {
    return {
      id: duplicate.id,
      type: duplicate.type,
      address: params.walletType === "tron" ? duplicate.tronAddress! : duplicate.evmAddress!,
      source: duplicate.source,
      createdAt: duplicate.createdAt,
      updatedAt: duplicate.updatedAt,
      isActive: duplicate.isActive,
      imported: false,
      message: `Wallet ${params.walletType === "tron" ? duplicate.tronAddress : duplicate.evmAddress} already exists.`,
    };
  }

  const provider = getProvider(toAgentNetwork(params.walletType));
  const kvStore = getKvStore();
  const now = new Date().toISOString();
  const walletId = `${params.walletType}_${randomBytes(6).toString("hex")}`;
  kvStore.saveSecret(walletId, toSecretBytes(derived.privateKey, params.walletType));
  provider.addWallet(walletId, {
    type: "local_secure",
    params: { secret_ref: walletId },
  } as WalletConfig, { setActiveIfMissing: true });

  const state = getWalletState();
  state.wallets[walletId] = {
    source: params.secretType === "mnemonic" ? "imported_mnemonic" : "imported_private_key",
    preferredType: params.walletType,
    createdAt: now,
    updatedAt: now,
  };
  saveWalletState(state);

  if (!provider.getActiveId()) {
    provider.setActive(walletId);
  }

  return {
    id: walletId,
    type: params.walletType,
    address: derived.address,
    source: state.wallets[walletId].source,
    createdAt: now,
    updatedAt: now,
    isActive: provider.getActiveId() === walletId,
    imported: true,
    message: `Imported ${params.walletType} wallet ${derived.address}.`,
  };
}

export function generateWallet(walletType: WalletType) {
  const generated = createGeneratedWallet(walletType);
  const provider = getProvider(toAgentNetwork(walletType));
  const kvStore = getKvStore();
  const now = new Date().toISOString();
  const walletId = `${walletType}_${randomBytes(6).toString("hex")}`;

  kvStore.saveSecret(walletId, toSecretBytes(generated.privateKey, walletType));
  provider.addWallet(walletId, {
    type: "local_secure",
    params: { secret_ref: walletId },
  } as WalletConfig, { setActiveIfMissing: true });

  const state = getWalletState();
  state.wallets[walletId] = {
    source: "generated",
    preferredType: walletType,
    createdAt: now,
    updatedAt: now,
  };
  saveWalletState(state);

  return {
    id: walletId,
    type: walletType,
    address: generated.address,
    source: "generated" as const,
    createdAt: now,
    updatedAt: now,
    isActive: provider.getActiveId() === walletId,
    message: `Generated ${walletType} wallet ${generated.address}.`,
  };
}

export function setActiveWallet(id: string) {
  const provider = getProvider("tron");
  provider.setActive(id);
  const state = getWalletState();
  const meta = state.wallets[id];
  const addresses = resolveAddresses(id);
  return {
    id,
    type: meta?.preferredType || "tron",
    address: meta?.preferredType === "evm" ? addresses.evmAddress : addresses.tronAddress,
    source: meta?.source || "external",
    isActive: true,
    message: `Activated wallet ${id}.`,
  };
}

export function getConfiguredWallet(network: NetworkKey): ConfiguredWallet {
  if (activeWalletMode === "browser") {
    const config = getNetworkConfig(network);
    const browserAddress = getBrowserSigner().getConnectedAddress();
    if (config.kind === "tron" && browserAddress) {
      return {
        id: `browser:${network}`,
        type: getWalletTypeForNetwork(network),
        privateKey: "",
        address: browserAddress,
      };
    }
  }

  const walletId = ensureDefaultWalletId();
  const walletType = getWalletTypeForNetwork(network);
  const privateKey = readPrivateKeyFromConfig(walletId, walletType);
  const address = deriveAddressFromPrivateKey(privateKey, walletType);
  return {
    id: walletId,
    type: walletType,
    privateKey,
    address,
  };
}

export function getWalletAddress(network: NetworkKey): string {
  return getConfiguredWallet(network).address;
}

export async function signTransactionWithWallet(unsignedTx: any, network: NetworkKey, _description?: string): Promise<any> {
  const config = getNetworkConfig(network);
  if (config.kind !== "tron") {
    throw new Error(`signTransactionWithWallet currently supports TRON networks only. Received ${network}.`);
  }

  if (activeWalletMode === "browser") {
    const signer = getBrowserSigner();
    const { signedTransaction } = await signer.signTransaction(unsignedTx, toBrowserNetwork(network));
    if (signedTransaction && signedTransaction.signature) {
      return { ...unsignedTx, signature: signedTransaction.signature };
    }
    return signedTransaction;
  }

  const wallet = getConfiguredWallet(network);
  const signerClient = new TronWeb({
    fullHost: config.rpcUrl,
    solidityNode: config.rpcUrl,
    eventServer: config.rpcUrl,
    privateKey: wallet.privateKey,
    headers: process.env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY } : undefined,
  });
  return signerClient.trx.sign(unsignedTx);
}

export function getWalletStorePath() {
  ensureWalletStoreLayout();
  return WALLET_DIR;
}

export async function getAgentWallet(network: NetworkKey): Promise<Wallet> {
  const walletId = ensureDefaultWalletId();
  const resolved = resolveWalletProvider({ dir: WALLET_DIR, network: toAgentNetwork(network) });
  if (resolved instanceof ConfigWalletProvider) {
    return resolved.getWallet(walletId, toAgentNetwork(network));
  }
  return resolveWallet({ dir: WALLET_DIR, network: toAgentNetwork(network), walletId });
}

export function resetWalletStore() {
  rmSync(WALLET_DIR, { recursive: true, force: true });
}

export function walletStoreExists() {
  try {
    return statSync(WALLET_DIR).isDirectory();
  } catch {
    return false;
  }
}
