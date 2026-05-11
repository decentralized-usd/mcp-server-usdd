import { getSupportedNetworks, type NetworkKey } from "../chains.js";

export type NetworkFamily = "tron" | "eth" | "bsc";

let familyDefaults: Record<NetworkFamily, NetworkKey> = {
  tron: "tron",
  eth: "eth",
  bsc: "bsc",
};
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

function networkFamily(network: NetworkKey): NetworkFamily {
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

function getFamilyMainnet(family: NetworkFamily): NetworkKey {
  if (family === "eth") return "eth";
  if (family === "bsc") return "bsc";
  return "tron";
}

export function resolveNetworkInput(network: string, family?: NetworkFamily): NetworkKey {
  const normalized = network.trim().toLowerCase();
  if (normalized === "mainnet") {
    if (!family) {
      throw new Error("Ambiguous network alias 'mainnet' in multi-chain mode. Use tron_mainnet, eth_mainnet, or bsc_mainnet, or set family.");
    }
    return getFamilyMainnet(family);
  }
  if (normalized === "nile") {
    if (family && family !== "tron") {
      throw new Error("Alias 'nile' only applies to tron family.");
    }
    return "tron_nile";
  }
  const resolved = NETWORK_ALIASES[normalized] || (normalized as NetworkKey);
  if (!getSupportedNetworks().includes(resolved)) {
    throw new Error(`Unsupported network: ${network}. Supported keys: ${getSupportedNetworks().join(", ")}. Aliases: tron_mainnet, tron_nile, eth_mainnet, eth_sepolia, bsc_mainnet, bsc_testnet.`);
  }
  if (family && networkFamily(resolved) !== family) {
    throw new Error(`Network '${resolved}' does not belong to family '${family}'.`);
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

export function getGlobalNetwork(family: NetworkFamily = "tron"): NetworkKey {
  return familyDefaults[family];
}

export function getGlobalNetworks(): Record<NetworkFamily, NetworkKey> {
  return { ...familyDefaults };
}

export function setGlobalNetwork(network: string, family?: NetworkFamily): NetworkKey {
  const resolved = resolveNetworkInput(network, family);
  familyDefaults = {
    ...familyDefaults,
    [networkFamily(resolved)]: resolved,
  };
  return resolved;
}
