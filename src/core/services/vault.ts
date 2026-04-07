import { CDP_MANAGER_ABI, DOG_ABI, DSS_PROXY_ACTIONS_ABI, ERC20_ABI, JUG_ABI, SPOT_ABI, VAT_ABI } from "../abis.js";
import { getIlkConfig, getNetworkConfig, type NetworkKey } from "../chains.js";
import { ensureProxy, executeProxyAction, getProxyAddress, readContract } from "./contracts.js";
import { approveToken } from "./tokens.js";
import { utils } from "./utils.js";
import { getConfiguredWallet } from "./wallet.js";

const CLOSE_VAULT_APPROVAL_BUFFER = utils.parseUnits("0.0001", 18);

function summarizeRisk(healthFactor: number): string {
  if (!Number.isFinite(healthFactor)) return "no-debt";
  if (healthFactor <= 1.05) return "critical";
  if (healthFactor <= 1.2) return "high";
  if (healthFactor <= 1.5) return "medium";
  return "healthy";
}

async function assertVaultOwnedByCurrentProxy(network: NetworkKey, cdpId: bigint) {
  const config = getNetworkConfig(network);
  const proxy = await getProxyAddress(network, false);
  if (!proxy) {
    throw new Error(`No DSProxy found for ${network}. Create a proxy before managing existing vaults.`);
  }

  const owner = await readContract({
    network,
    address: config.cdpManager,
    abi: CDP_MANAGER_ABI,
    functionName: "owns",
    args: [cdpId],
  });

  const normalizedOwner = utils.normalizeAddress(String(owner), network);
  const normalizedProxy = utils.normalizeAddress(proxy, network);
  if (normalizedOwner !== normalizedProxy) {
    throw new Error(`Vault ${cdpId} is not owned by the current wallet's DSProxy on ${network}.`);
  }

  return proxy;
}

async function getVaultPositionRaw(network: NetworkKey, cdpId: bigint) {
  const config = getNetworkConfig(network);
  const [owner, urnAddress, ilkRaw] = await Promise.all([
    readContract({ network, address: config.cdpManager, abi: CDP_MANAGER_ABI, functionName: "owns", args: [cdpId] }),
    readContract({ network, address: config.cdpManager, abi: CDP_MANAGER_ABI, functionName: "urns", args: [cdpId] }),
    readContract({ network, address: config.cdpManager, abi: CDP_MANAGER_ABI, functionName: "ilks", args: [cdpId] }),
  ]);

  const ilkName = utils.bytes32ToString(String(ilkRaw));
  const ilkConfig = getIlkConfig(ilkName, network);
  const ilkBytes = utils.toBytes32(ilkConfig.key);
  const [urn, ilk] = await Promise.all([
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "urns", args: [ilkBytes, urnAddress] }),
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "ilks", args: [ilkBytes] }),
  ]) as any[];

  const ink = BigInt((urn[0] ?? urn.ink ?? 0).toString());
  const art = BigInt((urn[1] ?? urn.art ?? 0).toString());
  const rate = BigInt((ilk[1] ?? ilk.rate ?? 0).toString());
  const debtWad = art * rate / utils.RAY;

  return {
    owner: String(owner),
    urnAddress: String(urnAddress),
    ilkConfig,
    ink,
    art,
    rate,
    debtWad,
  };
}

async function ensureUsddApprovalToProxy(network: NetworkKey, requiredRaw: bigint, proxy: string) {
  const config = getNetworkConfig(network);
  const wallet = getConfiguredWallet(network);
  const allowance = BigInt((await readContract({
    network,
    address: config.usdd,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [wallet.address, proxy],
  })).toString());

  if (allowance >= requiredRaw) {
    return { approved: false, allowanceRaw: allowance.toString(), requiredRaw: requiredRaw.toString() };
  }

  const approveAmountRaw = requiredRaw - allowance;
  const approval = await approveToken({
    network,
    token: config.usdd,
    spender: proxy,
    amount: utils.formatUnits(approveAmountRaw, 18),
    decimals: 18,
  });

  return {
    approved: true,
    allowanceRaw: allowance.toString(),
    requiredRaw: requiredRaw.toString(),
    approval,
  };
}

export async function getUserVaultIds(network: NetworkKey, address?: string): Promise<bigint[]> {
  const config = getNetworkConfig(network);
  const owner = address || await getProxyAddress(network, false);
  if (!owner) return [];
  const count = BigInt((await readContract({ network, address: config.cdpManager, abi: CDP_MANAGER_ABI, functionName: "count", args: [owner] })).toString());
  const first = BigInt((await readContract({ network, address: config.cdpManager, abi: CDP_MANAGER_ABI, functionName: "first", args: [owner] })).toString());

  if (count === 0n || first === 0n) return [];
  const ids: bigint[] = [];
  let current = first;
  while (current !== 0n && ids.length < Number(count)) {
    ids.push(current);
    const list = await readContract({ network, address: config.cdpManager, abi: CDP_MANAGER_ABI, functionName: "list", args: [current] }) as any;
    current = BigInt((list[1] ?? list.next ?? 0).toString());
  }
  return ids;
}

export async function getVaultSummary(network: NetworkKey, cdpId: bigint) {
  const config = getNetworkConfig(network);
  const { owner, urnAddress, ilkConfig, ink, art, rate, debtWad } = await getVaultPositionRaw(network, cdpId);
  const ilkBytes = utils.toBytes32(ilkConfig.key);

  const [ilk, jugIlk, spotIlk, dogIlk, walletUsdd] = await Promise.all([
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "ilks", args: [ilkBytes] }),
    readContract({ network, address: config.jug, abi: JUG_ABI, functionName: "ilks", args: [ilkBytes] }),
    readContract({ network, address: config.spot, abi: SPOT_ABI, functionName: "ilks", args: [ilkBytes] }),
    readContract({ network, address: config.dog, abi: DOG_ABI, functionName: "ilks", args: [ilkBytes] }),
    readContract({ network, address: config.vat, abi: VAT_ABI, functionName: "usdd", args: [owner] }),
  ]) as any[];

  const spot = BigInt((ilk[2] ?? ilk.spot ?? 0).toString());
  const line = BigInt((ilk[3] ?? ilk.line ?? 0).toString());
  const dust = BigInt((ilk[4] ?? ilk.dust ?? 0).toString());
  const duty = BigInt((jugIlk[0] ?? jugIlk.duty ?? 0).toString());
  const mat = BigInt((spotIlk[1] ?? spotIlk.mat ?? 0).toString());
  const chop = BigInt((dogIlk[1] ?? dogIlk.chop ?? 0).toString());
  const maxDebtWad = ink * spot / utils.RAY;
  const healthFactor = debtWad === 0n ? Number.POSITIVE_INFINITY : Number(maxDebtWad) / Number(debtWad);

  return {
    network,
    cdpId: cdpId.toString(),
    owner,
    proxyAddress: owner,
    urnAddress,
    ilk: ilkConfig,
    collateralAmount: utils.formatUnits(ink, 18),
    collateralAmountRaw: ink.toString(),
    collateralDisplayDecimals: 18,
    collateralActionDecimals: ilkConfig.decimals,
    normalizedDebt: utils.formatUnits(art, 18),
    debtAmount: utils.formatUnits(debtWad, 18),
    walletUsddBalance: utils.formatUnits(BigInt(walletUsdd.toString()) / utils.RAY, 18),
    proxyUsddBalance: utils.formatUnits(BigInt(walletUsdd.toString()) / utils.RAY, 18),
    debtCeiling: utils.formatUnits(line / utils.RAY, 18),
    debtFloor: utils.formatUnits(dust / utils.RAY, 18),
    maxDebtBeforeLiquidation: utils.formatUnits(maxDebtWad, 18),
    liquidationRatioPercent: Number(mat) / 1e27 * 100,
    stabilityFeePercent: (utils.rayToFloat(duty.toString()) - 1) * 100,
    liquidationPenaltyPercent: Number(chop) / 1e18 * 100 - 100,
    healthFactor: Number.isFinite(healthFactor) ? Number(healthFactor.toFixed(4)) : null,
    riskLevel: summarizeRisk(healthFactor),
  };
}

export async function analyzeVaultRisk(network: NetworkKey, cdpId: bigint) {
  const summary = await getVaultSummary(network, cdpId);
  const warnings: string[] = [];
  if (summary.riskLevel === "critical") warnings.push("Vault is within liquidation danger range.");
  if (summary.riskLevel === "high") warnings.push("Vault is close to liquidation threshold; reduce debt or add collateral.");
  if (summary.riskLevel === "medium") warnings.push("Vault is serviceable but should be monitored for oracle moves.");
  if (summary.riskLevel === "healthy") warnings.push("Vault currently has a reasonable collateral buffer.");
  return { ...summary, warnings };
}

export async function openVault(network: NetworkKey, ilk: string) {
  const config = getNetworkConfig(network);
  const proxy = await ensureProxy(network);
  const ilkConfig = getIlkConfig(ilk, network);
  const result = await executeProxyAction({
    network,
    target: config.proxyActions,
    targetAbi: DSS_PROXY_ACTIONS_ABI,
    functionName: "open",
    args: [config.cdpManager, utils.toBytes32(ilkConfig.key), proxy],
  });
  return { ...result, message: `Opened vault for ${ilkConfig.key}. Query get_user_vaults to discover the new CDP id.` };
}

export async function depositAndMint(params: {
  network: NetworkKey;
  ilk: string;
  cdpId?: bigint;
  collateralAmount: string;
  drawAmount: string;
  transferFrom?: boolean;
}) {
  const config = getNetworkConfig(params.network);
  const ilkConfig = getIlkConfig(params.ilk, params.network);
  const collateral = utils.parseUnits(params.collateralAmount, ilkConfig.decimals);
  const draw = utils.parseUnits(params.drawAmount, 18);

  if (!params.cdpId) {
    const fn = ilkConfig.kind === "native" ? "openLockTRXAndDraw" : "openLockGemAndDraw";
    const args = ilkConfig.kind === "native"
      ? [config.cdpManager, config.jug, ilkConfig.join, config.usddJoin, utils.toBytes32(ilkConfig.key), draw]
      : [config.cdpManager, config.jug, ilkConfig.join, config.usddJoin, utils.toBytes32(ilkConfig.key), collateral, draw, params.transferFrom ?? true];
    const result = await executeProxyAction({
      network: params.network,
      target: config.proxyActions,
      targetAbi: DSS_PROXY_ACTIONS_ABI,
      functionName: fn,
      args,
      value: ilkConfig.kind === "native" ? collateral : undefined,
    });
    return { ...result, message: `Opened and funded ${ilkConfig.key} vault with ${params.collateralAmount} collateral and ${params.drawAmount} USDD debt.` };
  }

  await assertVaultOwnedByCurrentProxy(params.network, params.cdpId);
  const fn = ilkConfig.kind === "native" ? "lockTRXAndDraw" : "lockGemAndDraw";
  const args = ilkConfig.kind === "native"
    ? [config.cdpManager, config.jug, ilkConfig.join, config.usddJoin, params.cdpId, draw]
    : [config.cdpManager, config.jug, ilkConfig.join, config.usddJoin, params.cdpId, collateral, draw, params.transferFrom ?? true];
  const result = await executeProxyAction({
    network: params.network,
    target: config.proxyActions,
    targetAbi: DSS_PROXY_ACTIONS_ABI,
    functionName: fn,
    args,
    value: ilkConfig.kind === "native" ? collateral : undefined,
  });
  return { ...result, message: `Added ${params.collateralAmount} collateral and minted ${params.drawAmount} USDD from vault ${params.cdpId}.` };
}

export async function drawUsdd(network: NetworkKey, cdpId: bigint, amount: string) {
  const config = getNetworkConfig(network);
  await assertVaultOwnedByCurrentProxy(network, cdpId);
  const raw = utils.parseUnits(amount, 18);
  const result = await executeProxyAction({
    network,
    target: config.proxyActions,
    targetAbi: DSS_PROXY_ACTIONS_ABI,
    functionName: "draw",
    args: [config.cdpManager, config.jug, config.usddJoin, cdpId, raw],
  });
  return { ...result, message: `Drew ${amount} USDD from vault ${cdpId}.` };
}

export async function repayUsdd(network: NetworkKey, cdpId: bigint, amount: string) {
  const config = getNetworkConfig(network);
  const proxy = await assertVaultOwnedByCurrentProxy(network, cdpId);
  const raw = utils.parseUnits(amount, 18);
  const approval = await ensureUsddApprovalToProxy(network, raw, proxy);
  const result = await executeProxyAction({
    network,
    target: config.proxyActions,
    targetAbi: DSS_PROXY_ACTIONS_ABI,
    functionName: "safeWipe",
    args: [config.cdpManager, config.usddJoin, cdpId, raw, proxy],
  });
  return {
    ...result,
    approval,
    message: `Repaid ${amount} USDD to vault ${cdpId}.`,
  };
}

export async function withdrawCollateral(network: NetworkKey, cdpId: bigint, ilk: string, amount: string) {
  const config = getNetworkConfig(network);
  await assertVaultOwnedByCurrentProxy(network, cdpId);
  const ilkConfig = getIlkConfig(ilk, network);
  const raw = utils.parseUnits(amount, ilkConfig.decimals);
  const fn = ilkConfig.kind === "native" ? "freeTRX" : "freeGem";
  const args = ilkConfig.kind === "native"
    ? [config.cdpManager, ilkConfig.join, cdpId, raw]
    : [config.cdpManager, ilkConfig.join, cdpId, raw];
  const result = await executeProxyAction({
    network,
    target: config.proxyActions,
    targetAbi: DSS_PROXY_ACTIONS_ABI,
    functionName: fn,
    args,
  });
  return { ...result, message: `Withdrew ${amount} collateral from vault ${cdpId}.` };
}

export async function closeVault(network: NetworkKey, cdpId: bigint, ilk: string, amountToFree: string) {
  const config = getNetworkConfig(network);
  const proxy = await assertVaultOwnedByCurrentProxy(network, cdpId);
  const ilkConfig = getIlkConfig(ilk, network);
  const position = await getVaultPositionRaw(network, cdpId);
  const approval = await ensureUsddApprovalToProxy(network, position.debtWad + CLOSE_VAULT_APPROVAL_BUFFER, proxy);
  const collateralRaw = utils.parseUnits(amountToFree, ilkConfig.decimals);
  const repayResult = await executeProxyAction({
    network,
    target: config.proxyActions,
    targetAbi: DSS_PROXY_ACTIONS_ABI,
    functionName: "safeWipeAll",
    args: [config.cdpManager, config.usddJoin, cdpId, proxy],
  });

  let withdrawResult;
  try {
    withdrawResult = await executeProxyAction({
      network,
      target: config.proxyActions,
      targetAbi: DSS_PROXY_ACTIONS_ABI,
      functionName: ilkConfig.kind === "native" ? "freeTRX" : "freeGem",
      args: [config.cdpManager, ilkConfig.join, cdpId, collateralRaw],
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Vault debt was fully repaid in tx ${repayResult.txID}, but collateral withdrawal failed: ${detail}`);
  }

  return {
    txID: withdrawResult.txID,
    receipt: withdrawResult.receipt,
    repayTxID: repayResult.txID,
    repayReceipt: repayResult.receipt,
    withdrawTxID: withdrawResult.txID,
    withdrawReceipt: withdrawResult.receipt,
    approval,
    requestedAmountToFree: amountToFree,
    actualAmountToFree: utils.formatUnits(collateralRaw, ilkConfig.decimals),
    actualAmountToFreeRaw: collateralRaw.toString(),
    message: `Closed vault ${cdpId} by repaying all debt first and then freeing ${utils.formatUnits(collateralRaw, ilkConfig.decimals)} collateral.`,
  };
}
