import { decide, type Decision, type InvoiceToPay, type Spent } from "./decide";
import { DecisionLog } from "./log";
import { pqVerify } from "@qorechain/qoresign";
import { policyDigest, verifyPolicy, type SignedPolicy } from "./policy";

const unhex = (s: string) => Uint8Array.from(s.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);

/** What the owner signs to approve (or deny) one queued invoice. Binds the invoice, its amount, its payee and the policy. */
export function approvalBytes(verb: "approve" | "deny", inv: InvoiceToPay, digest: string): Uint8Array {
  return new TextEncoder().encode(`veilbooks-steward/${verb}/v1|${digest}|${inv.id}|${inv.payee}|${inv.amountUqor}`);
}
import { sanitizePlan, type Planner, type PlanItem } from "./planner";

/** Moves money. In production this is the chain call made with the linked key; tests use a fake. */
export interface Executor {
  pay(inv: InvoiceToPay): Promise<{ txHash: string }>;
}

export interface QueueItem {
  invoice: InvoiceToPay;
  reasons: string[];
}

export interface RunResult {
  paid: { invoiceId: string; txHash: string }[];
  queued: QueueItem[];
  rejected: { invoiceId: string; reasons: string[] }[];
  held: { invoiceId: string; note: string }[];
  plannerUsed: string;
  refused?: string;
}

export class Steward {
  readonly spent: Spent = { today: 0n, todayByPayee: {}, paid: new Set() };
  readonly queue = new Map<string, QueueItem>();

  constructor(
    private readonly signed: SignedPolicy,
    private readonly ownerPublicKeyHex: string,
    private readonly log: DecisionLog,
    private readonly executor: Executor,
    private readonly planners: Planner[],
    private readonly now: () => number = () => Math.floor(Date.now() / 1000),
  ) {}

  private async plan(invoices: (InvoiceToPay & { dueUnix: number })[]): Promise<{ items: PlanItem[]; used: string }> {
    for (const p of this.planners) {
      try {
        const items = sanitizePlan(await p.plan({ invoices }), { invoices });
        return { items, used: p.name };
      } catch {
        /* try the next planner */
      }
    }
    return { items: [], used: "none" };
  }

  private async settle(inv: InvoiceToPay, digest: string, approvedByOwner: boolean, out?: RunResult) {
    const { txHash } = await this.executor.pay(inv);
    const amt = BigInt(inv.amountUqor);
    this.spent.today += amt;
    this.spent.todayByPayee[inv.payee] = (this.spent.todayByPayee[inv.payee] ?? 0n) + amt;
    this.spent.paid.add(inv.id);
    this.log.append({ timeUnix: this.now(), invoiceId: inv.id, action: approvedByOwner ? "approved" : "pay", reasons: [txHash], policyDigest: digest });
    out?.paid.push({ invoiceId: inv.id, txHash });
  }

  /** Process a batch of invoices. Refuses everything if the owner's policy does not verify. */
  async run(invoices: (InvoiceToPay & { dueUnix: number })[]): Promise<RunResult> {
    const out: RunResult = { paid: [], queued: [], rejected: [], held: [], plannerUsed: "none" };
    const check = verifyPolicy(this.signed, this.ownerPublicKeyHex, this.now());
    if (!check.ok) return { ...out, refused: check.reason };
    const digest = policyDigest(this.signed.policy);

    const { items, used } = await this.plan(invoices);
    out.plannerUsed = used;
    const byId = new Map(invoices.map((i) => [i.id, i]));
    // Invoices the planner did not mention are still processed, last, in input order.
    const order = [...items, ...invoices.filter((i) => !items.some((x) => x.invoiceId === i.id)).map((i) => ({ invoiceId: i.id, intent: "pay" as const, note: "" }))];

    for (const item of order) {
      const inv = byId.get(item.invoiceId)!;
      if (item.intent === "hold") {
        this.log.append({ timeUnix: this.now(), invoiceId: inv.id, action: "escalate", reasons: [`held by planner: ${item.note}`], policyDigest: digest });
        this.queue.set(inv.id, { invoice: inv, reasons: [`held by planner: ${item.note}`] });
        out.held.push({ invoiceId: inv.id, note: item.note });
        continue;
      }
      const d: Decision = decide(inv, this.signed.policy, this.spent);
      if (d.action === "pay") await this.settle(inv, digest, false, out);
      else if (d.action === "escalate") {
        this.log.append({ timeUnix: this.now(), invoiceId: inv.id, action: "escalate", reasons: d.reasons, policyDigest: digest });
        const q = { invoice: inv, reasons: d.reasons };
        this.queue.set(inv.id, q);
        out.queued.push(q);
      } else {
        this.log.append({ timeUnix: this.now(), invoiceId: inv.id, action: "reject", reasons: d.reasons, policyDigest: digest });
        out.rejected.push({ invoiceId: inv.id, reasons: d.reasons });
      }
    }
    return out;
  }

  /**
   * The owner approves a queued invoice with an ML-DSA-87 signature over `approvalBytes("approve", ...)`.
   * Without a valid signature nothing is paid. The chain ceiling still applies after approval.
   */
  async approve(invoiceId: string, ownerSignatureHex: string): Promise<void> {
    const q = this.queue.get(invoiceId);
    if (!q) throw new Error("not in the approval queue");
    const digest = policyDigest(this.signed.policy);
    if (!pqVerify(unhex(this.ownerPublicKeyHex), approvalBytes("approve", q.invoice, digest), unhex(ownerSignatureHex))) throw new Error("bad owner signature on approval");
    const amt = BigInt(q.invoice.amountUqor);
    if (amt > BigInt(this.signed.policy.hardPerInvoiceUqor) || this.spent.today + amt > BigInt(this.signed.policy.hardDailyUqor)) throw new Error("above the chain ceiling");
    this.queue.delete(invoiceId);
    await this.settle(q.invoice, policyDigest(this.signed.policy), true);
  }

  deny(invoiceId: string, ownerSignatureHex: string): void {
    const q = this.queue.get(invoiceId);
    if (!q) throw new Error("not in the approval queue");
    if (!pqVerify(unhex(this.ownerPublicKeyHex), approvalBytes("deny", q.invoice, policyDigest(this.signed.policy)), unhex(ownerSignatureHex))) throw new Error("bad owner signature on denial");
    this.queue.delete(invoiceId);
    this.log.append({ timeUnix: this.now(), invoiceId, action: "denied", reasons: ["owner denied"], policyDigest: policyDigest(this.signed.policy) });
  }
}
