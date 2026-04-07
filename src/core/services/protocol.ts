import { DOG_ABI, DSR_POT_ABI, OSM_ABI, PSM_ABI, SPOT_ABI, SUSDD_ABI, VAT_ABI } from "../abis.js";
import { getIlkConfig, getNetworkConfig, getSupportedIlks, getSupportedPsmMarkets, type NetworkKey } from "../chains.js";
import { readContract } from "./contracts.js";
import { getConfiguredWallet } from "./wallet.js";
import { utils } from "./utils.js";

interface HighestPriceResponse {
  code: number;
  data?: Record<string, number | string>;
  message?: string;
}

const HIGHEST_PRICE_PATH = "/liquid/highestprice";

async function readOraclePriceSnapshot(network: NetworkKey, pip: string) {
  const [peek, peep, pass, hop] = await Promise.all([
    readContract({ network, address: pip, abi: OSM_ABI, functionName: "peek" }),
    readContract({ network, address: pip, abi: OSM_ABI, functionName: "peep" }),
    readContract({ network, address: pip, abi: OSM_ABI, functionName: "pass" }),
    readContract({ network, address: pip, abi: OSM_ABI, functionName: "hop" }),
  ]) as any[];

  const currentRaw = utils.decodeBytes32Number(peek[0] ?? peek.value0);
  const nextRaw = utils.decodeBytes32Number(peep[0] ?? peep.value0);

  return {
    address: pip,
    decimals: 18,
    current: {
      valueRaw: currentRaw.toString(),
      value: utils.formatUnits(currentRaw, 18),
      valid: Boolean(peek[1] ?? peek.value1),
    },
    next: {
      valueRaw: nextRaw.toString(),
      value: utils.formatUnits(nextRaw, 18),
      valid: Boolean(peep[1] ?? peep.value1),
    },
    pass: Boolean(pass.ok ?? pass),
    hopSeconds: Number(hop),
  };
}

function inferPriceFeedKey(ilk: string) {
  const normalized = ilk.trim().toUpperCase();
  if (normalized.startsWith("TRX-")) return "trx";
  if (normalized.startsWith("STRX-")) return "strx";
  if (normalized.startsWith("USDT-") || normalized === "PSM-USDT") return "usdt";
  if (normalized.startsWith("USDD-") || normalized === "USDD") return "usdd";
  return null;
}

async function readHighestPrice(network: NetworkKey, assetKey: string) {
  const config = getNetworkConfig(network);
  const endpoint = new URL(HIGHEST_PRICE_PATH, config.serviceApiUrl).toString();
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Price API request failed: ${message}`);
  }

  if (!response.ok) {
    throw new Error(`Price API request failed with ${response.status} ${response.statusText}.`);
  }

  const payload = await response.json() as HighestPriceResponse;
  if (payload.code !== 0 || !payload.data) {
    throw new Error(payload.message || "Price API returned an unexpected response.");
  }

  const rawValue = payload.data[assetKey];
  if (rawValue === undefined || rawValue === null) {
    throw new Error(`Price API does not provide an entry for asset key '${assetKey}'.`);
  }

  const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`Price API returned a non-numeric value for asset key '${assetKey}'.`);
  }

  const valueRaw = utils.parseUnits(numericValue.toString(), 18);
  return {
    sourceType: "http-highestprice",
    endpoint,
    assetKey,
    decimals: 18,
    current: {
      valueRaw: valueRaw.toString(),
      value: utils.formatUnits(valueRaw, 18),
      valid: true,
    },
    next: null,
    pass: null,
    hopSeconds: null,
  };
}

export async function getProtocolOverview(network: NetworkKey) {
  const config = getNetworkConfig(network);
  const [vatLine, protocolDebt, dogHole] = await Promise.all([
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "Line" }),
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "debt" }),
    readContract({ network, address: config.dog, abi: DOG_ABI, functionName: "Hole" }),
  ]);

  return {
    network,
    kind: config.kind,
    label: config.label,
    addresses: {
      proxyRegistry: config.proxyRegistry,
      proxyActions: config.proxyActions,
      cdpManager: config.cdpManager,
      vat: config.vat,
      jug: config.jug,
      dog: config.dog,
      spot: config.spot,
      usdd: config.usdd,
      usddJoin: config.usddJoin,
    },
    metrics: {
      debtCeilingUSDD: utils.formatUnits(BigInt(vatLine.toString()) / utils.RAY, 18),
      totalDebtUSDD: utils.formatUnits(BigInt(protocolDebt.toString()) / utils.RAY, 18),
      liquidationCapacityUSDD: utils.formatUnits(BigInt(dogHole.toString()) / utils.RAY, 18),
    },
    ilks: getSupportedIlks(network),
    psmMarkets: getSupportedPsmMarkets(network),
  };
}

export async function getOracleStatus(network: NetworkKey, ilk: string) {
  const config = getNetworkConfig(network);
  const ilkConfig = getIlkConfig(ilk, network);
  const ilkBytes = utils.toBytes32(ilkConfig.key);
  const [spotter, dog] = await Promise.all([
    readContract({ network, address: config.spot, abi: SPOT_ABI, functionName: "ilks", args: [ilkBytes] }),
    readContract({ network, address: config.dog, abi: DOG_ABI, functionName: "ilks", args: [ilkBytes] }),
  ]) as any[];
  const pip = spotter[0] ?? spotter.pip;
  const mat = BigInt(spotter[1] ?? spotter.mat ?? 0);
  const chop = BigInt(dog[1] ?? dog.chop ?? 0);

  let osm = null;
  if (pip && pip !== "0x0000000000000000000000000000000000000000") {
    try {
      osm = await readOraclePriceSnapshot(network, pip);
    } catch {
      osm = { address: pip, note: "Configured pip does not expose standard OSM methods." };
    }
  }

  return {
    network,
    ilk: ilkConfig.key,
    liquidationRatioPercent: Number(mat) / 1e27 * 100,
    liquidationPenaltyPercent: Number(chop) / 1e18 * 100 - 100,
    osm,
  };
}

export async function getVaultPrice(network: NetworkKey, ilk: string) {
  const config = getNetworkConfig(network);
  const ilkConfig = getIlkConfig(ilk, network);
  const ilkBytes = utils.toBytes32(ilkConfig.key);
  const spotter = await readContract({
    network,
    address: config.spot,
    abi: SPOT_ABI,
    functionName: "ilks",
    args: [ilkBytes],
  }) as any;

  const pip = spotter[0] ?? spotter.pip;
  if (!pip) {
    throw new Error(`No oracle configured for ${ilkConfig.key} on ${network}.`);
  }

  const priceFeedKey = ilkConfig.priceFeedKey || inferPriceFeedKey(ilkConfig.key);
  if (!priceFeedKey) {
    throw new Error(`No price feed key is configured for ${ilkConfig.key} on ${network}.`);
  }

  const oracle = await readHighestPrice(network, priceFeedKey);
  return {
    network,
    ilk: ilkConfig.key,
    kind: ilkConfig.kind,
    oracle: {
      address: pip,
      ...oracle,
    },
  };
}

export async function getPsmStatus(network: NetworkKey, market: string) {
  const psm = getSupportedPsmMarkets(network).find((item) => item.key.toUpperCase() === market.toUpperCase() || item.label.toUpperCase() === market.toUpperCase());
  if (!psm) throw new Error(`Unknown PSM market: ${market}`);

  const [sellEnabled, buyEnabled, tin, tout, ilk] = await Promise.all([
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "sellEnabled" }),
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "buyEnabled" }),
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "tin" }),
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "tout" }),
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "ilk" }),
  ]);

  return {
    network,
    market: psm,
    sellEnabled: BigInt(sellEnabled.toString()) === 1n,
    buyEnabled: BigInt(buyEnabled.toString()) === 1n,
    feeInPercent: Number(BigInt(tin.toString())) / 1e16,
    feeOutPercent: Number(BigInt(tout.toString())) / 1e16,
    ilk: utils.bytes32ToString(String(ilk)),
  };
}

export async function getSavingsStatus(network: NetworkKey) {
  const config = getNetworkConfig(network);
  if (!config.savings) {
    return { network, supported: false, message: "Savings module is not configured on this network." };
  }

  const wallet = getConfiguredWallet(network);
  const [chi, dsr, pie, totalAssets, totalSupply, walletShares] = await Promise.all([
    readContract({ network, address: config.savings.pot, abi: DSR_POT_ABI, functionName: "chi" }),
    readContract({ network, address: config.savings.pot, abi: DSR_POT_ABI, functionName: "dsr" }),
    readContract({ network, address: config.savings.pot, abi: DSR_POT_ABI, functionName: "pie", args: [wallet.address] }),
    readContract({ network, address: config.savings.susdd, abi: SUSDD_ABI, functionName: "totalAssets" }),
    readContract({ network, address: config.savings.susdd, abi: SUSDD_ABI, functionName: "totalSupply" }),
    readContract({ network, address: config.savings.susdd, abi: SUSDD_ABI, functionName: "balanceOf", args: [wallet.address] }),
  ]);

  return {
    network,
    supported: true,
    savings: config.savings,
    metrics: {
      chi: chi.toString(),
      dsrRaw: dsr.toString(),
      dsrApproxPercent: (utils.rayToFloat(dsr.toString()) - 1) * 100,
      totalAssetsUSDD: utils.formatUnits(BigInt(totalAssets.toString()), 18),
      totalShares: utils.formatUnits(BigInt(totalSupply.toString()), 18),
      walletPie: utils.formatUnits(BigInt(pie.toString()), 18),
      walletShares: utils.formatUnits(BigInt(walletShares.toString()), 18),
    },
  };
}
