import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { agentLinkProof, linkAgentMessages, revokeAgentMessage, type Policy } from "../src/index";

const OWNER = "qor10fymynds2l93n07cnhkqqjggmavqzvrk6clclh";
const OTHER = "qor1wzazq8gtxnuhq9mj5x6h5phenvvmxe8c0jwdyc";
const policy: Policy = { version: 1, ownerPublicKeyHex: "00", perInvoiceUqor: "5000000", dailyUqor: "8000000", hardPerInvoiceUqor: "20000000", hardDailyUqor: "40000000", perSupplierDailyUqor: "6000000", allowedPayees: [], expiresUnix: 1_800_086_400 };

describe("agent link", () => {
  const pk = generatePrivateKey();
  it("builds link messages from a valid proof", () => {
    const msgs = linkAgentMessages(OWNER, agentLinkProof(OWNER, pk), policy);
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("a proof made for another owner does not link", () => {
    expect(() => linkAgentMessages(OWNER, agentLinkProof(OTHER, pk), policy)).toThrow(/does not verify/);
  });
  it("builds a revoke message", () => {
    expect(revokeAgentMessage(OWNER, privateKeyToAccount(pk).address).typeUrl).toMatch(/Authenticator/i);
  });
});
