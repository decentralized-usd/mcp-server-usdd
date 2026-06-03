# mcp-server-usdd

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Networks](https://img.shields.io/badge/Networks-TRON%20%7C%20ETH%20%7C%20BSC%20%7C%20INTERNAL%20TESTNETS-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6)
![MCP](https://img.shields.io/badge/MCP-1.22.0+-blue)
![USDD](https://img.shields.io/badge/Protocol-USDD-green)

An MCP server for the **USDD protocol** across **TRON, Ethereum, and BNB Smart Chain** (plus internal testnets). Covers **Vault/CDP**, **PSM**, **USDD Savings**, **token transfers**, and **protocol analytics**.

## Scope

Current implementation covers:

- Vault lifecycle: open, deposit collateral, mint USDD, repay, withdraw, close
- PSM lifecycle: inspect fees and routes, swap into USDD, swap out of USDD
- Savings lifecycle: inspect USDD Savings, deposit, withdraw
- Risk and monitoring for vaults: summaries, oracle status, collateral buffers
- Token preflight checks: balances, allowances, approvals
- Token transfers: two-step preview → confirm flow for TRX, TRC20, and EVM native/ERC20
- Protocol analytics: chain metrics, collateral prices, PSM route metrics, treasury, Smart Allocator, proof of reserve

## Supported Networks

| Network | Key | Notes |
|---|---|---|
| TRON | `tron` | TRON-native vault and PSM support |
| Ethereum | `eth` | Vault, PSM, USDD Savings |
| BNB Smart Chain | `bsc` | Mirrors ETH deployment structure |
| TRON Nile | `tron_nile` | Internal testnet deployment |
| Ethereum Sepolia  | `eth_sepolia` | Internal testnet deployment |
| BSC Testnet | `bsc_testnet` | Internal testnet deployment |

## Prerequisites

- Node.js 20+
- Optional but recommended:
  - `TRONGRID_API_KEY` for more reliable TRON access
  - dedicated `TRON_FULL_NODE` and `TRON_NILE_FULL_NODE`
  - dedicated `ETH_RPC_URL`
  - dedicated `BSC_RPC_URL`
  - dedicated `ETH_SEPOLIA_RPC_URL` and `BSC_TESTNET_RPC_URL`

## Developer

### Installation

```bash
git clone https://github.com/decentralized-usd/mcp-server-usdd
cd mcp-server-usdd
npm install
```

### Usage

```bash
npm start
npm run start:http
npm run dev
```

## Configuration

### Wallet Modes

The server supports two signing modes:

- **Browser mode (recommended)**: connect a TronLink-compatible browser wallet and sign in browser.
- **Agent mode**: use encrypted local private keys stored in `~/.agent-wallet/`.

For TRON writes, each Claude session shows a one-time signing-mode confirmation reminder before the first write.

You can also manage wallets via CLI or MCP tools:

#### CLI (agent-wallet)

The server uses [@bankofai/agent-wallet](https://github.com/BofAI/agent-wallet) for encrypted local wallet storage. On first startup it will automatically initialize ~/.agent-wallet/ and create a default wallet if none exists.

```bash
# Import an existing private key or mnemonic
npx agent-wallet add

# Generate a new wallet
npx agent-wallet generate

# List all wallets
npx agent-wallet list

# Switch active wallet
npx agent-wallet activate <wallet-id>
```

### MCP Tools (runtime)

| Tool | Description |
|------|-------------|
| `get_wallet_address` | Shows current address |
| `connect_browser_wallet` | Connect TronLink / browser wallet for signing |
| `set_wallet_mode` | Switch between browser and agent signing |
| `get_wallet_mode` | Show current signing mode and addresses |
| `list_wallets` | List wallets with per-family active status (`tron` and `evm`) |
| `set_active_wallet` | Switch active wallet by ID, optionally scoped by `walletType` (`tron`/`evm`) |


## Client Configuration

### Claude Desktop

Add the following config to:

`~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-server-usdd": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@usdd/mcp-server-usdd"],
      "env": {
        "TRONGRID_API_KEY": "your_trongrid_api_key"
      }
    }
  }
}
```

### Claude Code

Create `.mcp.json` in the project root directory:

```json
{
  "mcpServers": {
    "mcp-server-usdd": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@usdd/mcp-server-usdd"],
      "env": {
        "TRONGRID_API_KEY": "your_trongrid_api_key"
      }
    }
  }
}
```


### Cursor

Add to .cursor/mcp.json:

```json
{
  "mcpServers": {
    "mcp-server-usdd": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@usdd/mcp-server-usdd"],
      "env": {
        "TRONGRID_API_KEY": "your_trongrid_api_key"
      }
    }
  }
}
```

For live RPC reads, the server also accepts `TRON_FULL_NODE`, `TRON_NILE_FULL_NODE`, `ETH_RPC_URL`, `ETH_SEPOLIA_RPC_URL`, `BSC_RPC_URL`, and `BSC_TESTNET_RPC_URL`. Use `get_protocol_addresses` when only deployment addresses are needed; it does not call RPC endpoints and is unaffected by public RPC rate limits.


## Tools

### Wallet & Network

| Tool | Description | Write? |
|---|---|---|
| `get_supported_networks` | List supported networks | No |
| `set_network` | Set default network for one family (`tron`/`eth`/`bsc`), supports aliases like `mainnet`, `nile` | Yes |
| `get_network` | Get per-family default networks | No |
| `get_wallet_mode` | Get active wallet signing mode (`agent`/`browser`) | No |
| `set_wallet_mode` | Switch active signing mode | Yes |
| `connect_browser_wallet` | Connect a browser wallet and activate browser mode | Yes |
| `get_wallet_address` | Show current address for the target network | No |
| `list_wallets` | List wallets and per-family active pointers (`tron`/`evm`) | No |
| `set_active_wallet` | Switch active wallet by ID (supports optional `walletType`) | Yes |
| `import_wallet` | Import private key/mnemonic into encrypted local store | Yes |

### Common

| Tool | Description | Write? |
|---|---|---|
| `get_protocol_addresses` | Show static deployment addresses, configured ilks, and PSM markets without RPC reads | No |
| `get_protocol_overview` | Show live protocol ceilings and debt metrics alongside configured deployments | No |
| `get_supported_ilks` | List configured collateral types and PSM joins | No |
| `get_native_balance` | Read native balance (`TRX` / `ETH` / `BNB`) | No |
| `get_token_balance` | Read ERC20/TRC20 balance | No |
| `check_allowance` | Read ERC20/TRC20 allowance and compare against an optional amount | No |
| `approve_token` | Approve token allowance | Yes |

### Vault

| Tool | Description | Write? |
|---|---|---|
| `get_oracle_status` | Inspect oracle and liquidation configuration for an ilk | No |
| `get_user_vaults` | List vault IDs for a wallet | No |
| `get_vault_summary` | Show collateral, debt, and liquidation metrics | No |
| `analyze_vault_risk` | Summarize risk with warnings | No |
| `open_vault` | Open a new vault via DSProxy | Yes |
| `deposit_and_mint` | Open-and-mint or add collateral and mint | Yes |
| `mint_usdd` | Draw more USDD from a vault | Yes |
| `repay_usdd` | Repay vault debt | Yes |
| `withdraw_collateral` | Withdraw collateral from a vault | Yes |
| `close_vault` | Wipe all debt and free collateral | Yes |

### PSM

| Tool | Description | Write? |
|---|---|---|
| `get_psm_status` | Inspect PSM fees and enablement | No |
| `get_psm_metrics` | Get PSM swap metrics by route (fromToken/toToken/available/fee) | No |
| `psm_swap_to_usdd` | Swap gem into USDD | Yes |
| `psm_swap_from_usdd` | Swap USDD into gem | Yes |

### USDD Savings

| Tool | Description | Write? |
|---|---|---|
| `get_savings_status` | Show USDD Savings metrics | No |
| `deposit_savings` | Deposit USDD into `sUSDD` | Yes |
| `withdraw_savings` | Withdraw USDD from `sUSDD` | Yes |

### Token Transfers

Two-step preview → confirm flow for safe asset transfers. The AI **must** present the transfer details to the user and wait for explicit confirmation before executing.

| Tool | Description | Write? |
|---|---|---|
| `prepare_token_transfer` | Preview a native or token transfer; returns a `confirmationId` and transfer details for user review | No |
| `confirm_token_transfer` | Execute a previously prepared transfer after user has explicitly confirmed | Yes |

Supports:
- **TRX** (TRON native)
- **TRC20** tokens (USDD, USDT, WBTC, etc.)
- **ETH / BNB** (EVM native)
- **ERC20** tokens on Ethereum and BSC

### Protocol Metrics

Read-only analytics from mainnet data feeds.

| Tool | Description | Write? |
|---|---|---|
| `get_protocol_metrics` | Aggregated USDD protocol metrics (mainnet) | No |
| `get_chain_metrics` | Chain-level metrics for `tron`, `eth`, or `bsc` | No |
| `get_collateral_prices` | Latest collateral highest-price data from website API | No |
| `get_psm_metrics` | PSM route metrics: fromToken, toToken, available liquidity, fees | No |

### Treasury

| Tool | Description | Write? |
|---|---|---|
| `get_treasury_summary` | Latest USDD treasury report summary (mainnet) | No |
| `get_jst_buyback_stats` | JST buyback and burn statistics from treasury data | No |

### Smart Allocator

| Tool | Description | Write? |
|---|---|---|
| `get_smart_allocator_overview` | Smart Allocator overview: debt, invested amount, earnings, APY | No |
| `get_assets_breakdown` | Invested-asset breakdown by `protocol`, `network`, or `asset` | No |
| `get_proof_of_reserve` | Proof-of-reserve style platform investment details | No |
| `get_debt_overview` | Debt overview grouped by network vault | No |

## Prompts

| Prompt | Description |
|---|---|
| `open_usdd_vault` | Open a vault and verify post-trade risk |
| `manage_vault_lifecycle` | Run full vault lifecycle flows |
| `use_psm` | Use PSM with fee checks |
| `use_savings` | Use USDD Savings with inspection and verification |
| `review_vault_risk` | Explain risk for a vault |
| `repay_and_close_vault` | Repay and close with verification |

## Architecture

```text
mcp-server-usdd/
├── src/
│   ├── core/
│   │   ├── chains.ts
│   │   ├── abis.ts
│   │   ├── tools.ts
│   │   ├── prompts.ts
│   │   ├── resources.ts
│   │   ├── browser-signer.ts
│   │   └── services/
│   │       ├── clients.ts
│   │       ├── contracts.ts
│   │       ├── protocol.ts
│   │       ├── vault.ts
│   │       ├── psm.ts
│   │       ├── savings.ts
│   │       ├── tokens.ts
│   │       ├── transfer.ts        ← token/native transfer (prepare + confirm)
│   │       ├── treasury.ts        ← treasury report and JST buyback stats
│   │       ├── smart-allocator.ts ← Smart Allocator analytics
│   │       ├── website-metrics.ts ← protocol metrics, chain metrics, collateral prices
│   │       ├── wallet.ts
│   │       └── utils.ts
│   ├── index.ts
│   └── server/
│       ├── server.ts
│       └── http-server.ts
└── build/
```

## Notes

- Vault writes assume the configured wallet can sign on the target chain.
- Chain-dependent tools require an explicit `network` argument. If the user has not named a chain, ask which network to use before calling any chain-dependent tool; do not infer TRON or use `set_network` defaults as an implicit choice.
- ERC20/TRC20 flows often require `approve_token` first.
- Browser mode now supports real transaction signing on TRON networks (`tron`, `tron_nile`) via `tronlink-signer` (TronLink/TIP-6963 flow). EVM networks currently continue to use agent-wallet signing.
- `deposit_and_mint` is idempotent with respect to vault creation: it checks for an existing vault for the given ilk before opening a new one. If no vault exists, it submits two separate transactions — `open` then `lockGemAndDraw` — to avoid combined-tx reliability issues on TRON.
- Token transfers use a two-step flow: `prepare_token_transfer` returns a preview and `confirmationId`; `confirm_token_transfer` executes only after the user explicitly approves. Pending confirmations expire after 10 minutes.
- Protocol analytics tools (`get_protocol_metrics`, `get_chain_metrics`, `get_collateral_prices`, etc.) read from mainnet data feeds only — they do not reflect testnet state.
- TRON, ETH, BSC, and internal testnet deployments have similar protocol structure but different addresses and token decimals.
- This version intentionally excludes migration and auction actions so we can iterate the Vault + PSM + USDD Savings core first.

## Security Considerations

- Private keys are encrypted and stored locally in `~/.agent-wallet/`.
- Private keys are never returned by MCP tools.
- The optional `AGENT_WALLET_PASSWORD` is intended for automation and CI environments.
- Write operations should be treated as state-changing actions and reviewed carefully before execution.
- Vault prompts include risk-review steps so borrowing decisions are checked against current collateral health.
- Test on a safe environment or with small amounts before using mainnet-sized positions.
- Be cautious with large or unlimited token approvals when using `approve_token`.
- Never share local MCP client configuration files if they contain private keys or sensitive RPC credentials.

## Example Conversations

**Vault**
- "What vault types are available on Ethereum?" → AI calls `get_supported_ilks` with `network=eth` and summarizes the supported vault collateral types.
- "Open a TRX-A/USDT-A/WBTC-A vault on Tron and mint 500 USDD" → AI uses `open_usdd_vault`: checks wallet, reviews oracle status, executes `deposit_and_mint` (auto-opens a new vault if none exists for that ilk), then verifies the new vault risk.
- "Am I close to liquidation on vault 123?" → AI calls `get_vault_summary` and `analyze_vault_risk`, then explains the health factor and collateral buffer.
- "Repay part of my vault debt on BSC" → AI uses `manage_vault_lifecycle` with `action=repay`: checks USDD balance and allowance, calls `repay_usdd`, then verifies the updated vault state.
- "Close my vault and withdraw the collateral" → AI uses `repay_and_close_vault`: checks debt, balance, allowance, calls `close_vault`, then confirms the vault state after repayment.

**PSM**
- "What are the current PSM fees on Ethereum?" → AI calls `get_psm_status` with `network=eth` and reports fee-in, fee-out, and whether swaps are enabled.
- "Show me available PSM liquidity for USDT on TRON" → AI calls `get_psm_metrics` with the PSM-USDT market and reports available amounts and fees for both directions.
- "Swap 10,000 USDT into USDD through the PSM" → AI uses `use_psm`: checks PSM status, then calls `psm_swap_to_usdd` and reports the transaction result.
- "Swap 5,000 USDD back to USDC on BSC" → AI calls `get_psm_status`, then executes `psm_swap_from_usdd` and reminds the user to re-check balances.

**Token & Balances**
- "What is my USDD balance on Tron?" → AI calls `get_protocol_addresses` to identify the USDD token address without an RPC read, then calls `get_token_balance`.
- "Do I have enough allowance for the USDT PSM?" → AI calls `check_allowance` with the token and PSM spender, then suggests `approve_token` only if needed.
- "Send 100 USDD to TXxxx... on Tron" → AI calls `prepare_token_transfer` and displays the transfer preview (from, to, amount, balance). After the user confirms, AI calls `confirm_token_transfer` to execute.
- "Transfer 0.5 ETH to 0xabc..." → AI calls `prepare_token_transfer` for native ETH, presents the details, then waits for user approval before executing.

**USDD Savings**
- "What is the current USDD Savings status on Ethereum?" → AI calls `get_savings_status` and summarizes total assets, savings rate, and wallet shares.
- "Deposit 2,000 USDD into sUSDD" → AI uses `use_savings`: checks savings status, calls `deposit_savings`, then re-checks savings metrics.
- "Withdraw 500 USDD from sUSDD on BSC" → AI calls `get_savings_status`, executes `withdraw_savings`, and confirms the updated share balance.

**Protocol Analytics**
- "What are the overall USDD protocol metrics?" → AI calls `get_protocol_metrics` and reports total collateral, debt ceiling, and utilization.
- "Show me TRON chain metrics" → AI calls `get_chain_metrics` with `chain=tron` and summarizes collateral breakdown and USDD supply on TRON.
- "What are the latest collateral prices?" → AI calls `get_collateral_prices` and lists each collateral type with its current highest price.

**Treasury & Smart Allocator**
- "Show me the USDD treasury summary" → AI calls `get_treasury_summary` and reports reserve breakdown, collateral ratio, and recent changes.
- "How much JST has been bought back and burned?" → AI calls `get_jst_buyback_stats` and summarizes cumulative JST buyback volume and burn totals.
- "What is the Smart Allocator overview?" → AI calls `get_smart_allocator_overview` and reports total debt allocated, current invested amount, accumulated earnings, and APY.
- "Break down Smart Allocator investments by protocol" → AI calls `get_assets_breakdown` with `dimension=protocol` and lists each DeFi protocol with its allocated amount.
- "Show me the Smart Allocator proof of reserve" → AI calls `get_proof_of_reserve` and details each platform investment with amounts and verification status.
- "What does the Smart Allocator debt look like by network?" → AI calls `get_debt_overview` and summarizes debt positions grouped by TRON/ETH/BSC vaults.

## License

MIT License Copyright (c) 2026 USDD
