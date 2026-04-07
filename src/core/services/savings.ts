import { SUSDD_ABI } from "../abis.js";
import { getNetworkConfig, type NetworkKey } from "../chains.js";
import { writeContract } from "./contracts.js";
import { getConfiguredWallet } from "./wallet.js";
import { utils } from "./utils.js";

export async function depositSavings(network: NetworkKey, amount: string) {
  const config = getNetworkConfig(network);
  if (!config.savings) throw new Error(`Savings is not configured for ${network}.`);
  const raw = utils.parseUnits(amount, 18);
  const wallet = getConfiguredWallet(network);
  const result = await writeContract({
    network,
    address: config.savings.susdd,
    abi: SUSDD_ABI,
    functionName: "deposit",
    args: [raw, wallet.address],
  });
  return { ...result, message: `Deposited ${amount} USDD into sUSDD on ${network}.` };
}

export async function withdrawSavings(network: NetworkKey, amount: string) {
  const config = getNetworkConfig(network);
  if (!config.savings) throw new Error(`Savings is not configured for ${network}.`);
  const raw = utils.parseUnits(amount, 18);
  const wallet = getConfiguredWallet(network);
  const result = await writeContract({
    network,
    address: config.savings.susdd,
    abi: SUSDD_ABI,
    functionName: "withdraw",
    args: [raw, wallet.address, wallet.address],
  });
  return { ...result, message: `Withdrew ${amount} USDD from sUSDD on ${network}.` };
}
