import { encodeFunctionData } from "viem";
import { getPublicClient, getWalletClient } from "./clients.js";
import { getNetworkConfig, type NetworkKey } from "../chains.js";
import { getConfiguredWallet, isBrowserWalletMode } from "./wallet.js";
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
  if (isBrowserWalletMode()) {
    throw new Error("Browser wallet mode is active. Current runtime cannot directly sign browser-wallet transactions; switch to agent mode or run in a browser-enabled environment.");
  }

  const config = getNetworkConfig(params.network);
  const args = params.args || [];
  if (config.kind === "tron") {
    const tronWeb = getWalletClient(params.network) as any;
    const contract = tronWeb.contract(params.abi as any, params.address);
    const txID = await contract.methods[params.functionName](...args).send(params.value ? { callValue: Number(params.value) } : {});
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
