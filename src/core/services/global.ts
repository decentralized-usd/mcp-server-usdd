import { getSupportedNetworks, type NetworkKey } from "../chains.js";

let globalNetwork: NetworkKey = "tron";
const NETWORK_ALIASES: Record<string, NetworkKey> = {
  tron_mainnet: "tron",
  tron_nile: "tron_nile",
  eth_mainnet: "eth",
  eth_sepolia: "eth_sepolia",
  bsc_mainnet: "bsc",
  bsc_testnet: "bsc_testnet",
  mainnet: "tron",
  nile: "tron_nile",
};

function networkFamily(network: NetworkKey): "tron" | "eth" | "bsc" {
  if (network === "tron" || network === "tron_nile") return "tron";
  if (network === "eth" || network === "eth_sepolia") return "eth";
  return "bsc";
}

export function getNetworkOptions() {
  return {
    tron: ["tron_mainnet", "tron_nile"],
    eth: ["eth_mainnet", "eth_sepolia"],
    bsc: ["bsc_mainnet", "bsc_testnet"],
  } as const;
}

export function resolveNetworkInput(network: string): NetworkKey {
  const normalized = network.trim().toLowerCase();
  if (normalized === "mainnet") {
    throw new Error("Ambiguous network alias 'mainnet' in multi-chain mode. Use tron_mainnet, eth_mainnet, or bsc_mainnet.");
  }
  const resolved = NETWORK_ALIASES[normalized] || (normalized as NetworkKey);
  if (!getSupportedNetworks().includes(resolved)) {
    throw new Error(`Unsupported network: ${network}. Supported keys: ${getSupportedNetworks().join(", ")}. Aliases: tron_mainnet, tron_nile, eth_mainnet, eth_sepolia, bsc_mainnet, bsc_testnet.`);
  }
  return resolved;
}

export function getNetworkAlias(network: NetworkKey): string {
  if (network === "eth") return "eth_mainnet";
  if (network === "eth_sepolia") return "eth_sepolia";
  if (network === "bsc") return "bsc_mainnet";
  if (network === "bsc_testnet") return "bsc_testnet";
  if (network === "tron") return "mainnet";
  if (network === "tron_nile") return "nile";
  return network;
}

export function getNetworkProfile(network: NetworkKey) {
  return {
    network,
    alias: getNetworkAlias(network),
    family: networkFamily(network),
    options: getNetworkOptions(),
  };
}

export function getGlobalNetwork(): NetworkKey {
  return globalNetwork;
}

export function setGlobalNetwork(network: string): void {
  globalNetwork = resolveNetworkInput(network);
}
