import { TronWeb } from "tronweb";
import { createPublicClient, createWalletClient, defineChain, http, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getNetworkConfig, type NetworkKey } from "../chains.js";
import { getConfiguredWallet } from "./wallet.js";

const tronClients = new Map<string, TronWeb>();
const evmPublicClients = new Map<string, PublicClient>();

function getTronClient(network: NetworkKey): TronWeb {
  if (tronClients.has(network)) return tronClients.get(network)!;
  const config = getNetworkConfig(network);
  const client = new TronWeb({
    fullHost: config.rpcUrl,
    solidityNode: config.rpcUrl,
    eventServer: config.rpcUrl,
    headers: process.env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY } : undefined,
  });
  client.setAddress("T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb");
  tronClients.set(network, client);
  return client;
}

function defineEvm(network: NetworkKey) {
  const config = getNetworkConfig(network);
  return defineChain({
    id: config.chainId,
    name: config.label,
    nativeCurrency: { name: config.nativeSymbol, symbol: config.nativeSymbol, decimals: 18 },
    rpcUrls: { default: { http: [config.rpcUrl] } },
    blockExplorers: { default: { name: config.label, url: config.explorer } },
  });
}

export function getPublicClient(network: NetworkKey): PublicClient | TronWeb {
  const config = getNetworkConfig(network);
  if (config.kind === "tron") return getTronClient(network);
  if (evmPublicClients.has(network)) return evmPublicClients.get(network)!;
  const client = createPublicClient({ chain: defineEvm(network), transport: http(config.rpcUrl) });
  evmPublicClients.set(network, client);
  return client;
}

export function getWalletClient(network: NetworkKey): WalletClient | TronWeb {
  const config = getNetworkConfig(network);
  const wallet = getConfiguredWallet(network);
  if (config.kind === "tron") {
    return new TronWeb({
      fullHost: config.rpcUrl,
      solidityNode: config.rpcUrl,
      eventServer: config.rpcUrl,
      privateKey: wallet.privateKey,
      headers: process.env.TRONGRID_API_KEY ? { "TRON-PRO-API-KEY": process.env.TRONGRID_API_KEY } : undefined,
    });
  }

  return createWalletClient({
    account: privateKeyToAccount(wallet.privateKey as `0x${string}`),
    chain: defineEvm(network),
    transport: http(config.rpcUrl),
  });
}
