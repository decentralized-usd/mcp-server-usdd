import { type NetworkKey } from "../chains.js";
import { getPublicClient } from "./clients.js";

type Block = any;

/**
 * Get a block by its number.
 */
export async function getBlockByNumber(blockNumber: number, network: NetworkKey = "tron"): Promise<Block> {
  const tronWeb = getPublicClient(network) as any;
  return tronWeb.trx.getBlock(blockNumber);
}

/**
 * Get a block by its hash.
 */
export async function getBlockByHash(blockHash: string, network: NetworkKey = "tron"): Promise<Block> {
  const tronWeb = getPublicClient(network) as any;
  return tronWeb.trx.getBlock(blockHash);
}

/**
 * Get the most recently confirmed block.
 */
export async function getLatestBlock(network: NetworkKey = "tron"): Promise<Block> {
  const tronWeb = getPublicClient(network) as any;
  return tronWeb.trx.getCurrentBlock();
}

/**
 * Get the current block number.
 */
export async function getBlockNumber(network: NetworkKey = "tron"): Promise<number> {
  const block = await getLatestBlock(network);
  return (block as any).block_header.raw_data.number;
}

/**
 * Get the chain ID for a given network.
 * TRON does not use EVM chain IDs natively; known IDs are returned for convenience.
 */
export async function getChainId(network: NetworkKey = "tron"): Promise<number> {
  if (network === "tron") return 728126428;
  return 0;
}
