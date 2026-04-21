import { encodeFunctionData } from "viem";
import { getPublicClient, getWalletClient } from "./clients.js";
import { getNetworkConfig, type NetworkKey } from "../chains.js";
import { getConfiguredWallet, getWalletAddress, signTransactionWithWallet } from "./wallet.js";
import { utils } from "./utils.js";
import { PROXY_CALL_ABI, PROXY_REGISTRY_ABI } from "../abis.js";

function decodeTronErrorMessage(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const hex = value.startsWith("0x") ? value.slice(2) : value;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return value;
  try {
    return Buffer.from(hex, "hex").toString("utf8").replace(/\0+$/, "") || value;
  } catch {
    return value;
  }
}

async function waitForTronReceipt(network: NetworkKey, txID: string) {
  const tronWeb = getPublicClient(network) as any;
  const maxAttempts = 30;
  const intervalMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const receipt = await tronWeb.trx.getTransactionInfo(txID);
      if (receipt && receipt.id) {
        const receiptResult = receipt.receipt?.result;
        const topLevelResult = receipt.result;
        const failed = receiptResult === "FAILED" || topLevelResult === "FAILED";
        if (failed) {
          const decodedMessage = decodeTronErrorMessage(receipt.resMessage) || "Unknown TRON execution failure";
          throw new Error(`TRON transaction ${txID} failed: ${decodedMessage}`);
        }
        return receipt;
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`TRON transaction ${txID} was not confirmed within ${maxAttempts * intervalMs}ms.`);
}

function getAbiInputTypes(abi: readonly any[], functionName: string, argCount: number): string[] {
  const candidates = abi.filter((item: any) => item.type === "function" && item.name === functionName);
  if (candidates.length === 0) {
    throw new Error(`Function ${functionName} not found in ABI.`);
  }
  const matched = candidates.filter((item: any) => (item.inputs || []).length === argCount);
  if (matched.length === 0) {
    throw new Error(`No overload of ${functionName} accepts ${argCount} argument(s).`);
  }
  if (matched.length > 1) {
    throw new Error(`Ambiguous overload for ${functionName} with ${argCount} argument(s).`);
  }
  return (matched[0].inputs || []).map((input: any) => input.type as string);
}

export async function readContract(params: { network: NetworkKey; address: string; abi: readonly any[]; functionName: string; args?: any[] }) {
  const config = getNetworkConfig(params.network);
  const args = params.args || [];
  if (config.kind === "tron") {
    const tronWeb = getPublicClient(params.network) as any;
    const contract = tronWeb.contract(params.abi as any, params.address);
    return contract.methods[params.functionName](...args).call();
  }

  const client = getPublicClient(params.network) as any;
  return client.readContract({
    address: params.address,
    abi: params.abi as any,
    functionName: params.functionName,
    args,
  });
}

export async function writeContract(params: { network: NetworkKey; address: string; abi: readonly any[]; functionName: string; args?: any[]; value?: bigint }) {
  const config = getNetworkConfig(params.network);
  const args = params.args || [];
  if (config.kind === "tron") {
    const tronWeb = getPublicClient(params.network) as any;
    const inputTypes = getAbiInputTypes(params.abi, params.functionName, args.length);
    const signature = `${params.functionName}(${inputTypes.join(",")})`;
    const typedParams = args.map((value, index) => ({
      type: inputTypes[index],
      value,
    }));
    const ownerAddress = getWalletAddress(params.network);
    const options: any = {};
    if (params.value) options.callValue = Number(params.value);

    const tx = await tronWeb.transactionBuilder.triggerSmartContract(
      params.address,
      signature,
      options,
      typedParams,
      ownerAddress,
    );
    const signedTx = await signTransactionWithWallet(tx.transaction, params.network, `${params.functionName}(${inputTypes.join(",")})`);
    const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);
    if (!broadcast?.result) {
      const decodedMessage = decodeTronErrorMessage(broadcast?.message) || JSON.stringify(broadcast);
      throw new Error(`Broadcast failed: ${decodedMessage}`);
    }
    const txID = broadcast.txid || broadcast.transaction?.txID || tx.transaction.txID;
    const receipt = await waitForTronReceipt(params.network, txID);
    return { txID, receipt };
  }

  const walletClient = getWalletClient(params.network) as any;
  if (!walletClient.account) {
    throw new Error(`Wallet client for ${params.network} is missing a local account for signing.`);
  }
  const hash = await walletClient.writeContract({
    account: walletClient.account,
    address: params.address,
    abi: params.abi as any,
    functionName: params.functionName,
    args,
    value: params.value,
    chain: walletClient.chain,
  });
  const publicClient = getPublicClient(params.network) as any;
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { txID: hash, receipt };
}

export async function getProxyAddress(network: NetworkKey, buildIfMissing = false): Promise<string | null> {
  const wallet = getConfiguredWallet(network);
  const config = getNetworkConfig(network);
  const existing = await readContract({
    network,
    address: config.proxyRegistry,
    abi: PROXY_REGISTRY_ABI,
    functionName: "proxies",
    args: [wallet.address],
  });

  const normalized = utils.normalizeAddress(typeof existing === "string" ? existing : String(existing), network);
  const empty = config.kind === "tron" ? "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb" : "0x0000000000000000000000000000000000000000";
  if (normalized && normalized !== empty && !/^0x0+$/.test(normalized)) return normalized;

  if (!buildIfMissing) return null;

  await writeContract({
    network,
    address: config.proxyRegistry,
    abi: PROXY_REGISTRY_ABI,
    functionName: "build",
    args: config.kind === "tron" ? [wallet.address] : [],
  });

  const built = await readContract({
    network,
    address: config.proxyRegistry,
    abi: PROXY_REGISTRY_ABI,
    functionName: "proxies",
    args: [wallet.address],
  });
  return String(built);
}

export async function ensureProxy(network: NetworkKey): Promise<string> {
  const proxy = await getProxyAddress(network, true);
  if (!proxy) {
    throw new Error(`Failed to create or locate proxy for ${network}.`);
  }
  return proxy;
}

export async function executeProxyAction(params: {
  network: NetworkKey;
  target: string;
  targetAbi: readonly any[];
  functionName: string;
  args?: any[];
  value?: bigint;
}) {
  const proxy = await ensureProxy(params.network);
  const encodedArgs = (params.args || []).map((arg) => typeof arg === "string" && (arg.startsWith("T") || arg.startsWith("41")) ? utils.toEncodedAddress(arg, params.network) : arg);
  const data = encodeFunctionData({
    abi: params.targetAbi as any,
    functionName: params.functionName,
    args: encodedArgs as any,
  });

  const execArgs: [string, `0x${string}`] = [utils.toEncodedAddress(params.target, params.network), data];
  const config = getNetworkConfig(params.network);
  if (config.kind === "tron") {
    execArgs[0] = params.target;
  }

  return writeContract({
    network: params.network,
    address: proxy,
    abi: PROXY_CALL_ABI,
    functionName: "execute",
    args: execArgs,
    value: params.value,
  });
}
