import { ERC20_ABI } from "../abis.js";
import { getNetworkConfig, type NetworkKey } from "../chains.js";
import { getPublicClient, getWalletClient } from "./clients.js";
import { writeContract } from "./contracts.js";
import { utils } from "./utils.js";
import { assertWalletReadyForWrite, getConfiguredWallet, getWalletAddress, signTransactionWithWallet } from "./wallet.js";

export interface TokenTransferPreview {
  network: NetworkKey;
  from: string;
  to: string;
  assetType: "native" | "token";
  amount: string;
  amountRaw: string;
  symbol: string;
  decimals: number;
  tokenAddress?: string;
  balance: string;
  balanceRaw: string;
}

function resolveTokenDecimalsFromConfig(network: NetworkKey, tokenAddress: string): number | undefined {
  const config = getNetworkConfig(network);
  const normalize = (value: string) => utils.normalizeAddress(value, network);
  const target = normalize(tokenAddress);

  if (normalize(config.usdd) === target) return 18;
  if (config.savings && normalize(config.savings.susdd) === target) return 18;

  for (const ilk of Object.values(config.ilks)) {
    if (ilk.gem && normalize(ilk.gem) === target) return ilk.decimals;
  }

  for (const market of Object.values(config.psmMarkets)) {
    if (normalize(market.gem) === target) return market.decimals;
  }

  return undefined;
}

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

export async function prepareTokenTransfer(params: {
  network: NetworkKey;
  to: string;
  amount: string;
  tokenAddress?: string;
  decimals?: number;
}): Promise<TokenTransferPreview> {
  const { network, to, amount, tokenAddress, decimals: decimalsOverride } = params;
  const config = getConfiguredWallet(network);
  const chain = getNetworkConfig(network);

  if (!amount || Number(amount) <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  if (chain.kind === "tron") {
    const tronWeb = getPublicClient(network) as any;
    if (tokenAddress) {
      const contract = await tronWeb.contract().at(tokenAddress);
      let decimals = decimalsOverride;
      if (decimals == null) {
        try {
          decimals = Number(await contract.methods.decimals().call());
        } catch {
          decimals = resolveTokenDecimalsFromConfig(network, tokenAddress);
        }
      }
      if (decimals == null) {
        throw new Error(
          "Unable to detect token decimals from contract/config. Please retry with explicit decimals in prepare_token_transfer.",
        );
      }
      let symbol = "TOKEN";
      try {
        symbol = String(await contract.methods.symbol().call());
      } catch {
        symbol = "TOKEN";
      }
      const amountRaw = utils.parseUnits(amount, decimals).toString();
      const balanceRaw = BigInt(await contract.methods.balanceOf(config.address).call()).toString();
      const balance = utils.formatUnits(BigInt(balanceRaw), decimals);

      if (BigInt(balanceRaw) < BigInt(amountRaw)) {
        throw new Error(`Insufficient ${symbol} balance. Have ${balance}, need ${amount}.`);
      }

      return {
        network,
        from: config.address,
        to,
        assetType: "token",
        amount,
        amountRaw,
        symbol,
        decimals,
        tokenAddress,
        balance,
        balanceRaw,
      };
    }

    const decimals = 6;
    const symbol = "TRX";
    const amountRaw = utils.parseUnits(amount, decimals).toString();
    const balanceRaw = BigInt(await tronWeb.trx.getBalance(config.address)).toString();
    const balance = utils.formatUnits(BigInt(balanceRaw), decimals);

    if (BigInt(balanceRaw) < BigInt(amountRaw)) {
      throw new Error(`Insufficient ${symbol} balance. Have ${balance}, need ${amount}.`);
    }

    return {
      network,
      from: config.address,
      to,
      assetType: "native",
      amount,
      amountRaw,
      symbol,
      decimals,
      balance,
      balanceRaw,
    };
  }

  const publicClient = getPublicClient(network) as any;
  if (tokenAddress) {
    const [symbolRaw, balanceRawBigInt] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI as any,
        functionName: "symbol",
      }).catch(() => "TOKEN"),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI as any,
        functionName: "balanceOf",
        args: [config.address],
      }),
    ]);
    let decimals = decimalsOverride;
    if (decimals == null) {
      try {
        const decimalsRaw = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI as any,
          functionName: "decimals",
        });
        decimals = Number(decimalsRaw);
      } catch {
        decimals = resolveTokenDecimalsFromConfig(network, tokenAddress);
      }
    }
    if (decimals == null) {
      throw new Error(
        "Unable to detect token decimals from contract/config. Please retry with explicit decimals in prepare_token_transfer.",
      );
    }
    const symbol = String(symbolRaw);
    const amountRaw = utils.parseUnits(amount, decimals).toString();
    const balanceRaw = BigInt(balanceRawBigInt).toString();
    const balance = utils.formatUnits(BigInt(balanceRaw), decimals);

    if (BigInt(balanceRaw) < BigInt(amountRaw)) {
      throw new Error(`Insufficient ${symbol} balance. Have ${balance}, need ${amount}.`);
    }

    return {
      network,
      from: config.address,
      to,
      assetType: "token",
      amount,
      amountRaw,
      symbol,
      decimals,
      tokenAddress,
      balance,
      balanceRaw,
    };
  }

  const decimals = 18;
  const symbol = chain.nativeSymbol;
  const amountRaw = utils.parseUnits(amount, decimals).toString();
  const balanceRaw = BigInt(await publicClient.getBalance({ address: config.address })).toString();
  const balance = utils.formatUnits(BigInt(balanceRaw), decimals);
  if (BigInt(balanceRaw) < BigInt(amountRaw)) {
    throw new Error(`Insufficient ${symbol} balance. Have ${balance}, need ${amount}.`);
  }

  return {
    network,
    from: config.address,
    to,
    assetType: "native",
    amount,
    amountRaw,
    symbol,
    decimals,
    balance,
    balanceRaw,
  };
}

export async function executeTokenTransfer(preview: TokenTransferPreview) {
  assertWalletReadyForWrite(preview.network);

  if (preview.assetType === "token") {
    const result = await writeContract({
      network: preview.network,
      address: preview.tokenAddress!,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [preview.to, BigInt(preview.amountRaw)],
    });
    return {
      ...preview,
      txHash: result.txID,
      receipt: result.receipt,
    };
  }

  const chain = getNetworkConfig(preview.network);
  if (chain.kind === "tron") {
    const tronWeb = getPublicClient(preview.network) as any;
    const owner = getWalletAddress(preview.network);
    const unsignedTx = await tronWeb.transactionBuilder.sendTrx(
      preview.to,
      Number(preview.amountRaw),
      owner,
    );
    const signedTx = await signTransactionWithWallet(unsignedTx, preview.network, "native_transfer");
    const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);
    if (!broadcast?.result) {
      throw new Error(`Broadcast failed: ${JSON.stringify(broadcast)}`);
    }

    return {
      ...preview,
      txHash: broadcast.txid || broadcast.transaction?.txID || unsignedTx.txID,
      broadcast,
    };
  }

  const walletClient = getWalletClient(preview.network) as any;
  if (!walletClient.account) {
    throw new Error(`Wallet client for ${preview.network} is missing a local account for signing.`);
  }
  const hash = await walletClient.sendTransaction({
    account: walletClient.account,
    to: preview.to,
    value: BigInt(preview.amountRaw),
    chain: walletClient.chain,
  });
  const publicClient = getPublicClient(preview.network) as any;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    ...preview,
    txHash: hash,
    receipt,
  };
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
