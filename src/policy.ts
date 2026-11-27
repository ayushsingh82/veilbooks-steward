import { sha256 } from "@noble/hashes/sha2.js";
import { pqSign, pqVerify } from "@qorechain/qoresign";

/** What the owner allows the agent to do. All amounts are uqor, whole numbers. */
export interface Policy {
  version: 1;
  ownerPublicKeyHex: string;
  /** What the agent may pay by itself. */
  perInvoiceUqor: string;
  dailyUqor: string;
  /** Hard ceilings the chain enforces on the agent's key. Owner-approved payments may use room up to these. Must be >= the limits above. */
  hardPerInvoiceUqor: string;
  hardDailyUqor: string;
  perSupplierDailyUqor: string;
  /** Empty means any supplier. Otherwise only these qor1 addresses may be paid. */
  allowedPayees: string[];
  /** Unix seconds. The policy is void after this. */
  expiresUnix: number;
}

export interface SignedPolicy {
  policy: Policy;
  signatureHex: string;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const unhex = (s: string) => Uint8Array.from(s.match(/../g)?.map((h) => parseInt(h, 16)) ?? []);
const DOMAIN = "veilbooks-steward/policy/v1|";

export function policyBytes(p: Policy): Uint8Array {
  const o = { ...p, allowedPayees: [...p.allowedPayees].sort() };
  return new TextEncoder().encode(DOMAIN + JSON.stringify(o));
}

/** The owner signs with ML-DSA-87. The agent never holds this key. */
export function signPolicy(p: Policy, ownerSecretKey: Uint8Array): SignedPolicy {
  return { policy: p, signatureHex: hex(pqSign(ownerSecretKey, policyBytes(p))) };
}

export type PolicyCheck = { ok: true } | { ok: false; reason: string };

export function verifyPolicy(sp: SignedPolicy, expectedOwnerPublicKeyHex: string, nowUnix: number): PolicyCheck {
  if (sp.policy.ownerPublicKeyHex !== expectedOwnerPublicKeyHex) return { ok: false, reason: "policy is not for the expected owner" };
  if (!pqVerify(unhex(expectedOwnerPublicKeyHex), policyBytes(sp.policy), unhex(sp.signatureHex))) return { ok: false, reason: "bad owner signature" };
  if (nowUnix >= sp.policy.expiresUnix) return { ok: false, reason: "policy expired" };
  return { ok: true };
}

export const policyDigest = (p: Policy): string => hex(sha256(policyBytes(p)));
