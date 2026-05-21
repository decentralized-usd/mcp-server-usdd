const JST_BURNED_INFO_URL = "https://app-api.usdd.io/data-platform/treasury/jst-burned-info";
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

const IGNORE_EXPENDITURE = ["Mining Expenses"];

type TreasuryEntry = {
  year: string;
  quarters: number[];
  data: {
    revenue: Array<[string, string]>;
    expenditure: Array<[string, string]>;
    jstBuyback: Array<[string, string]>;
  };
};

// Source of truth — kept in sync with usddv2-home/src/pages/Treasury/data.json
const TREASURY_DATA: TreasuryEntry[] = [
  {
    year: "2025",
    quarters: [1, 2, 3],
    data: {
      revenue: [
        ["Interest Revenues", "281204"],
        ["Smart Allocator Investments", "4437259"],
        ["Liquidations Revenues", "3271"],
      ],
      expenditure: [
        ["Third Party Expenses", "156753"],
        ["Mining Expenses", "12313680"],
        ["Operating Expenses", "249108"],
      ],
      jstBuyback: [["JST burned via USDD revenues", "0"]],
    },
  },
  {
    year: "2025",
    quarters: [4],
    data: {
      revenue: [
        ["Interest Revenues", "32530"],
        ["Smart Allocator Investments", "3749690"],
        ["Liquidations Revenues", "1081"],
      ],
      expenditure: [
        ["Third Party Expenses", "18563"],
        ["Mining Expenses", "8296007"],
        ["Operating Expenses", "312816"],
      ],
      jstBuyback: [["JST burned via USDD revenues", "0"]],
    },
  },
  {
    year: "2026",
    quarters: [1],
    data: {
      revenue: [
        ["Interest Revenues", "183388"],
        ["Smart Allocator Investments", "6118141"],
        ["Liquidations Revenues", "258"],
      ],
      expenditure: [
        ["Third Party Expenses", "1693"],
        ["Mining Expenses", "12244187"],
        ["Operating Expenses", "158775"],
      ],
      jstBuyback: [["JST burned via USDD revenues", "0"]],
    },
  },
];

// ─── formatting ─────────────────────────────────────────────────────────────

/** Format a plain number as "$1,234,567" or "$1,234,567.89" */
function fmtUsd(value: number, decimals = 0): string {
  return "$" + value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── compute ─────────────────────────────────────────────────────────────────

function periodLabel(entry: TreasuryEntry): string {
  const qs = entry.quarters;
  const qText = qs.length > 1 ? `Q${qs[0]}-Q${qs[qs.length - 1]}` : `Q${qs[0]}`;
  return `${entry.year} ${qText}`;
}

function computeMetrics(entry: TreasuryEntry) {
  const totalRevenue = entry.data.revenue.reduce((s, [, v]) => s + Number(v), 0);
  const totalExpenditure = entry.data.expenditure
    .filter(([name]) => !IGNORE_EXPENDITURE.includes(name))
    .reduce((s, [, v]) => s + Number(v), 0);
  const netResults = totalRevenue - totalExpenditure;
  const jstBuybackTotal = entry.data.jstBuyback.reduce((s, [, v]) => s + Number(v), 0);
  return { totalRevenue, totalExpenditure, netResults, jstBuybackTotal };
}

// ─── cache for JST API ───────────────────────────────────────────────────────

let jstCache: { expiresAt: number; data: { burnedCount: number; totalBurnedUsd: string } } | null = null;

async function fetchJstBurnedInfo(): Promise<{ burnedCount: number; totalBurnedUsd: string }> {
  const now = Date.now();
  if (jstCache && jstCache.expiresAt > now) return jstCache.data;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(JST_BURNED_INFO_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as { code: number; data: { burnedCount: number; totalBurnedUsd: string }; message: string };
    if (json.code !== 0 || !json.data) throw new Error(json.message || "Invalid response");
    jstCache = { data: json.data, expiresAt: now + CACHE_TTL_MS };
    return json.data;
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("JST burned info API timeout (>5s)");
    throw new Error(`JST burned info API failed: ${err?.message ?? String(err)}`);
  } finally {
    clearTimeout(timer);
  }
}

// ─── public functions ─────────────────────────────────────────────────────────

/**
 * Returns a treasury summary matching the USDD Treasury Dashboard display:
 *  - Total Treasury Balance (cumulative net across all periods)
 *  - Per-period breakdown (newest first): Revenue, Expenditure, P&L, Treasury Balance
 *  - Mining Expenses are listed but excluded from expenditure totals (subsidized by TRON DAO)
 */
export async function getTreasurySummary() {
  // Sort chronologically to compute running balance, then reverse for display
  const sorted = [...TREASURY_DATA].sort((a, b) => {
    const y = Number(a.year) - Number(b.year);
    return y !== 0 ? y : Math.max(...a.quarters) - Math.max(...b.quarters);
  });

  let totalTreasuryBalance = 0;

  const periods = sorted.map((entry) => {
    const { totalRevenue, totalExpenditure, netResults } = computeMetrics(entry);
    totalTreasuryBalance += netResults;

    return {
      label: periodLabel(entry),
      revenue: {
        items: entry.data.revenue.map(([item, amount]) => ({
          item,
          amount: fmtUsd(Number(amount)),
        })),
        total: fmtUsd(totalRevenue),
      },
      expenditure: {
        items: entry.data.expenditure.map(([item, amount]) => ({
          item,
          amount: fmtUsd(Number(amount)),
          ...(IGNORE_EXPENDITURE.includes(item) ? { note: "Subsidized by TRON DAO" } : {}),
        })),
        total: fmtUsd(totalExpenditure),
        note: `Excludes ${IGNORE_EXPENDITURE.join(", ")} (subsidized by TRON DAO)`,
      },
      profitAndLoss: fmtUsd(netResults),
      // Per-period "Treasury Balance" = that period's net (matches frontend sumData display)
      treasuryBalance: fmtUsd(netResults),
    };
  });

  return {
    totalTreasuryBalance: fmtUsd(totalTreasuryBalance),
    currency: "USD",
    source: "mainnet",
    // newest first — matches frontend display order
    periods: periods.reverse(),
  };
}

/**
 * Returns JST buyback & burn statistics:
 *  - Total JST burned (USD, from live API)
 *  - Burning records count (from live API)
 *  - JST burned via USDD revenues (from treasury data.json)
 */
export async function getJstBuybackStats() {
  // Sum jstBuyback entries across all periods (from static data)
  const jstBurnedViaUsddRevenues = TREASURY_DATA.reduce(
    (s, entry) => s + entry.data.jstBuyback.reduce((a, [, v]) => a + Number(v), 0),
    0,
  );

  // Fetch live stats from API
  let apiData: { burnedCount: number; totalBurnedUsd: string } | null = null;
  let apiError: string | null = null;
  try {
    apiData = await fetchJstBurnedInfo();
  } catch (err: any) {
    apiError = err?.message ?? String(err);
  }

  const totalBurnedUsd = apiData ? Number(apiData.totalBurnedUsd) : null;

  return {
    totalJstBurned: totalBurnedUsd !== null ? fmtUsd(totalBurnedUsd, 2) : null,
    burningRecords: apiData?.burnedCount ?? null,
    jstBurnedViaUsddRevenues: fmtUsd(jstBurnedViaUsddRevenues),
    ...(apiError ? { apiError } : {}),
    source: "mainnet",
  };
}
