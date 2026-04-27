import { type NetworkKey } from "../chains.js";
import { getNetworkConfig } from "../chains.js";
import { getPublicClient } from "./clients.js";
import { utils } from "./utils.js";
import { assertTronModeConfirmed, getConfiguredWallet } from "./wallet.js";

/**
 * Get TRX balance for an address.
 * Returns a rich object with wei (Sun), ether (TRX), formatted string, symbol, and decimals.
 */
export async function getTRXBalance(address: string, network: NetworkKey = "tron") {
  const tronWeb = getPublicClient(network) as any;
  const balanceSun = await tronWeb.trx.getBalance(address);
  const formatted = utils.formatUnits(BigInt(balanceSun), 6);

  return {
    wei: BigInt(balanceSun),
    ether: formatted,
    formatted,
    symbol: "TRX",
    decimals: 6,
  };
}

export async function getNativeBalance(params: {
  network: NetworkKey;
  owner?: string;
}) {
  const config = getNetworkConfig(params.network);
  if (!params.owner) assertTronModeConfirmed(params.network);
  const owner = params.owner || getConfiguredWallet(params.network).address;

  if (config.kind === "tron") {
    const tronWeb = getPublicClient(params.network) as any;
    const balanceSun = BigInt(await tronWeb.trx.getBalance(owner));
    return {
      network: params.network,
      owner,
      symbol: config.nativeSymbol,
      decimals: 6,
      balanceRaw: balanceSun.toString(),
      balance: utils.formatUnits(balanceSun, 6),
    };
  }

  const client = getPublicClient(params.network) as any;
  const balanceWei = BigInt(await client.getBalance({ address: owner }));
  return {
    network: params.network,
    owner,
    symbol: config.nativeSymbol,
    decimals: 18,
    balanceRaw: balanceWei.toString(),
    balance: utils.formatUnits(balanceWei, 18),
  };
}

/**
 * Get TRC20 token balance for an address.
 */
export async function getTRC20Balance(
  tokenAddress: string,
  walletAddress: string,
  network: NetworkKey = "tron",
) {
  const tronWeb = getPublicClient(network) as any;

  try {
    const contract = await tronWeb.contract().at(tokenAddress);
    const balance = await contract.methods.balanceOf(walletAddress).call();
    const decimals = await contract.methods.decimals().call();
    const symbol = await contract.methods.symbol().call();

    const balanceBigInt = BigInt(balance.toString());
    const divisor = BigInt(10) ** BigInt(decimals.toString());
    const formatted = (Number(balanceBigInt) / Number(divisor)).toString();

    return {
      raw: balanceBigInt,
      formatted,
      token: {
        symbol: String(symbol),
        decimals: Number(decimals),
        address: tokenAddress,
      },
    };
  } catch (error: any) {
    throw new Error(`Failed to get TRC20 balance: ${error.message}`);
  }
}

/**
 * Get TRC1155 token balance for a given token ID and owner address.
 */
export async function getTRC1155Balance(
  contractAddress: string,
  ownerAddress: string,
  tokenId: bigint,
  network: NetworkKey = "tron",
) {
  const tronWeb = getPublicClient(network) as any;

  try {
    const contract = await tronWeb.contract().at(contractAddress);
    const balance = await contract.methods.balanceOf(ownerAddress, tokenId.toString()).call();
    return BigInt(balance.toString());
  } catch (error: any) {
    throw new Error(`Failed to get TRC1155 balance: ${error.message}`);
  }
}
