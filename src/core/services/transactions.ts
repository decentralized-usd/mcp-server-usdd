import { type NetworkKey } from "../chains.js";
import { getPublicClient } from "./clients.js";

type Transaction = any;
type TransactionInfo = any;

/**
 * Get full transaction details by hash.
 */
export async function getTransaction(txHash: string, network: NetworkKey = "tron"): Promise<Transaction> {
  const tronWeb = getPublicClient(network) as any;
  return tronWeb.trx.getTransaction(txHash);
}

/**
 * Get transaction info (receipt) by hash.
 */
export async function getTransactionInfo(
  txHash: string,
  network: NetworkKey = "tron",
): Promise<TransactionInfo> {
  const tronWeb = getPublicClient(network) as any;
  return tronWeb.trx.getTransactionInfo(txHash);
}

/** Alias for tools expecting 'receipt'. */
export const getTransactionReceipt = getTransactionInfo;

/**
 * Poll until a transaction is confirmed and return its info.
 * Throws after maxAttempts * 2s.
 */
export async function waitForTransaction(
  txHash: string,
  network: NetworkKey = "tron",
): Promise<TransactionInfo> {
  const tronWeb = getPublicClient(network) as any;
  const maxAttempts = 30;
  const interval = 2000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const info = await tronWeb.trx.getTransactionInfo(txHash);
      if (info && info.id) return info;
    } catch {
      // not confirmed yet, keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Transaction ${txHash} not confirmed after ${maxAttempts * interval}ms`);
}
