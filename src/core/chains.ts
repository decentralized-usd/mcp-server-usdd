export type NetworkKey = "tron" | "eth" | "bsc" | "tron_nile" | "eth_sepolia" | "bsc_testnet";

export type ChainKind = "tron" | "evm";

export interface IlkConfig {
  key: string;
  label: string;
  join: string;
  gem?: string;
  decimals: number;
  kind: "native" | "erc20" | "synthetic" | "psm";
  priceFeedKey?: string;
}

export interface PsmMarketConfig {
  key: string;
  label: string;
  psm: string;
  gemJoin: string;
  gem: string;
  decimals: number;
}

export interface SavingsConfig {
  susdd: string;
  pot: string;
}

export interface NetworkConfig {
  key: NetworkKey;
  label: string;
  kind: ChainKind;
  chainId: number;
  rpcUrl: string;
  explorer: string;
  nativeSymbol: string;
  serviceApiUrl: string;
  proxyRegistry: string;
  proxyActions: string;
  proxyActionsProxy?: string;
  cdpManager: string;
  vat: string;
  jug: string;
  dog: string;
  spot: string;
  usdd: string;
  usddJoin: string;
  multicall?: string;
  savings?: SavingsConfig;
  ilks: Record<string, IlkConfig>;
  psmMarkets: Record<string, PsmMarketConfig>;
}

const tronRpc = process.env.TRON_FULL_NODE || "https://api.trongrid.io";
const ethRpc = process.env.ETH_RPC_URL || "https://ethereum-rpc.publicnode.com";
const bscRpc = process.env.BSC_RPC_URL || "https://bsc-rpc.publicnode.com";
const tronNileRpc = process.env.TRON_NILE_FULL_NODE || "https://nile.trongrid.io";
const ethSepoliaRpc = process.env.ETH_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const bscTestnetRpc = process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com";
const productionApiUrl = process.env.USDD_API_URL || "https://app-api.usdd.io";
const ZERO_EVM_ADDRESS = "0x0000000000000000000000000000000000000000";

export const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  tron: {
    key: "tron",
    label: "TRON Mainnet",
    kind: "tron",
    chainId: 728126428,
    rpcUrl: tronRpc,
    explorer: "https://tronscan.org",
    nativeSymbol: "TRX",
    serviceApiUrl: productionApiUrl,
    proxyRegistry: "THuVWkvAikvSqmoZXHMUQJAcocsgFr4wuk",
    proxyActions: "TEk9usYZsunkc5oYijyMte6sGurspik2Js",
    proxyActionsProxy: "TXzhj9Xh8xfzerjinRyM5TfoBL7Cw5hk5d",
    cdpManager: "TDDWjmQaquEtUn1Pa8wCd8dfWFPdQLGPYL",
    vat: "TH5dhX7o39afSbfDT2e3c9k4itWjNKD4D9",
    jug: "TWttvCqVmiLip7PL8Aut2Hi37swqv7EmYd",
    dog: "TCwYKcDj8c5Te9hjj3UokcxhpY6skFoXnG",
    spot: "TU8Z8CeUd7pnXSMHTNqRgK6Qxxxyzsba1n",
    usdd: "TXDk8mbtRbXeYuMNS83CfKPaYYT8XWv9Hz",
    usddJoin: "TUajR7CbXU6hX8n3XtNkitFAD25JvP99K6",
    multicall: "TFuumskYzYBLZ7EDNpADFTSi1cgcgd7Wwa",
    ilks: {
      "TRX-A": { key: "TRX-A", label: "TRX-A", join: "TJ1VWPvFVq7sVsN7J7dWJVZz4SLT14qRUr", gem: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR", decimals: 6, kind: "native", priceFeedKey: "trx" },
      "TRX-B": { key: "TRX-B", label: "TRX-B", join: "TGQKnHDQNyc3QeHJ7YxH8wggdg89UVXyvX", gem: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR", decimals: 6, kind: "native", priceFeedKey: "trx" },
      "TRX-C": { key: "TRX-C", label: "TRX-C", join: "TPUPPLTYLdbW4jxwD5g2T7ystxsR9HL2mt", gem: "TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR", decimals: 6, kind: "native", priceFeedKey: "trx" },
      "USDT-A": { key: "USDT-A", label: "USDT-A", join: "TDUkQbjrXs6xUbxGCLknWwJHxVTdysXBhy", gem: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6, kind: "erc20", priceFeedKey: "usdt" },
      "STRX-A": { key: "STRX-A", label: "sTRX-A", join: "TKha7zcAXZMaaWzoVmUHtvVFqr9GeiChgJ", gem: "TU3kjFuhtEo42tsCBtfYUAZxoqQ4yuSLQ5", decimals: 18, kind: "erc20", priceFeedKey: "strx" },
      "WBTC-A": { key: "WBTC-A", label: "WBTC-A", join: "TDea6uDwDgxkUwyEefhqMPij6NzRiPrVV1", gem: "TYhWwKpw43ENFWBTGpzLHh3882f2au7SMi", decimals: 8, kind: "erc20", priceFeedKey: "wbtc" },
      "WBTC-B": { key: "WBTC-B", label: "WBTC-B", join: "TRoqYfXY7ZLZcjeiTQYNu2vDhJPeJYNf1w", gem: "TYhWwKpw43ENFWBTGpzLHh3882f2au7SMi", decimals: 8, kind: "erc20", priceFeedKey: "wbtc" },
    },
    psmMarkets: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", psm: "TBXW4hS5KYjjbJXDpnrPf4zhkLwrpUjbyz", gemJoin: "TSUYvQ5tdd3DijCD1uGunGLpftHuSZ12sQ", gem: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6 },
    },
  },
  eth: {
    key: "eth",
    label: "Ethereum",
    kind: "evm",
    chainId: 1,
    rpcUrl: ethRpc,
    explorer: "https://etherscan.io",
    nativeSymbol: "ETH",
    serviceApiUrl: productionApiUrl,
    proxyRegistry: "0x8be6b814beb37e8028258777af0ec6648a2a908e",
    proxyActions: "0xb80751ef88d07fa33ee4fc0c6f8b4b6c6c31e708",
    proxyActionsProxy: "0x3dba111255d3888c723242320595588754cf493e",
    cdpManager: "0xb5b08e58e804e5937f56b1e633cf85abbd269127",
    vat: "0xff77f6209239deb2c076179499f2346b0032097f",
    jug: "0xdb218163fe160fedf0c702c37124e8c194e99329",
    dog: "0x9681604090395e835ff54187f638ded8dc983cbf",
    spot: "0x8c4c758152da3e04b95b5eaca75585d79013c6b0",
    usdd: "0x4f8e5de400de08b164e7421b3ee387f461becd1a",
    usddJoin: "0x983dfef6d71862d809e239845da5a959492f63b8",
    multicall: "0x33b041a17f017fb246fda23bcad124f78b1f0e54",
    savings: {
      susdd: "0xc5d6a7b61d18afa11435a889557b068bb9f29930",
      pot: "0xe789578252cc026ffb3413a1104ba223fdeca500",
    },
    ilks: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", join: "0x217e42ceb2eae9ecb788fdf0e31c806c531760a3", gem: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6, kind: "psm", priceFeedKey: "usdt" },
      "PSM-USDC": { key: "PSM-USDC", label: "PSM USDC", join: "0x9a7e1b324060db7342aea08c0dc56f55ced6f519", gem: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, kind: "psm" },
      "SA001-A": { key: "SA001-A", label: "SA001-A", join: "0x7a69D5BfC49bC48AF6A2ed4969d32752362793Fc", gem: "0x4cAffE151c5D0b8DA9727890b2446accBE87a380", decimals: 18, kind: "synthetic" },
      "SA002-A": { key: "SA002-A", label: "SA002-A", join: "0xb09E88E8d50c21c7d6F75A950b7D22A2B66C581E", gem: "0x137DaA55753E86280877C59c5BEeFe27542b9Df9", decimals: 18, kind: "synthetic" },
    },
    psmMarkets: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", psm: "0xce355440c00014a229bbec030a2b8f8eb45a2897", gemJoin: "0x217e42ceb2eae9ecb788fdf0e31c806c531760a3", gem: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
      "PSM-USDC": { key: "PSM-USDC", label: "PSM USDC", psm: "0x12d0351f68035a41d13fc8324562e2d51b7a3b93", gemJoin: "0x9a7e1b324060db7342aea08c0dc56f55ced6f519", gem: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
    },
  },
  bsc: {
    key: "bsc",
    label: "BNB Smart Chain",
    kind: "evm",
    chainId: 56,
    rpcUrl: bscRpc,
    explorer: "https://bscscan.com",
    nativeSymbol: "BNB",
    serviceApiUrl: productionApiUrl,
    proxyRegistry: "0x0144fcce201dc3957fcf75269c10c21cca41ba73",
    proxyActions: "0x777684f6425d095e9166f5f694f50e48a16bcb25",
    proxyActionsProxy: "0x2662e860ea672e4d31df3438114c48511229e60f",
    cdpManager: "0xa4109496a660ebc8d74de991ac3b04c136c9ba09",
    vat: "0x41f1402ab4d900115d1f16a14a3cf4bdf2f2705c",
    jug: "0x12a2a264d6980fb22e5ebb090002bd8f5e618e0b",
    dog: "0x6badab4336b17e8d0839fd0c046e21b41196280b",
    spot: "0xc1779812be28cd205e45098e079620a830b5ffce",
    usdd: "0x45e51bc23d592eb2dba86da3985299f7895d66ba",
    usddJoin: "0x6b00039d76795fd59baf17e0c9c6d87011e7edac",
    multicall: "0x4846fcc31b3d6ce2a4726f482b848137a69b8e08",
    savings: {
      susdd: "0x8ba9da757d1d66c58b1ae7e2ed6c04087348a82d",
      pot: "0xf0c506e48383c1925c025ec9f4a9e1dd94ff8b18",
    },
    ilks: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", join: "0xe229fda620b8a9b98ef184830ee3063f0f86b790", gem: "0x55d398326f99059fF775485246999027B3197955", decimals: 18, kind: "psm", priceFeedKey: "usdt" },
      "PSM-USDC": { key: "PSM-USDC", label: "PSM USDC", join: "0x664781ca89a786e66120cd98187d731850516cb3", gem: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, kind: "psm" },
      "SA001-A": { key: "SA001-A", label: "SA001-A", join: "0x062a738465F30EBe6dD06cFAd3256Ba783EDf000", gem: "0xe0133Fb7Dac76A7628B4548AB88DA4E307575E46", decimals: 18, kind: "synthetic" },
      "SA002-A": { key: "SA002-A", label: "SA002-A", join: "0xa8FA697A161417CcFe73a99723a42c8869a9147f", gem: "0x6f59E36bC31ac0Bdb72b1e12700b318d78828f4E", decimals: 18, kind: "synthetic" },
    },
    psmMarkets: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", psm: "0x939d3fb56cd12d68caa1125cc57a8d2391f7ee29", gemJoin: "0xe229fda620b8a9b98ef184830ee3063f0f86b790", gem: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
      "PSM-USDC": { key: "PSM-USDC", label: "PSM USDC", psm: "0x57f7ef5f22c8db13e4f181fc218478a749d7ec4f", gemJoin: "0x664781ca89a786e66120cd98187d731850516cb3", gem: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
    },
  },
  tron_nile: {
    key: "tron_nile",
    label: "TRON Nile (Internal)",
    kind: "tron",
    chainId: 3448148188,
    rpcUrl: tronNileRpc,
    explorer: "https://nile.tronscan.org",
    nativeSymbol: "TRX",
    serviceApiUrl: productionApiUrl,
    proxyRegistry: "TFYXC7Sx2UfMmvNeuSpGv2Ss4e8skzkgCS",
    proxyActions: "TDAeZp2u3Z3aSXL9GTaqg3GQTG5oksNRJ4",
    cdpManager: "TLsfKsZ15SVMMfyyfvd2WXB1ZiexKavez2",
    vat: "TDAv6rniTrqjYqA64VVpnJxFfgmveN2LUA",
    jug: "TAJFAHMuxwVG18G55oXNJkPFuhg2zpPWZ6",
    dog: "TRUbRBoSBQZGAvN4UiWcxj1EuwicAczkE5",
    spot: "TBDV5R9ivEndudp16rAW8Yb129Um8wFKsA",
    usdd: "TYQF9cAeJ3Faq8QXpHxTcFco72DRCQbgFt",
    usddJoin: "TMhXGZgx1bQwWD2r9ZqS9rjp8QRU5v7R7Y",
    multicall: "TZHL5DTcqr6r3uugk2fgtZKHwe4Yp2bsQi",
    ilks: {
      "TRX-A": { key: "TRX-A", label: "TRX-A", join: "TAnN3k475UhYY7jTEeM11WCw6pqsfMQwxW", gem: "TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a", decimals: 6, kind: "native", priceFeedKey: "trx" },
      "TRX-B": { key: "TRX-B", label: "TRX-B", join: "TND1RyHS7KHp3uo8sfcL66heceEMUBPJp9", gem: "TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a", decimals: 6, kind: "native", priceFeedKey: "trx" },
      "TRX-C": { key: "TRX-C", label: "TRX-C", join: "TE7WfUHoQ46fFzC9Ar3BHrDj4ceJVkzaRS", gem: "TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a", decimals: 6, kind: "native", priceFeedKey: "trx" },
      "STRX-B": { key: "STRX-B", label: "sTRX-B", join: "TBRj4YJGupXbBT6Fj3VGvh7THJxA7DF4KA", gem: "TZ8du1HkatTWDbS6FLZei4dQfjfpSm9mxp", decimals: 18, kind: "erc20", priceFeedKey: "strx" },
      "USDT-A": { key: "USDT-A", label: "USDT-A", join: "TRGUtFsWsVRBeQ3paBytJgbS7v7nnv8HNP", gem: "TZDnq7egPqzi7H4SXy1ABvwaVRvRTaVfJW", decimals: 6, kind: "erc20", priceFeedKey: "usdt" },
      "WBTC-A": { key: "WBTC-A", label: "WBTC-A", join: "TBD37jDFSYofEVDeZBtZXdFo37EPC1hdCz", gem: "TH6397cZviHkfrHqXGsGZn8erFbopjQ1U5", decimals: 8, kind: "erc20", priceFeedKey: "wbtc" },
      "WBTC-B": { key: "WBTC-B", label: "WBTC-B", join: "TWH624sRWMjHPUYDwQ9kv4Ax5JjLNdm339", gem: "TH6397cZviHkfrHqXGsGZn8erFbopjQ1U5", decimals: 8, kind: "erc20", priceFeedKey: "wbtc" },
    },
    psmMarkets: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", psm: "TEwUGMSAvbmzjxWoV8JWoSqvQm1A3AXs1V", gemJoin: "TBm4W3JpzsQC4z5mk96fLWZbfNKcfJ5Bxy", gem: "TZDnq7egPqzi7H4SXy1ABvwaVRvRTaVfJW", decimals: 6 },
    },
  },
  eth_sepolia: {
    key: "eth_sepolia",
    label: "Ethereum Sepolia (Internal)",
    kind: "evm",
    chainId: 11155111,
    rpcUrl: ethSepoliaRpc,
    explorer: "https://sepolia.etherscan.io",
    nativeSymbol: "ETH",
    serviceApiUrl: productionApiUrl,
    proxyRegistry: "0x9334a91eb8a23bb45c5f42fec4e387d914dd7ef0",
    proxyActions: "0x8b60aa3b7948c9d056b5bdbb3a8ff31253a30b3b",
    cdpManager: "0xb6f757bffc522de20d8cc688bc0a59f27e02e13d",
    vat: "0xb0b102b9a0120ae49b8b0faef5c32817966ec438",
    jug: "0x88bd2e067acc2ef331e0b6476c0709d8c5e61b35",
    dog: "0x6372b246db638418cf09fc09b216f7b3d4a654a3",
    spot: "0x760e7bbc9c593a9734075c60b106c5bbf981b308",
    usdd: "0xac645f7a1eb3e552b9f4a63afc30495b2c8fcbf4",
    usddJoin: "0xcb1c2ed52842dcc2dff2890d199d560fcfe19be3",
    savings: {
      susdd: "0xcf37b6b7b36920267990e885311214f2de5421dc",
      pot: "0xf7dd09b23864f410cb414c2b11ef3112fcd1c47d",
    },
    ilks: {
      "ETH-A":   { key: "ETH-A",   label: "ETH-A",   join: "0x562e9045989066fb4b15e9813dfb64478d4da54d", gem: "0x7b6896ebbfe3aec16efb399a88a4fd249bcb874e", decimals: 18, kind: "erc20",  priceFeedKey: "eth"  },
      "USDT-A":  { key: "USDT-A",  label: "USDT-A",  join: "0xc09307837065f53475eee8ce85c63f107da03407", gem: "0x58c885900f2df7a1fb1cc1ec35dea9a1c786cac0", decimals: 6,  kind: "erc20",  priceFeedKey: "usdt" },
      "PSM-USDT":{ key: "PSM-USDT",label: "PSM USDT",join: "0x07378fb289d3dff8c1dbf927fd1d7963886851c3", gem: "0x58c885900f2df7a1fb1cc1ec35dea9a1c786cac0", decimals: 6,  kind: "psm",    priceFeedKey: "usdt" },
      "PSM-USDC":{ key: "PSM-USDC",label: "PSM USDC",join: "0x220e8833580f7dcd4c776609a1c58f7d3d49af0c", gem: "0x5e1cb96b9266fc11f335f2811142899e1b98b3f2", decimals: 6,  kind: "psm" },
      "PSM-USD1":{ key: "PSM-USD1",label: "PSM USD1",join: "0xfa4dd4d3cb5c09f377927c8d5605204a6a7fbea1", gem: "0x8e579139c704622092208d0923441130c6e8434f", decimals: 18, kind: "psm" },
    },
    psmMarkets: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", psm: "0x85ef0619bde5946b01d49b020c7b32184a237b5a", gemJoin: "0x07378fb289d3dff8c1dbf927fd1d7963886851c3", gem: "0x58c885900f2df7a1fb1cc1ec35dea9a1c786cac0", decimals: 6 },
      "PSM-USDC": { key: "PSM-USDC", label: "PSM USDC", psm: "0xecfc5ac8c893d805043f40de9ffb9f6233bfaeb0", gemJoin: "0x220e8833580f7dcd4c776609a1c58f7d3d49af0c", gem: "0x5e1cb96b9266fc11f335f2811142899e1b98b3f2", decimals: 6 },
      "PSM-USD1": { key: "PSM-USD1", label: "PSM USD1", psm: "0xa1aa6a20bc821fb9947ce3de7c902304a090f834", gemJoin: "0xfa4dd4d3cb5c09f377927c8d5605204a6a7fbea1", gem: "0x8e579139c704622092208d0923441130c6e8434f", decimals: 18 },
    },
  },
  bsc_testnet: {
    key: "bsc_testnet",
    label: "BNB Smart Chain Testnet (Internal)",
    kind: "evm",
    chainId: 97,
    rpcUrl: bscTestnetRpc,
    explorer: "https://testnet.bscscan.com",
    nativeSymbol: "BNB",
    serviceApiUrl: productionApiUrl,
    proxyRegistry: "0xfbbed7fa2bd12704d669bcee1a97b09accf1025e",
    proxyActions: "0xa611a3fcbf68dcd3b6b44c2868f66c42117f1a0e",
    cdpManager: "0xa94f77e6ff4aa8df842cf5234fe0bca102e243d4",
    vat: "0xf572a8b365cfc5aa4e9a2ce2619a66948a6d03b4",
    jug: "0x44ef489fb0dfff5bcfe54ed89e76dd61011781f9",
    dog: "0x17d72172cba912af4a5be39008211335e9cb1c37",
    spot: "0xe317abe722618759d3db3d4f313443d6f08ed4a3",
    usdd: "0x7977e803b57b8a3c1049cbdebfe664868b32b738",
    usddJoin: "0x46f5da3c9dd6510c6d0c146cda404857c3e775f6",
    savings: {
      susdd: "0x3b0804c4de1dc18b285c0035ff0bf54d84cf5bd7",
      pot: "0xfe00c7978faace0c4171e82ff748b4da8014d28f",
    },
    ilks: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", join: "0xdd6b2f77cd69dc37bec7ab0e092ad0711d5a3071", gem: "0x18a8a5783253b25854df9568df6b0eb942ca5c6c", decimals: 18, kind: "psm",       priceFeedKey: "usdt" },
      "PSM-USDC": { key: "PSM-USDC", label: "PSM USDC", join: "0x6f851bdcb3f0b39051512ba14cac59d26019ad19", gem: "0xc5988e213b62ed0257dba29730c68bf345dd4749", decimals: 18, kind: "psm" },
      "SA001-A":  { key: "SA001-A",  label: "SA001-A",  join: "0xadeaa55c19c078f1c46160e120dc364cc88fd449", gem: "0xa2f7b44a4f56995bad3a75f7afcd5fae7c3071e0", decimals: 18, kind: "synthetic" },
      "SA002-A":  { key: "SA002-A",  label: "SA002-A",  join: "0x6360b3aaa7709617fea607eff5a0fa86f6de3707", gem: "0x5d625f403c8d6fa0feac06b6f842cf4bcd1fe2bf", decimals: 18, kind: "synthetic" },
    },
    psmMarkets: {
      "PSM-USDT": { key: "PSM-USDT", label: "PSM USDT", psm: "0xa3c025a348aee3b15458c0866e0c35cf35507368", gemJoin: "0xdd6b2f77cd69dc37bec7ab0e092ad0711d5a3071", gem: "0x18a8a5783253b25854df9568df6b0eb942ca5c6c", decimals: 18 },
      "PSM-USDC": { key: "PSM-USDC", label: "PSM USDC", psm: "0xf671d499eb23dfa4ffaeaa65bf092d7850811b1f", gemJoin: "0x6f851bdcb3f0b39051512ba14cac59d26019ad19", gem: "0xc5988e213b62ed0257dba29730c68bf345dd4749", decimals: 18 },
    },
  },
};


export function getSupportedNetworks(): NetworkKey[] {
  return Object.keys(NETWORKS) as NetworkKey[];
}

export function getNetworkConfig(network: string = "tron"): NetworkConfig {
  const key = network.toLowerCase() as NetworkKey;
  const config = NETWORKS[key];
  if (!config) {
    throw new Error(`Unsupported network: ${network}. Supported: ${getSupportedNetworks().join(", ")}`);
  }
  return config;
}

export function getSupportedIlks(network: string = "tron"): IlkConfig[] {
  return Object.values(getNetworkConfig(network).ilks);
}

export function getSupportedPsmMarkets(network: string = "tron"): PsmMarketConfig[] {
  return Object.values(getNetworkConfig(network).psmMarkets);
}

export function getIlkConfig(ilk: string, network: string = "tron"): IlkConfig {
  const normalized = ilk.trim().toUpperCase();
  const config = getNetworkConfig(network);
  const found = Object.values(config.ilks).find((item) => item.key.toUpperCase() === normalized || item.label.toUpperCase() === normalized);
  if (!found) {
    throw new Error(`Unsupported ilk: ${ilk}. Use get_supported_ilks to inspect available collateral types.`);
  }
  return found;
}

export function getPsmMarketConfig(market: string, network: string = "tron"): PsmMarketConfig {
  const normalized = market.trim().toUpperCase();
  const config = getNetworkConfig(network);
  const found = Object.values(config.psmMarkets).find((item) => item.key.toUpperCase() === normalized || item.label.toUpperCase() === normalized);
  if (!found) {
    throw new Error(`Unsupported PSM market: ${market}. Use get_protocol_overview or get_supported_ilks to inspect configured markets.`);
  }
  return found;
}
