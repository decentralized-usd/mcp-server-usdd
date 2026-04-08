# mcp-server-usdd

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Networks](https://img.shields.io/badge/Networks-TRON%20%7C%20ETH%20%7C%20BSC-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-3178C6)
![MCP](https://img.shields.io/badge/MCP-1.22.0+-blue)
![USDD](https://img.shields.io/badge/Protocol-USDD-green)

An MCP server for the **USDD protocol** across **TRON, Ethereum, and BNB Smart Chain**. The current version focuses on three core surfaces: **Vault/CDP**, **PSM**, and **DSR/sUSDD**.

## Scope

Current implementation focuses on:

- Vault lifecycle: open, deposit collateral, mint USDD, repay, withdraw, close
- PSM lifecycle: inspect fees, swap into USDD, swap out of USDD
- Savings lifecycle: inspect `DSR/sUSDD`, deposit, withdraw
- Risk and monitoring for vaults: summaries, oracle status, collateral buffers
- Token preflight checks: balances, allowances, approvals

## Supported Networks

| Network | Key | Notes |
|---|---|---|
| TRON | `tron` | TRON-native vault and PSM support |
| Ethereum | `eth` | Vault, PSM, `sUSDD`, `DSR` |
| BNB Smart Chain | `bsc` | Mirrors ETH deployment structure |

## Prerequisites

- Node.js 20+
- Optional but recommended:
  - `TRONGRID_API_KEY` for more reliable TRON access
  - dedicated `ETH_RPC_URL`
  - dedicated `BSC_RPC_URL`

## Developer

### Installation

```bash
git clone <your-repo-url>
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

### Wallet Setup (Automatic)

The server uses [@bankofai/agent-wallet](https://github.com/BofAI/agent-wallet) for encrypted local wallet storage. On first startup it will automatically initialize `~/.agent-wallet/` and create a default wallet if none exists.

On startup, the server will:
1. Check for existing wallets in `~/.agent-wallet/`
2. If none are found, auto-generate a new encrypted wallet
3. Display the derived TRON and EVM addresses in the console

You can also manage wallets via **CLI** or **MCP tools**:

#### CLI (agent-wallet)
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

#### MCP Tools (runtime)

| Tool | Description |
|------|-------------|
| `get_wallet_address` | Shows current address (auto-generates wallet if needed) |
| `import_wallet` | Import an existing private key (stored encrypted) |
| `list_wallets` | List all wallets with IDs, types, addresses |
| `set_active_wallet` | Switch active wallet by ID |

```bash
# Optional for automated/CI setups
export AGENT_WALLET_PASSWORD="your_wallet_password"

# Strongly recommended — avoids TronGrid 429 rate limiting on mainnet
export TRONGRID_API_KEY="your_trongrid_api_key"
```

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
      "args": ["tsx", "@usdd/mcp-server-usdd"],
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
      "args": ["tsx", "@usdd/mcp-server-usdd"],
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
      "args": ["tsx", "@usdd/mcp-server-usdd"],
      "env": {
        "TRONGRID_API_KEY": "your_trongrid_api_key"
      }
    }
  }
}
```


## Tools

### Common

| Tool | Description | Write? |
|---|---|---|
| `get_supported_networks` | List supported networks | No |
| `get_protocol_overview` | Show configured protocol addresses, ilks, PSMs, and ceilings | No |
| `get_supported_ilks` | List configured collateral types and PSM joins | No |
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
| `psm_swap_to_usdd` | Swap gem into USDD | Yes |
| `psm_swap_from_usdd` | Swap USDD into gem | Yes |

### DSR

| Tool | Description | Write? |
|---|---|---|
| `get_savings_status` | Show `sUSDD` / `DSR` metrics | No |
| `deposit_savings` | Deposit USDD into `sUSDD` | Yes |
| `withdraw_savings` | Withdraw USDD from `sUSDD` | Yes |

## Prompts

| Prompt | Description |
|---|---|
| `open_usdd_vault` | Open a vault and verify post-trade risk |
| `manage_vault_lifecycle` | Run full vault lifecycle flows |
| `use_psm` | Use PSM with fee checks |
| `use_savings` | Use `DSR/sUSDD` with inspection and verification |
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
│   │   └── services/
│   │       ├── clients.ts
│   │       ├── contracts.ts
│   │       ├── protocol.ts
│   │       ├── vault.ts
│   │       ├── psm.ts
│   │       ├── savings.ts
│   │       ├── tokens.ts
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
- ERC20/TRC20 flows often require `approve_token` first.
- TRON, ETH, and BSC deployments have similar USDD protocol structure but different addresses and token decimals.
- This version intentionally excludes migration and auction actions so we can iterate the Vault + PSM + DSR core first.

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

- "What vault types are available on Ethereum?" -> AI calls `get_supported_ilks` with `network=eth` and summarizes the supported vault collateral types.
- "Open a TRX-A vault on Tron and mint 500 USDD" -> AI uses `open_usdd_vault`: checks wallet, reviews oracle status, executes `deposit_and_mint`, then verifies the new vault risk.
- "Am I close to liquidation on vault 123?" -> AI calls `get_vault_summary` and `analyze_vault_risk`, then explains the health factor and collateral buffer.
- "Repay part of my vault debt on BSC" -> AI uses `manage_vault_lifecycle` with `action=repay`: checks USDD balance and allowance, calls `repay_usdd`, then verifies the updated vault state.
- "Close my vault and withdraw the collateral" -> AI uses `repay_and_close_vault`: checks debt, balance, allowance, calls `close_vault`, then confirms the vault state after repayment.
- "What are the current PSM fees on Ethereum?" -> AI calls `get_psm_status` with `network=eth` and reports fee-in, fee-out, and whether swaps are enabled.
- "Swap 10,000 USDT into USDD through the PSM" -> AI uses `use_psm`: checks PSM status, then calls `psm_swap_to_usdd` and reports the transaction result.
- "Swap 5,000 USDD back to USDC on BSC" -> AI calls `get_psm_status`, then executes `psm_swap_from_usdd` and reminds the user to re-check balances.
- "What is my USDD balance on Tron?" -> AI calls `get_protocol_overview` to identify the USDD token address, then calls `get_token_balance`.
- "Do I have enough allowance for the USDT PSM?" -> AI calls `check_allowance` with the token and PSM spender, then suggests `approve_token` only if needed.
- "What is the current DSR / sUSDD status on Ethereum?" -> AI calls `get_savings_status` and summarizes `chi`, `dsr`, total assets, and wallet shares.
- "Deposit 2,000 USDD into sUSDD" -> AI uses `use_savings`: checks savings status, calls `deposit_savings`, then re-checks savings metrics.
- "Withdraw 500 USDD from sUSDD on BSC" -> AI calls `get_savings_status`, executes `withdraw_savings`, and confirms the updated share balance.

## License

MIT License Copyright (c) 2026 USDD
