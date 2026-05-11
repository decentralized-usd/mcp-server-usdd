import { ERC20_ABI } from "../abis.js";
import { getNetworkConfig } from "../chains.js";
import { assertTronModeConfirmed, getConfiguredWallet } from "./wallet.js";
import { type NetworkKey } from "../chains.js";
import { getProxyAddress, readContract, writeContract } from "./contracts.js";
import { utils } from "./utils.js";

const MAX_UINT256 = (2n ** 256n - 1n).toString();

async function assertProtocolSpender(network: NetworkKey, spender: string) {
  const config = getNetworkConfig(network);
  const allowed = new Set<string>();
  const normalize = (value: string) => utils.normalizeAddress(value, network);

  allowed.add(normalize(config.usddJoin));
  allowed.add(normalize(config.proxyRegistry));
  allowed.add(normalize(config.proxyActions));
  if (config.proxyActionsProxy) allowed.add(normalize(config.proxyActionsProxy));

  Object.values(config.ilks).forEach((ilk) => {
    allowed.add(normalize(ilk.join));
  });

  Object.values(config.psmMarkets).forEach((market) => {
    allowed.add(normalize(market.psm));
    allowed.add(normalize(market.gemJoin));
  });

  if (config.savings) {
    allowed.add(normalize(config.savings.susdd));
  }

  const proxy = await getProxyAddress(network, false);
  if (proxy) allowed.add(normalize(proxy));

  const normalizedSpender = normalize(spender);
  if (!allowed.has(normalizedSpender)) {
    throw new Error(`Spender ${spender} is not an approved protocol contract on ${network}.`);
  }
}

export async function approveToken(params: {
  network: NetworkKey;
  token: string;
  spender: string;
  amount: string;
  decimals?: number;
}) {
  const decimals = params.decimals ?? Number(await readContract({
    network: params.network,
    address: params.token,
    abi: ERC20_ABI,
    functionName: "decimals",
  }));
  await assertProtocolSpender(params.network, params.spender);
  const raw = params.amount === "max" ? BigInt(MAX_UINT256) : utils.parseUnits(params.amount, decimals);
  const result = await writeContract({
    network: params.network,
    address: params.token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [params.spender, raw],
  });
  return {
    ...result,
    token: params.token,
    spender: params.spender,
    amount: params.amount,
    amountRaw: raw.toString(),
    message: `Approved ${params.amount} for spender ${params.spender}.`,
  };
}

export async function getTokenBalance(params: {
  network: NetworkKey;
  token: string;
  owner?: string;
  decimals?: number;
}) {
  const localOwner = getConfiguredWallet(params.network).address;
  const owner = params.owner || localOwner;
  if (owner === localOwner) assertTronModeConfirmed(params.network);
  const [decimalsRaw, balanceRaw, symbol, name] = await Promise.all([
    params.decimals ?? Number(await readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "decimals",
    })),
    readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [owner],
    }),
    readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
    readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "name",
    }),
  ]);

  const decimals = Number(decimalsRaw);
  const balance = BigInt(balanceRaw.toString());
  return {
    network: params.network,
    token: params.token,
    owner,
    symbol: String(symbol),
    name: String(name),
    decimals,
    balanceRaw: balance.toString(),
    balance: utils.formatUnits(balance, decimals),
  };
}

export async function checkAllowance(params: {
  network: NetworkKey;
  token: string;
  spender: string;
  owner?: string;
  amount?: string;
  decimals?: number;
}) {
  const localOwner = getConfiguredWallet(params.network).address;
  const owner = params.owner || localOwner;
  if (owner === localOwner) assertTronModeConfirmed(params.network);
  const [decimalsRaw, allowanceRaw, symbol, name] = await Promise.all([
    params.decimals ?? Number(await readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "decimals",
    })),
    readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, params.spender],
    }),
    readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "symbol",
    }),
    readContract({
      network: params.network,
      address: params.token,
      abi: ERC20_ABI,
      functionName: "name",
    }),
  ]);

  const decimals = Number(decimalsRaw);
  const allowance = BigInt(allowanceRaw.toString());
  const requiredRaw = params.amount ? utils.parseUnits(params.amount, decimals) : null;
  return {
    network: params.network,
    token: params.token,
    owner,
    spender: params.spender,
    symbol: String(symbol),
    name: String(name),
    decimals,
    allowanceRaw: allowance.toString(),
    allowance: utils.formatUnits(allowance, decimals),
    requiredAmount: params.amount || null,
    requiredRaw: requiredRaw?.toString() || null,
    isSufficient: requiredRaw === null ? null : allowance >= requiredRaw,
  };
}
