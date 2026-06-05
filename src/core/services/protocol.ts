import { DOG_ABI, DSR_POT_ABI, ERC20_ABI, OSM_ABI, PSM_ABI, SPOT_ABI, SUSDD_ABI, VAT_ABI } from "../abis.js";
import { getIlkConfig, getNetworkConfig, getSupportedIlks, getSupportedPsmMarkets, type NetworkKey } from "../chains.js";
import { getChainlogAddresses } from "./chainlog.js";
import { readContract } from "./contracts.js";
import { getConfiguredWallet } from "./wallet.js";
import { utils } from "./utils.js";


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


export async function getProtocolOverview(network: NetworkKey) {
  const config = getNetworkConfig(network);
  const ilkList = getSupportedIlks(network);

  const [vatLine, protocolDebt, dogHole, ...ilkResults] = await Promise.all([
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "Line" }),
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "debt" }),
    readContract({ network, address: config.dog, abi: DOG_ABI, functionName: "Hole" }),
    ...ilkList.map((ilk) =>
      readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "ilks", args: [utils.toBytes32(ilk.key)] })
    ),
  ]);

  const ilksWithDust = ilkList.map((ilk, i) => {
    const ilkData = ilkResults[i] as any;
    const dust = BigInt((ilkData[4] ?? ilkData.dust ?? 0).toString());
    return {
      ...ilk,
      dustUSDD: utils.formatUnits(dust / utils.RAY, 18),
    };
  });

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
    ilks: ilksWithDust,
    psmMarkets: getSupportedPsmMarkets(network),
  };
}

const CORE_CHAINLOG_KEYS = {
  proxyRegistry: "PROXY_REGISTRY",
  proxyActions: "PROXY_ACTIONS",
  proxyActionsProxy: "GOV_ACTIONS_PROXY",
  cdpManager: "CDP_MANAGER",
  vat: "MCD_VAT",
  jug: "MCD_JUG",
  dog: "MCD_DOG",
  spot: "MCD_SPOT",
  usdd: "MCD_USDD",
  usddJoin: "MCD_JOIN_USDD",
  multicall: "MULTICALL",
  susdd: "SUSDD",
  pot: "MCD_POT",
} as const;

function ilkJoinKey(ilk: string) {
  return `MCD_JOIN_${ilk.replace(/-/g, "_")}`;
}

function assetKeyFromIlk(ilk: string) {
  const asset = ilk.split("-")[0]?.toUpperCase() || ilk.toUpperCase();
  if (asset === "TRX") return "WTRX";
  if (asset === "ETH") return "WETH";
  if (asset === "BNB") return "WBNB";
  return asset;
}

function psmAsset(market: string) {
  return market.toUpperCase().replace(/^PSM-/, "");
}

function psmSuffix(market: string) {
  return `${psmAsset(market)}_A`;
}

function psmJoinKey(market: string) {
  return `MCD_JOIN_PSM_${psmSuffix(market)}`;
}

function psmAddressKey(market: string) {
  return `MCD_PSM_${psmSuffix(market)}`;
}

function protocolAddressKeys(network: NetworkKey) {
  const keys = new Set<string>(Object.values(CORE_CHAINLOG_KEYS));
  for (const ilk of getSupportedIlks(network)) {
    keys.add(ilkJoinKey(ilk.key));
    keys.add(assetKeyFromIlk(ilk.key));
  }
  for (const market of getSupportedPsmMarkets(network)) {
    keys.add(psmJoinKey(market.key));
    keys.add(psmAddressKey(market.key));
    keys.add(psmAsset(market.key));
  }
  return Array.from(keys);
}

function value(addresses: Record<string, string>, key: string) {
  return addresses[key];
}

function addressMap(addresses: Record<string, string>) {
  const savings = value(addresses, CORE_CHAINLOG_KEYS.susdd) || value(addresses, CORE_CHAINLOG_KEYS.pot)
    ? {
        susdd: value(addresses, CORE_CHAINLOG_KEYS.susdd),
        pot: value(addresses, CORE_CHAINLOG_KEYS.pot),
      }
    : undefined;

  return {
    proxyRegistry: value(addresses, CORE_CHAINLOG_KEYS.proxyRegistry),
    proxyActions: value(addresses, CORE_CHAINLOG_KEYS.proxyActions),
    proxyActionsProxy: value(addresses, CORE_CHAINLOG_KEYS.proxyActionsProxy),
    cdpManager: value(addresses, CORE_CHAINLOG_KEYS.cdpManager),
    vat: value(addresses, CORE_CHAINLOG_KEYS.vat),
    jug: value(addresses, CORE_CHAINLOG_KEYS.jug),
    dog: value(addresses, CORE_CHAINLOG_KEYS.dog),
    spot: value(addresses, CORE_CHAINLOG_KEYS.spot),
    usdd: value(addresses, CORE_CHAINLOG_KEYS.usdd),
    usddJoin: value(addresses, CORE_CHAINLOG_KEYS.usddJoin),
    multicall: value(addresses, CORE_CHAINLOG_KEYS.multicall),
    savings,
  };
}

export async function getProtocolAddresses(network: NetworkKey, options: { refresh?: boolean } = {}) {
  const config = getNetworkConfig(network);
  const snapshot = await getChainlogAddresses(network, protocolAddressKeys(network), options);
  const addresses = snapshot.addresses;

  return {
    network,
    kind: config.kind,
    label: config.label,
    addressSource: {
      type: snapshot.source,
      logAddress: snapshot.logAddress,
      cached: snapshot.cached,
      stale: snapshot.stale,
      lastVerifiedAt: snapshot.lastVerifiedAt,
      cacheExpiresAt: snapshot.cacheExpiresAt,
      version: snapshot.version,
      warning: snapshot.warning,
      missingKeys: snapshot.missingKeys,
    },
    addresses: addressMap(addresses),
    ilks: getSupportedIlks(network).map((ilk) => ({
      ...ilk,
      join: value(addresses, ilkJoinKey(ilk.key)),
      gem: value(addresses, assetKeyFromIlk(ilk.key)),
      chainlogKeys: {
        join: ilkJoinKey(ilk.key),
        gem: assetKeyFromIlk(ilk.key),
      },
    })),
    psmMarkets: getSupportedPsmMarkets(network).map((market) => ({
      ...market,
      psm: value(addresses, psmAddressKey(market.key)),
      gemJoin: value(addresses, psmJoinKey(market.key)),
      gem: value(addresses, psmAsset(market.key)),
      chainlogKeys: {
        psm: psmAddressKey(market.key),
        gemJoin: psmJoinKey(market.key),
        gem: psmAsset(market.key),
      },
    })),
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

export async function getPsmMetrics(network: NetworkKey, market: string) {
  const psm = getSupportedPsmMarkets(network).find((item) => item.key.toUpperCase() === market.toUpperCase() || item.label.toUpperCase() === market.toUpperCase());
  if (!psm) throw new Error(`Unknown PSM market: ${market}`);

  const config = getNetworkConfig(network);
  const [sellEnabled, buyEnabled, tin, tout, gemSymbolRaw, usddSymbolRaw] = await Promise.all([
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "sellEnabled" }),
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "buyEnabled" }),
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "tin" }),
    readContract({ network, address: psm.psm, abi: PSM_ABI, functionName: "tout" }),
    readContract({ network, address: psm.gem, abi: ERC20_ABI, functionName: "symbol" }).catch(() => psm.label.replace("PSM ", "")),
    readContract({ network, address: config.usdd, abi: ERC20_ABI, functionName: "symbol" }).catch(() => "USDD"),
  ]);

  const gemSymbol = String(gemSymbolRaw);
  const usddSymbol = String(usddSymbolRaw);
  const feeInPercent = Number(BigInt(tin.toString())) / 1e16;
  const feeOutPercent = Number(BigInt(tout.toString())) / 1e16;

  return {
    network,
    market: psm.key,
    address: psm.psm,
    routes: [
      {
        fromToken: gemSymbol,
        toToken: usddSymbol,
        available: BigInt(sellEnabled.toString()) === 1n,
        fee: `${feeInPercent}%`,
        feePercent: feeInPercent,
      },
      {
        fromToken: usddSymbol,
        toToken: gemSymbol,
        available: BigInt(buyEnabled.toString()) === 1n,
        fee: `${feeOutPercent}%`,
        feePercent: feeOutPercent,
      },
    ],
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
