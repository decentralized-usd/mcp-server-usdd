type TreasuryEntry = {
  year: string;
  quarters: number[];
  data: {
    revenue: Array<[string, string]>;
    expenditure: Array<[string, string]>;
    jstBuyback: Array<[string, string]>;
  };
};

const TREASURY_MAINNET_DATA: TreasuryEntry[] = [
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

function sumRows(rows: Array<[string, string]>): bigint {
  return rows.reduce((acc, [, value]) => acc + BigInt(value), 0n);
}

function latestEntry(entries: TreasuryEntry[]): TreasuryEntry {
  return [...entries].sort((a, b) => {
    const yearDelta = Number(a.year) - Number(b.year);
    if (yearDelta !== 0) return yearDelta;
    const aq = Math.max(...a.quarters);
    const bq = Math.max(...b.quarters);
    return aq - bq;
  })[entries.length - 1];
}

export async function getTreasurySummary() {
  const latest = latestEntry(TREASURY_MAINNET_DATA);
  const totalRevenue = sumRows(latest.data.revenue);
  const totalExpense = sumRows(latest.data.expenditure);
  const netIncome = totalRevenue - totalExpense;

  const cumulativeNet = TREASURY_MAINNET_DATA.reduce((acc, entry) => {
    const rev = sumRows(entry.data.revenue);
    const exp = sumRows(entry.data.expenditure);
    return acc + (rev - exp);
  }, 0n);

  return {
    quarter: `${latest.year} Q${latest.quarters.join("/")}`,
    totalRevenue: totalRevenue.toString(),
    totalExpense: totalExpense.toString(),
    netIncome: netIncome.toString(),
    treasuryBalance: cumulativeNet.toString(),
    currency: "USD",
    source: "mainnet",
  };
}

export async function getJstBuybackStats() {
  const latest = latestEntry(TREASURY_MAINNET_DATA);
  const totalBurned = TREASURY_MAINNET_DATA.reduce((acc, entry) => acc + sumRows(entry.data.jstBuyback), 0n);
  const latestBatchAmount = sumRows(latest.data.jstBuyback);

  return {
    totalBurned: totalBurned.toString(),
    latestBatchAmount: latestBatchAmount.toString(),
    latestBatchDate: `${latest.year}-Q${Math.max(...latest.quarters)}`,
    source: "mainnet",
  };
}
