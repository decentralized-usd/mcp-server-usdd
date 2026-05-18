import { getSupportedIlks, getSupportedPsmMarkets, type NetworkKey } from "../chains.js";

const OVERVIEW_INFO_URL = "https://app-api.usdd.io/data-platform/overview/info";
const LATEST_COLLATERAL_URL = "https://app-api.usdd.io/data-platform/latest-collateral";
const HIGHEST_PRICE_URL = "https://app-api.usdd.io/liquid/highestprice";
const VAULT_COLLATERALS_URL = "https://app-api.usdd.io/vault/collaterals";
const CACHE_TTL_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 3000;

type OverviewInfoApiResponse = {
  code: number;
  data: {
    earnSa: string;
    earnSaDailyChange: string;
    earnTvl: string;
    earnTvlDailyChange: string;
    totalCollateralValue: string;
    totalCollateralValueDailyChange: string;
    totalSupplyValue: string;
    totalSupplyValueDailyChange: string;
  };
  message: string;
};

let overviewCache: { expiresAt: number; data: OverviewInfoApiResponse["data"] } | null = null;
const latestCollateralCache = new Map<string, { expiresAt: number; data: any }>();
let highestPriceCache: { expiresAt: number; data: any } | null = null;
let vaultCollateralsCache: { expiresAt: number; data: any } | null = null;

async function fetchOverviewInfo() {
  const now = Date.now();
  if (overviewCache && overviewCache.expiresAt > now) return overviewCache.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(OVERVIEW_INFO_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const json = await response.json() as OverviewInfoApiResponse;
    if (json.code !== 0 || !json.data) throw new Error(json.message || "Invalid overview response");
    overviewCache = { data: json.data, expiresAt: now + CACHE_TTL_MS };
    return json.data;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Overview API timeout (>3s)");
    throw new Error(`Overview API request failed: ${error?.message || String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function getProtocolMetrics() {
  const data = await fetchOverviewInfo();
  return {
    totalSupply: data.totalSupplyValue,
    protocolTVL: data.totalCollateralValue,
    savingTVL: data.earnTvl,
    SAEarning: data.earnSa,
    source: "mainnet",
  };
}

async function fetchLatestCollateral(chain: "tron" | "eth" | "bsc") {
  const now = Date.now();
  const cached = latestCollateralCache.get(chain);
  if (cached && cached.expiresAt > now) return cached.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${LATEST_COLLATERAL_URL}?chain=${chain}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const json = await response.json() as { code: number; data: any; message: string };
    if (json.code !== 0 || !json.data) throw new Error(json.message || "Invalid latest-collateral response");
    latestCollateralCache.set(chain, { data: json.data, expiresAt: now + CACHE_TTL_MS });
    return json.data;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Latest-collateral API timeout (>3s)");
    throw new Error(`Latest-collateral API request failed: ${error?.message || String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function getChainMetrics(chain: "tron" | "eth" | "bsc") {
  const data = await fetchLatestCollateral(chain);
  const base = {
    chain,
    totalSupply: String(data.totalSupplyValue ?? data.usddTotalSupply ?? "0"),
    totalCollateralValue: String(data.totalCollateralValue ?? "0"),
    source: "mainnet",
  };

  if (chain === "tron") {
    return {
      ...base,
      earnAPY: String(data.apy ?? "0"),
    };
  }

  return {
    ...base,
    savingsAPY: String(data.apy ?? "0"),
    savingsTVL: String(data.earnTvl ?? "0"),
  };
}

async function fetchHighestCollateralPrice() {
  const now = Date.now();
  if (highestPriceCache && highestPriceCache.expiresAt > now) return highestPriceCache.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(HIGHEST_PRICE_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const json = await response.json() as { code: number; data: any; message: string };
    if (json.code !== 0 || !json.data) throw new Error(json.message || "Invalid highestprice response");
    highestPriceCache = { data: json.data, expiresAt: now + CACHE_TTL_MS };
    return json.data;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Highestprice API timeout (>3s)");
    throw new Error(`Highestprice API request failed: ${error?.message || String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function getCollateralPrices() {
  const data = await fetchHighestCollateralPrice();
  return {
    source: "mainnet_api",
    ...data,
  };
}

async function fetchVaultCollaterals() {
  const now = Date.now();
  if (vaultCollateralsCache && vaultCollateralsCache.expiresAt > now) return vaultCollateralsCache.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(VAULT_COLLATERALS_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    const json = await response.json() as { code: number; data: any; message: string };
    if (json.code !== 0 || !json.data) throw new Error(json.message || "Invalid vault-collaterals response");
    vaultCollateralsCache = { data: json.data, expiresAt: now + CACHE_TTL_MS };
    return json.data;
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("Vault-collaterals API timeout (>3s)");
    throw new Error(`Vault-collaterals API request failed: ${error?.message || String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function getSupportedIlksData(network: NetworkKey) {
  const staticIlks = getSupportedIlks(network);
  const staticPsmMarkets = getSupportedPsmMarkets(network);

  if (network !== "tron") {
    return {
      network,
      source: "static_config",
      ilks: staticIlks,
      psmMarkets: staticPsmMarkets,
    };
  }

  try {
    const data = await fetchVaultCollaterals();
    const ilks = (data.items || []).map((item: any) => {
      const matched = staticIlks.find((x) => x.key === item.ilk);
      return {
        key: item.ilk,
        label: matched?.label || item.ilk,
        kind: matched?.kind,
        decimals: matched?.decimals,
        join: matched?.join,
        gem: matched?.gem,
        curMinted: item.curMinted,
        maxMinted: item.maxMinted,
        totalCollateral: item.totalCollateral,
        minCollateralRatio: item.minCollateralRatio,
        stabilityFee: item.stabilityFee,
        dust: item.dust,
      };
    });

    return {
      network,
      source: "mainnet_api",
      ilks,
      psmMarkets: staticPsmMarkets,
    };
  } catch {
    return {
      network,
      source: "static_config_fallback",
      ilks: staticIlks,
      psmMarkets: staticPsmMarkets,
    };
  }
}
