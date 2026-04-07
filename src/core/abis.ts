export const ERC20_ABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ type: "address", name: "account" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance", inputs: [{ type: "address", name: "owner" }, { type: "address", name: "spender" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ type: "address", name: "spender" }, { type: "uint256", name: "amount" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "transfer", inputs: [{ type: "address", name: "to" }, { type: "uint256", name: "amount" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
] as const;

export const PROXY_REGISTRY_ABI = [
  { type: "function", name: "build", inputs: [], outputs: [{ type: "address", name: "proxy" }], stateMutability: "nonpayable" },
  { type: "function", name: "build", inputs: [{ type: "address", name: "owner" }], outputs: [{ type: "address", name: "proxy" }], stateMutability: "nonpayable" },
  { type: "function", name: "proxies", inputs: [{ type: "address", name: "owner" }], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

export const PROXY_CALL_ABI = [
  { type: "function", name: "execute", inputs: [{ type: "address", name: "_target" }, { type: "bytes", name: "_data" }], outputs: [{ type: "bytes32", name: "response" }], stateMutability: "payable" },
  { type: "function", name: "owner", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
] as const;

export const DSS_PROXY_ACTIONS_ABI = [
  { type: "function", name: "open", inputs: [{ type: "address", name: "manager" }, { type: "bytes32", name: "ilk" }, { type: "address", name: "usr" }], outputs: [{ type: "uint256", name: "cdp" }], stateMutability: "nonpayable" },
  { type: "function", name: "openLockTRXAndDraw", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "jug" }, { type: "address", name: "trxJoin" }, { type: "address", name: "usddJoin" }, { type: "bytes32", name: "ilk" }, { type: "uint256", name: "wadD" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "openLockGemAndDraw", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "jug" }, { type: "address", name: "gemJoin" }, { type: "address", name: "usddJoin" }, { type: "bytes32", name: "ilk" }, { type: "uint256", name: "amtC" }, { type: "uint256", name: "wadD" }, { type: "bool", name: "transferFrom" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "lockTRXAndDraw", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "jug" }, { type: "address", name: "trxJoin" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "wadD" }], outputs: [], stateMutability: "payable" },
  { type: "function", name: "lockGemAndDraw", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "jug" }, { type: "address", name: "gemJoin" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "amtC" }, { type: "uint256", name: "wadD" }, { type: "bool", name: "transferFrom" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "draw", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "jug" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "wad" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "wipe", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "wad" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "wipeAll", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "safeWipeAll", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "address", name: "owner" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "safeWipe", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "wad" }, { type: "address", name: "owner" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "freeTRX", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "trxJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "wad" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "freeGem", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "gemJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "amt" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "wipeAndFreeTRX", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "trxJoin" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "wadC" }, { type: "uint256", name: "wadD" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "wipeAndFreeGem", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "gemJoin" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "amtC" }, { type: "uint256", name: "wadD" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "wipeAllAndFreeTRX", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "trxJoin" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "wadC" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "wipeAllAndFreeGem", inputs: [{ type: "address", name: "manager" }, { type: "address", name: "gemJoin" }, { type: "address", name: "usddJoin" }, { type: "uint256", name: "cdp" }, { type: "uint256", name: "amtC" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export const CDP_MANAGER_ABI = [
  { type: "function", name: "count", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "first", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "list", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256", name: "prev" }, { type: "uint256", name: "next" }], stateMutability: "view" },
  { type: "function", name: "owns", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "urns", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "ilks", inputs: [{ type: "uint256" }], outputs: [{ type: "bytes32" }], stateMutability: "view" },
] as const;

export const VAT_ABI = [
  { type: "function", name: "Line", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "debt", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "live", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "urns", inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [{ type: "uint256", name: "ink" }, { type: "uint256", name: "art" }], stateMutability: "view" },
  { type: "function", name: "ilks", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint256", name: "Art" }, { type: "uint256", name: "rate" }, { type: "uint256", name: "spot" }, { type: "uint256", name: "line" }, { type: "uint256", name: "dust" }], stateMutability: "view" },
  { type: "function", name: "gem", inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "usdd", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

export const JUG_ABI = [
  { type: "function", name: "base", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "ilks", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint256", name: "duty" }, { type: "uint256", name: "rho" }], stateMutability: "view" },
  { type: "function", name: "drip", inputs: [{ type: "bytes32", name: "ilk" }], outputs: [{ type: "uint256", name: "rate" }], stateMutability: "nonpayable" },
] as const;

export const SPOT_ABI = [
  { type: "function", name: "par", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "live", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "ilks", inputs: [{ type: "bytes32" }], outputs: [{ type: "address", name: "pip" }, { type: "uint256", name: "mat" }], stateMutability: "view" },
] as const;

export const OSM_ABI = [
  { type: "function", name: "peek", inputs: [], outputs: [{ type: "bytes32" }, { type: "bool" }], stateMutability: "view" },
  { type: "function", name: "peep", inputs: [], outputs: [{ type: "bytes32" }, { type: "bool" }], stateMutability: "view" },
  { type: "function", name: "pass", inputs: [], outputs: [{ type: "bool", name: "ok" }], stateMutability: "view" },
  { type: "function", name: "hop", inputs: [], outputs: [{ type: "uint16" }], stateMutability: "view" },
] as const;

export const DOG_ABI = [
  { type: "function", name: "Hole", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "Dirt", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "ilks", inputs: [{ type: "bytes32" }], outputs: [{ type: "address", name: "clip" }, { type: "uint256", name: "chop" }, { type: "uint256", name: "hole" }, { type: "uint256", name: "dirt" }], stateMutability: "view" },
] as const;

export const PSM_ABI = [
  { type: "function", name: "sellEnabled", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "buyEnabled", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tin", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "tout", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "ilk", inputs: [], outputs: [{ type: "bytes32" }], stateMutability: "view" },
  { type: "function", name: "sellGem", inputs: [{ type: "address", name: "usr" }, { type: "uint256", name: "gemAmt" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "buyGem", inputs: [{ type: "address", name: "usr" }, { type: "uint256", name: "gemAmt" }], outputs: [], stateMutability: "nonpayable" },
] as const;

export const DSR_POT_ABI = [
  { type: "function", name: "chi", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "dsr", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "pie", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "drip", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
] as const;

export const SUSDD_ABI = [
  { type: "function", name: "asset", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "totalAssets", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalSupply", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "previewDeposit", inputs: [{ type: "uint256", name: "assets" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "convertToAssets", inputs: [{ type: "uint256", name: "shares" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ type: "address", name: "account" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "deposit", inputs: [{ type: "uint256", name: "assets" }, { type: "address", name: "receiver" }], outputs: [{ type: "uint256", name: "shares" }], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ type: "uint256", name: "assets" }, { type: "address", name: "receiver" }, { type: "address", name: "owner" }], outputs: [{ type: "uint256", name: "shares" }], stateMutability: "nonpayable" },
  { type: "function", name: "redeem", inputs: [{ type: "uint256", name: "shares" }, { type: "address", name: "receiver" }, { type: "address", name: "owner" }], outputs: [{ type: "uint256", name: "assets" }], stateMutability: "nonpayable" },
] as const;
