import { ERC20_ABI } from "../abis.js";
import { type NetworkKey } from "../chains.js";
import { getWalletClient } from "./clients.js";
import { utils } from "./utils.js";

/**
 * Transfer TRX to an address.
 * @param amount - Amount in TRX (not Sun).
 */
export async function transferTRX(
  privateKey: string,
  to: string,
  amount: string,
  network: NetworkKey = "tron",
) {
  if (network !== "tron") {
    throw new Error("transferTRX currently supports only the tron network.");
  }

  void privateKey;
  const tronWeb = getWalletClient(network) as any;
  const walletAddress = tronWeb.defaultAddress.base58 as string;
  const amountSun = utils.parseUnits(amount, 6);

  const balanceSun = await tronWeb.trx.getBalance(walletAddress);
  if (BigInt(balanceSun) < BigInt(amountSun)) {
    throw new Error(
      `Insufficient TRX balance. Have ${utils.formatUnits(BigInt(balanceSun), 6)} TRX, need ${utils.formatUnits(amountSun, 6)} TRX.`,
    );
  }

  const tx = await tronWeb.trx.sendTransaction(to, amountSun.toString() as any);

  if ((tx as any).result === true && (tx as any).transaction) {
    return (tx as any).transaction.txID;
  }
  if ((tx as any).txID) {
    return (tx as any).txID;
  }
  throw new Error(`Transaction failed: ${JSON.stringify(tx)}`);
}

/**
 * Transfer TRC20 tokens.
 * @param amount - Raw token amount (accounting for decimals).
 */
export async function transferTRC20(
  tokenAddress: string,
  to: string,
  amount: string,
  privateKey: string,
  network: NetworkKey = "tron",
) {
  if (network !== "tron") {
    throw new Error("transferTRC20 currently supports only the tron network.");
  }

  void privateKey;
  const tronWeb = getWalletClient(network) as any;

  try {
    const contract = await tronWeb.contract().at(tokenAddress);

    // Check token balance before transfer
    const walletAddress = tronWeb.defaultAddress.base58 as string;
    const balance = BigInt(await contract.methods.balanceOf(walletAddress).call());
    if (balance < BigInt(amount)) {
      const symbol = await contract.methods.symbol().call();
      const decimals = Number(await contract.methods.decimals().call());
      const divisor = BigInt(10) ** BigInt(decimals);
      throw new Error(
        `Insufficient ${symbol} balance. Have ${(Number(balance) / Number(divisor)).toString()}, need ${(Number(BigInt(amount)) / Number(divisor)).toString()}`,
      );
    }

    const txId = await tronWeb.contract(ERC20_ABI as any, tokenAddress)
      .methods.transfer(to, amount)
      .send();

    const symbol = await contract.methods.symbol().call();
    const decimals = await contract.methods.decimals().call();

    const decimalsNum = Number(decimals);
    const divisor = BigInt(10) ** BigInt(decimalsNum);
    const formatted = (Number(BigInt(amount)) / Number(divisor)).toString();

    return {
      txHash: typeof txId === "string" ? txId : txId?.txID,
      amount: { raw: amount, formatted },
      token: { symbol: String(symbol), decimals: decimalsNum },
    };
  } catch (error: any) {
    throw new Error(`Failed to transfer TRC20: ${error.message}`);
  }
}

/**
 * Approve a spender to spend TRC20 tokens.
 * @param amount - Raw approval amount.
 */
export async function approveTRC20(
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  privateKey: string,
  network: NetworkKey = "tron",
) {
  if (network !== "tron") {
    throw new Error("approveTRC20 currently supports only the tron network.");
  }

  void privateKey;
  const tronWeb = getWalletClient(network) as any;

  try {
    const txId = await tronWeb.contract(ERC20_ABI as any, tokenAddress)
      .methods.approve(spenderAddress, amount)
      .send();
    return typeof txId === "string" ? txId : txId?.txID;
  } catch (error: any) {
    throw new Error(`Failed to approve TRC20: ${error.message}`);
  }
}
