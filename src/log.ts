import { sha256 } from "@noble/hashes/sha2.js";
import { pqSign, pqVerify } from "@qorechain/qoresign";

export interface LogEntry {
  index: number;
  prevHash: string;
  timeUnix: number;
  invoiceId: string;
  action: "pay" | "escalate" | "reject" | "approved" | "denied";
  reasons: string[];
  policyDigest: string;
  hash: string;
  signatureHex: string;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => Uint8Array.from(s.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
const GENESIS = "00".repeat(32);

function body(e: Omit<LogEntry, "hash" | "signatureHex">): Uint8Array {
  return new TextEncoder().encode(JSON.stringify([e.index, e.prevHash, e.timeUnix, e.invoiceId, e.action, e.reasons, e.policyDigest]));
}

/** An append-only log. Each entry commits to the one before it and is signed by the agent's ML-DSA-87 key. */
export class DecisionLog {
  readonly entries: LogEntry[] = [];
  constructor(private readonly agentSecretKey: Uint8Array) {}

  append(x: Pick<LogEntry, "timeUnix" | "invoiceId" | "action" | "reasons" | "policyDigest">): LogEntry {
    const prev = this.entries[this.entries.length - 1];
    const partial = { index: this.entries.length, prevHash: prev?.hash ?? GENESIS, ...x };
    const b = body(partial);
    const e: LogEntry = { ...partial, hash: hex(sha256(b)), signatureHex: hex(pqSign(this.agentSecretKey, b)) };
    this.entries.push(e);
    return e;
  }
}

/** Check a whole log against the agent's public key. Returns the first problem, or null when sound. */
export function verifyLog(entries: LogEntry[], agentPublicKeyHex: string): string | null {
  let prev = GENESIS;
  for (const [i, e] of entries.entries()) {
    if (e.index !== i) return `entry ${i}: wrong index`;
    if (e.prevHash !== prev) return `entry ${i}: chain broken`;
    const b = body(e);
    if (hex(sha256(b)) !== e.hash) return `entry ${i}: hash does not match content`;
    if (!pqVerify(unhex(agentPublicKeyHex), b, unhex(e.signatureHex))) return `entry ${i}: bad signature`;
    prev = e.hash;
  }
  return null;
}
