import type { Policy } from "./policy";

export interface InvoiceToPay {
  id: string;
  payee: string;
  amountUqor: string;
  /** Free text from the supplier. It is never read as an instruction. */
  memo?: string;
}

export interface Spent {
  /** Total paid today (UTC day), uqor. */
  today: bigint;
  /** Paid today per payee. */
  todayByPayee: Record<string, bigint>;
  /** Invoice ids already paid. */
  paid: Set<string>;
}

export type Decision =
  | { action: "pay"; reasons: [] }
  | { action: "escalate"; reasons: string[] } // waits for the owner
  | { action: "reject"; reasons: string[] };

/**
 * Decide from the signed policy and the numbers alone.
 * The memo and any other free text are ignored on purpose: nothing a supplier writes can widen a limit.
 */
export function decide(inv: InvoiceToPay, p: Policy, spent: Spent): Decision {
  if (!/^[1-9]\d*$/.test(inv.amountUqor)) return { action: "reject", reasons: ["amount is not a positive whole number"] };
  if (spent.paid.has(inv.id)) return { action: "reject", reasons: ["invoice already paid"] };
  if (p.allowedPayees.length > 0 && !p.allowedPayees.includes(inv.payee)) return { action: "reject", reasons: ["payee is not on the allowed list"] };

  const amt = BigInt(inv.amountUqor);
  const over: string[] = [];
  if (amt > BigInt(p.perInvoiceUqor)) over.push(`over the per-invoice limit (${p.perInvoiceUqor})`);
  if (spent.today + amt > BigInt(p.dailyUqor)) over.push(`would pass the daily limit (${p.dailyUqor})`);
  if ((spent.todayByPayee[inv.payee] ?? 0n) + amt > BigInt(p.perSupplierDailyUqor)) over.push(`would pass the per-supplier daily limit (${p.perSupplierDailyUqor})`);
  return over.length ? { action: "escalate", reasons: over } : { action: "pay", reasons: [] };
}
