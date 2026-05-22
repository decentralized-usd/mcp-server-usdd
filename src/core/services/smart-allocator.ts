const SMART_ALLOCATOR_URL = "https://app-api.usdd.io/smart-allocator/detail-overview";
const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 3000;

type PlatformSummaryInfo = {
  actualEarnings: number;
  apy: number;
  chain: string;
  gemSymbol: string;
  holdingAmount: number;
  operatorAddress: string;
  platform: string;
  strategy: string;
  tag: string | null;
};

type VaultInfo = {
  chain: string;
  contractAddress: string;
  debt: number;
  vaultType: string;
};

type SmartAllocatorApiResponse = {
  code: number;
  data: {
    apy: number;
    debt: number;
    platformSummaryInfos: PlatformSummaryInfo[];
    vaultInfos: VaultInfo[];
  };
  message: string;
};

let cache: { expiresAt: number; data: SmartAllocatorApiResponse["data"] } | null = null;

function toAmountString(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toString();
}

function toPercentString(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value.toString();
}

function getExplorerUrl(chain: string, address: string): string | null {
  const key = chain.toLowerCase();
  if (key === "tron") return `https://tronscan.org/#/address/${address}`;
  if (key === "eth" || key === "ethereum") return `https://etherscan.io/address/${address}`;
  if (key === "bsc") return `https://bscscan.com/address/${address}`;
  if (key === "plasma") return null;
  return null;
}

async function fetchSmartAllocatorData() {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(SMART_ALLOCATOR_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`);
    }
    const json = await response.json() as SmartAllocatorApiResponse;
    if (json.code !== 0 || !json.data) {
      throw new Error(json.message || "Invalid smart allocator response");
    }
    cache = { data: json.data, expiresAt: now + CACHE_TTL_MS };
    return json.data;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Smart allocator API timeout (>3s)");
    }
    throw new Error(`Smart allocator API request failed: ${error?.message || String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function getSmartAllocatorOverview() {
  const data = await fetchSmartAllocatorData();
  const invested = data.platformSummaryInfos.reduce((acc, item) => acc + (item.holdingAmount || 0), 0);
  const earnings = data.platformSummaryInfos.reduce((acc, item) => acc + (item.actualEarnings || 0), 0);

  return {
    debtUsdd: toAmountString(data.debt),
    invested: toAmountString(invested),
    earnings: toAmountString(earnings),
    apy: toPercentString(data.apy),
    source: "mainnet",
  };
}

export async function getAssetsBreakdown(dimension: "protocol" | "network" | "asset") {
  const data = await fetchSmartAllocatorData();
  const totalInvested = data.platformSummaryInfos.reduce((acc, item) => acc + (item.holdingAmount || 0), 0);
  const groups = new Map<string, number>();

  data.platformSummaryInfos.forEach((item) => {
    const key = dimension === "protocol"
      ? item.platform
      : dimension === "network"
        ? item.chain
        : item.gemSymbol;
    groups.set(key, (groups.get(key) || 0) + (item.holdingAmount || 0));
  });

  const items = [...groups.entries()].map(([name, value]) => ({
    name,
    value: toAmountString(value),
    percentage: totalInvested > 0 ? ((value / totalInvested) * 100).toFixed(6) : "0",
  }));

  return {
    dimension,
    totalInvested: toAmountString(totalInvested),
    items,
    source: "mainnet",
  };
}

export async function getProofOfReserve() {
  const data = await fetchSmartAllocatorData();
  return {
    items: data.platformSummaryInfos.map((item) => ({
      platform: item.platform,
      tag: item.tag || "",
      chain: item.chain,
      investedAmount: toAmountString(item.holdingAmount || 0),
      investedToken: item.gemSymbol,
      earnings: toAmountString(item.actualEarnings || 0),
      apy: toPercentString(item.apy || 0),
      investmentAddress: item.operatorAddress,
      explorerUrl: getExplorerUrl(item.chain, item.operatorAddress),
    })),
    source: "mainnet",
  };
}

export async function getDebtOverview() {
  const data = await fetchSmartAllocatorData();
  return {
    items: data.vaultInfos.map((item) => ({
      network: item.chain,
      vault: item.vaultType,
      totalDebt: toAmountString(item.debt),
      contractAddress: item.contractAddress,
      explorerUrl: getExplorerUrl(item.chain, item.contractAddress),
    })),
    source: "mainnet",
  };
}

