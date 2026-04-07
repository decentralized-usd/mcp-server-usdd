import { TronWeb } from "tronweb";

/**
 * Convert a Base58 TRON address to its hex representation.
 * If already hex, returns as-is.
 */
export function toHexAddress(address: string): string {
  if (address.startsWith("T")) {
    return TronWeb.address.toHex(address);
  }
  return address;
}

/**
 * Convert a hex TRON address to its Base58 representation.
 * If already Base58, returns as-is.
 */
export function toBase58Address(address: string): string {
  if (address.startsWith("41")) {
    return TronWeb.address.fromHex(address);
  }
  if (address.startsWith("0x")) {
    return TronWeb.address.fromHex(address);
  }
  return address;
}

/**
 * Returns true if the address is a valid TRON Base58 address (starts with 'T').
 */
export function isBase58(address: string): boolean {
  return address.startsWith("T") && TronWeb.isAddress(address);
}

/**
 * Returns true if the address is a valid TRON hex address (41... or 0x...).
 */
export function isHex(address: string): boolean {
  if (address.startsWith("T")) return false;

  let clean = address;
  if (address.startsWith("0x")) {
    clean = address.substring(2);
  }
  if (clean.length === 40) {
    clean = "41" + clean;
  }
  return TronWeb.isAddress(clean);
}

/**
 * Resolve a TRON address or name to its canonical address.
 * Currently supports direct addresses only (no name service).
 */
export const resolveAddress = async (nameOrAddress: string, _network?: string): Promise<string> => {
  if (TronWeb.isAddress(nameOrAddress)) {
    return nameOrAddress;
  }
  throw new Error(`Invalid address or unsupported name service: ${nameOrAddress}`);
};
