import { PSM_ABI } from "../abis.js";
import { getNetworkConfig, getPsmMarketConfig, type NetworkKey } from "../chains.js";
import { readContract, writeContract } from "./contracts.js";
import { getConfiguredWallet } from "./wallet.js";
import { utils } from "./utils.js";

export async function sellGemForUsdd(network: NetworkKey, market: string, amount: string) {
  const psm = getPsmMarketConfig(market, network);
  const wallet = getConfiguredWallet(network);
  const raw = utils.parseUnits(amount, psm.decimals);
  const sellEnabled = await readContract({
    network,
    address: psm.psm,
    abi: PSM_ABI,
    functionName: "sellEnabled",
  });
  if (BigInt(sellEnabled.toString()) !== 1n) {
    throw new Error(`${psm.key} sellGem is currently disabled on ${network}.`);
  }

  const result = await writeContract({
    network,
    address: psm.psm,
    abi: PSM_ABI,
    functionName: "sellGem",
    args: [wallet.address, raw],
  });
  return { ...result, message: `Swapped ${amount} ${psm.label.replace("PSM ", "")} into USDD via ${psm.key}.` };
}

export async function buyGemWithUsdd(network: NetworkKey, market: string, amount: string) {
  const psm = getPsmMarketConfig(market, network);
  const wallet = getConfiguredWallet(network);
  const raw = utils.parseUnits(amount, psm.decimals);
  const buyEnabled = await readContract({
    network,
    address: psm.psm,
    abi: PSM_ABI,
    functionName: "buyEnabled",
  });
  if (BigInt(buyEnabled.toString()) !== 1n) {
    throw new Error(`${psm.key} buyGem is currently disabled on ${network}.`);
  }

  const result = await writeContract({
    network,
    address: psm.psm,
    abi: PSM_ABI,
    functionName: "buyGem",
    args: [wallet.address, raw],
  });
  return { ...result, message: `Swapped USDD into ${amount} ${psm.label.replace("PSM ", "")} via ${psm.key}.` };
}
