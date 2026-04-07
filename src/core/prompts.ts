import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const promptNetworkField = z.enum(["tron", "eth", "bsc"]).optional();

export function registerUsddPrompts(server: McpServer) {
  server.registerPrompt("open_usdd_vault", {
    description: "Safely open a USDD vault, deposit collateral, mint USDD, and verify risk.",
    argsSchema: {
      network: promptNetworkField,
      ilk: z.string(),
      collateralAmount: z.string(),
      drawAmount: z.string(),
    },
  }, ({ network = "tron", ilk, collateralAmount, drawAmount }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `# Open USDD Vault

Target network: ${network}
Collateral type: ${ilk}
Collateral amount: ${collateralAmount}
Draw amount: ${drawAmount} USDD

Steps:
1. Call \`get_wallet_address\` to confirm the active wallet.
2. Call \`get_oracle_status\` for ${ilk} and summarize liquidation ratio and oracle freshness.
3. Call \`deposit_and_mint\` with the provided parameters.
4. Call \`get_user_vaults\` and identify the newest vault.
5. Call \`analyze_vault_risk\` for that vault and report the health factor, debt, and warnings.

Stop if the resulting health factor is near liquidation.`,
      },
    }],
  }));

  server.registerPrompt("manage_vault_lifecycle", {
    description: "Guide the full USDD vault lifecycle: approval, open/add collateral, draw, repay, withdraw, close.",
    argsSchema: {
      network: promptNetworkField,
      ilk: z.string(),
      cdpId: z.string().optional(),
      action: z.enum(["open_and_mint", "add_collateral_and_mint", "repay", "withdraw", "close"]),
      collateralAmount: z.string().optional(),
      drawAmount: z.string().optional(),
      repayAmount: z.string().optional(),
      withdrawAmount: z.string().optional(),
    },
  }, ({ network = "tron", ilk, cdpId, action, collateralAmount, drawAmount, repayAmount, withdrawAmount }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `# Manage USDD Vault Lifecycle

Network: ${network}
Ilk: ${ilk}
Action: ${action}
Vault: ${cdpId || "(new vault)"}

Always do these checks first:
1. Call \`get_wallet_address\`.
2. Call \`get_oracle_status\` for ${ilk}.
3. If the collateral is ERC20/TRC20, call \`get_supported_ilks\`, find the gem token for ${ilk}, then call \`get_token_balance\` and \`check_allowance\`.
4. If the action uses USDD repayment, call \`get_protocol_overview\` to get the USDD token address, then call \`get_token_balance\` and \`check_allowance\` for the USDD join or relevant spender.

Action branch:
- open_and_mint:
  Call \`deposit_and_mint\` with collateralAmount='${collateralAmount || ""}' and drawAmount='${drawAmount || ""}' and no cdpId.
- add_collateral_and_mint:
  Call \`deposit_and_mint\` with cdpId='${cdpId || ""}', collateralAmount='${collateralAmount || ""}', drawAmount='${drawAmount || ""}'.
- repay:
  Call \`repay_usdd\` with cdpId='${cdpId || ""}' and amount='${repayAmount || ""}'.
- withdraw:
  Call \`withdraw_collateral\` with cdpId='${cdpId || ""}', ilk='${ilk}', amount='${withdrawAmount || ""}'.
- close:
  Call \`close_vault\` with cdpId='${cdpId || ""}', ilk='${ilk}', amountToFree='${withdrawAmount || collateralAmount || ""}'.

After any state-changing step:
1. Call \`get_vault_summary\`.
2. Call \`analyze_vault_risk\`.
3. Report health factor, debt, collateral buffer, and whether another approval or balance top-up is needed.`,
      },
    }],
  }));

  server.registerPrompt("use_psm", {
    description: "Swap through the PSM with a fee check before execution.",
    argsSchema: {
      network: promptNetworkField,
      market: z.string(),
      direction: z.enum(["to_usdd", "from_usdd"]),
      amount: z.string(),
    },
  }, ({ network = "tron", market, direction, amount }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `# Use USDD PSM

Network: ${network}
Market: ${market}
Direction: ${direction}
Amount: ${amount}

1. Call \`get_psm_status\` first and report current fees plus buy/sell enablement.
2. If direction is \`to_usdd\`, call \`psm_swap_to_usdd\`.
3. If direction is \`from_usdd\`, call \`psm_swap_from_usdd\`.
4. Report the transaction id and remind the user to re-check balances.`,
      },
    }],
  }));

  server.registerPrompt("use_savings", {
    description: "Inspect and use DSR/sUSDD on supported networks.",
    argsSchema: {
      network: promptNetworkField,
      action: z.enum(["deposit", "withdraw", "inspect"]),
      amount: z.string().optional(),
    },
  }, ({ network = "tron", action, amount }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `# Use USDD Savings

Network: ${network}
Action: ${action}
Amount: ${amount || ""}

1. Call \`get_savings_status\` first and summarize whether savings is supported plus the current DSR/sUSDD metrics.
2. If action is \`deposit\`, call \`deposit_savings\` with amount='${amount || ""}'.
3. If action is \`withdraw\`, call \`withdraw_savings\` with amount='${amount || ""}'.
4. After a write, call \`get_savings_status\` again and report the updated wallet shares and totals.`,
      },
    }],
  }));

  server.registerPrompt("review_vault_risk", {
    description: "Audit a vault and explain liquidation risk in plain language.",
    argsSchema: {
      network: promptNetworkField,
      cdpId: z.string(),
    },
  }, ({ network = "tron", cdpId }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `# Review USDD Vault Risk

Network: ${network}
Vault id: ${cdpId}

1. Call \`get_vault_summary\`.
2. Call \`get_oracle_status\` for the vault's ilk.
3. Call \`analyze_vault_risk\`.
4. Explain current debt, collateral buffer, liquidation ratio, and what the user should do next.`,
      },
    }],
  }));

  server.registerPrompt("repay_and_close_vault", {
    description: "Safely repay USDD and close a vault with post-close verification.",
    argsSchema: {
      network: promptNetworkField,
      cdpId: z.string(),
      ilk: z.string(),
      amountToFree: z.string(),
    },
  }, ({ network = "tron", cdpId, ilk, amountToFree }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `# Repay And Close USDD Vault

Network: ${network}
Vault id: ${cdpId}
Ilk: ${ilk}
Collateral to free: ${amountToFree}

1. Call \`get_vault_summary\` and state the current debt.
2. Call \`get_protocol_overview\` and identify the USDD token address.
3. Call \`get_token_balance\` for that USDD token.
4. Call \`check_allowance\` for the USDD token against the relevant spender if repayment needs approval.
5. If approval is insufficient, call \`approve_token\`.
6. Call \`close_vault\`.
7. Call \`get_user_vaults\` and \`get_vault_summary\` again if the vault still exists.
8. Report whether debt is cleared and whether collateral was fully released.`,
      },
    }],
  }));
}
