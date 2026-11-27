import { validateSpendingRules } from "@qorechain/sdk";
import type { Policy } from "./policy";

/**
 * The chain-side ceiling of the policy: a spending rule the chain itself enforces on the agent's linked key.
 * Even a compromised agent cannot pass it. Shape follows the SDK's SpendingRule.
 */
export function chainRuleFor(p: Policy, id = "veilbooks-steward") {
  const rule = {
    id,
    dailyLimit: p.hardDailyUqor,
    perTxLimit: p.hardPerInvoiceUqor,
    allowedDenoms: ["uqor"],
    enabled: true,
    allowedEvmCalls: [] as string[],
    denomLimits: [] as { denom: string; perTxLimit: string; dailyLimit: string }[],
  };
  validateSpendingRules([rule] as never);
  return rule;
}
