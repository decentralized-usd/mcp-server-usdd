import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CHAINLOG_ABI } from "../abis.js";
import { getNetworkConfig, type NetworkKey } from "../chains.js";
import { readContract } from "./contracts.js";
import { utils } from "./utils.js";

type ChainlogSource = "chainlog" | "chainlog_cache" | "chainlog_cache_stale";

export interface ChainlogSnapshot {
  network: NetworkKey;
  chainId: number;
  logAddress: string;
  source: ChainlogSource;
  cached: boolean;
  stale: boolean;
  lastVerifiedAt: string;
  cacheExpiresAt: string;
  version?: string;
  addresses: Record<string, string>;
  missingKeys: string[];
  warning?: string;
}

interface CacheEntry {
  network: NetworkKey;
  chainId: number;
  logAddress: string;
  lastVerifiedAt: string;
  version?: string;
  addresses: Record<string, string>;
  missingKeys?: string[];
}

interface CacheFile {
  version: 1;
  networks: Record<string, CacheEntry>;
}

const memoryCache = new Map<NetworkKey, CacheEntry>();

function getCacheTtlMs() {
  const raw = process.env.USDD_CHAINLOG_CACHE_TTL_MS;
  if (!raw) return 24 * 60 * 60 * 1000;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24 * 60 * 60 * 1000;
}

function persistentCacheEnabled() {
  return process.env.NODE_ENV !== "test" && process.env.USDD_CHAINLOG_CACHE_DISABLED !== "1";
}

function getCachePath() {
  if (process.env.USDD_CHAINLOG_CACHE_PATH) return process.env.USDD_CHAINLOG_CACHE_PATH;
  const root = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  return path.join(root, "usdd-mcp", "chainlog-addresses.json");
}

async function readCacheFile(): Promise<CacheFile> {
  if (!persistentCacheEnabled()) return { version: 1, networks: {} };
  try {
    const raw = await fs.readFile(getCachePath(), "utf8");
    const parsed = JSON.parse(raw) as CacheFile;
    if (parsed.version === 1 && parsed.networks && typeof parsed.networks === "object") return parsed;
  } catch {
    // Cache is opportunistic. Corrupt or missing cache must not break live reads.
  }
  return { version: 1, networks: {} };
}

async function writeCacheFile(cache: CacheFile) {
  if (!persistentCacheEnabled()) return;
  const cachePath = getCachePath();
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

async function getCachedEntry(network: NetworkKey): Promise<CacheEntry | null> {
  const memory = memoryCache.get(network);
  if (memory) return memory;
  const file = await readCacheFile();
  const entry = file.networks[network];
  if (!entry) return null;
  memoryCache.set(network, entry);
  return entry;
}

async function saveCacheEntry(entry: CacheEntry) {
  memoryCache.set(entry.network, entry);
  const file = await readCacheFile();
  file.networks[entry.network] = entry;
  await writeCacheFile(file);
}

function normalizeKey(key: string) {
  return key.trim().toUpperCase();
}

function uniqueKeys(keys: string[]) {
  return Array.from(new Set(keys.map(normalizeKey).filter(Boolean)));
}

function cacheExpiresAt(entry: CacheEntry, ttlMs = getCacheTtlMs()) {
  return new Date(new Date(entry.lastVerifiedAt).getTime() + ttlMs).toISOString();
}

function isFresh(entry: CacheEntry) {
  return new Date(entry.lastVerifiedAt).getTime() + getCacheTtlMs() > Date.now();
}

function hasAllKeys(entry: CacheEntry, keys: string[]) {
  return keys.every((key) => key in entry.addresses || entry.missingKeys?.includes(key));
}

function fromCache(entry: CacheEntry, keys: string[], stale: boolean, warning?: string): ChainlogSnapshot {
  const addresses = Object.fromEntries(
    keys
      .filter((key) => entry.addresses[key])
      .map((key) => [key, entry.addresses[key]]),
  );
  const missingKeys = keys.filter((key) => !(key in addresses));
  return {
    network: entry.network,
    chainId: entry.chainId,
    logAddress: entry.logAddress,
    source: stale ? "chainlog_cache_stale" : "chainlog_cache",
    cached: true,
    stale,
    lastVerifiedAt: entry.lastVerifiedAt,
    cacheExpiresAt: cacheExpiresAt(entry),
    version: entry.version,
    addresses,
    missingKeys,
    warning,
  };
}

function normalizeChainlogAddress(value: unknown, network: NetworkKey) {
  const raw = String(value);
  const config = getNetworkConfig(network);
  if (config.kind === "tron" && raw.startsWith("0x") && raw.length === 42) {
    return utils.fromEncodedAddress(raw, network);
  }
  return utils.normalizeAddress(raw, network);
}

function missingKeyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /invalid-key|not found|revert/i.test(message);
}

async function readChainlogAddress(network: NetworkKey, logAddress: string, key: string) {
  try {
    const raw = await readContract({
      network,
      address: logAddress,
      abi: CHAINLOG_ABI,
      functionName: "getAddress",
      args: [utils.toBytes32(key)],
    });
    return normalizeChainlogAddress(raw, network);
  } catch (error) {
    if (missingKeyError(error)) return null;
    throw error;
  }
}

async function readChainlogVersion(network: NetworkKey, logAddress: string) {
  try {
    return String(await readContract({
      network,
      address: logAddress,
      abi: CHAINLOG_ABI,
      functionName: "version",
    }));
  } catch {
    return undefined;
  }
}

async function readLiveSnapshot(network: NetworkKey, keys: string[]): Promise<CacheEntry> {
  const config = getNetworkConfig(network);
  if (!config.chainlogAddress) {
    throw new Error(`Chainlog address is not configured for ${network}. Set ${network.toUpperCase()}_CHAINLOG_ADDRESS before resolving protocol addresses.`);
  }

  const pairs = await Promise.all(keys.map(async (key) => [key, await readChainlogAddress(network, config.chainlogAddress!, key)] as const));
  const addresses: Record<string, string> = {};
  const missingKeys: string[] = [];
  for (const [key, address] of pairs) {
    if (address) {
      addresses[key] = address;
    } else {
      missingKeys.push(key);
    }
  }

  return {
    network,
    chainId: config.chainId,
    logAddress: config.chainlogAddress,
    lastVerifiedAt: new Date().toISOString(),
    version: await readChainlogVersion(network, config.chainlogAddress),
    addresses,
    missingKeys,
  };
}

export async function getChainlogAddresses(network: NetworkKey, keys: string[], options: { refresh?: boolean } = {}): Promise<ChainlogSnapshot> {
  const normalizedKeys = uniqueKeys(keys);
  const cached = await getCachedEntry(network);

  if (!options.refresh && cached && hasAllKeys(cached, normalizedKeys) && isFresh(cached)) {
    return fromCache(cached, normalizedKeys, false);
  }

  try {
    const live = await readLiveSnapshot(network, normalizedKeys);
    const merged: CacheEntry = {
      ...live,
      addresses: {
        ...(cached?.addresses || {}),
        ...live.addresses,
      },
      missingKeys: Array.from(new Set([...(cached?.missingKeys || []), ...(live.missingKeys || [])])),
    };
    await saveCacheEntry(merged);
    return {
      network: merged.network,
      chainId: merged.chainId,
      logAddress: merged.logAddress,
      source: "chainlog",
      cached: false,
      stale: false,
      lastVerifiedAt: merged.lastVerifiedAt,
      cacheExpiresAt: cacheExpiresAt(merged),
      version: merged.version,
      addresses: live.addresses,
      missingKeys: live.missingKeys || [],
    };
  } catch (error) {
    if (cached && hasAllKeys(cached, normalizedKeys)) {
      const message = error instanceof Error ? error.message : String(error);
      return fromCache(cached, normalizedKeys, true, `Live Chainlog read failed; returned cached addresses instead. Error: ${message}`);
    }
    throw error;
  }
}

export async function getChainlogAddress(network: NetworkKey, key: string, options: { refresh?: boolean } = {}) {
  const normalizedKey = normalizeKey(key);
  const snapshot = await getChainlogAddresses(network, [normalizedKey], options);
  const address = snapshot.addresses[normalizedKey];
  if (!address) throw new Error(`Chainlog key ${normalizedKey} is not registered for ${network}.`);
  return {
    network,
    key: normalizedKey,
    address,
    source: snapshot.source,
    cached: snapshot.cached,
    stale: snapshot.stale,
    logAddress: snapshot.logAddress,
    lastVerifiedAt: snapshot.lastVerifiedAt,
    cacheExpiresAt: snapshot.cacheExpiresAt,
    version: snapshot.version,
    warning: snapshot.warning,
  };
}

export function resetChainlogCacheForTests() {
  memoryCache.clear();
}
