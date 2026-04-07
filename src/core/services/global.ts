import { getSupportedNetworks, type NetworkKey } from "../chains.js";

let globalNetwork: NetworkKey = "tron";

export function getGlobalNetwork(): NetworkKey {
  return globalNetwork;
}

export function setGlobalNetwork(network: string): void {
  if (!getSupportedNetworks().includes(network as NetworkKey)) {
    throw new Error(`Unsupported network: ${network}. Supported: ${getSupportedNetworks().join(", ")}`);
  }
  globalNetwork = network as NetworkKey;
}
