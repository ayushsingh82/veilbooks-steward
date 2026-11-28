/**
 * Steward on the QoreChain testnet: link the agent's key to the owner's account with the policy's spending rule,
 * make one payment with the linked key, read the result, and revoke.
 *
 *   npx tsx scripts/onchain.ts link     owner signs the link (hybrid ML-DSA-87); agent key is created on first use
 *   npx tsx scripts/onchain.ts pay <qor1 payee> <uqor>    agent signs, the relayer (operator) broadcasts
 *   npx tsx scripts/onchain.ts status
 *   npx tsx scripts/onchain.ts revoke
 *
 * This pays what it is told, so it shows the chain ceiling. For the decision engine in front of the chain, see agent-run.ts.
 */
import { agentLinkProof, linkAgentMessages, revokeAgentMessage } from "../src/chain";
import type { Policy } from "../src/policy";
import { chain } from "./chainlib";

async function main() {
  const [cmd, a1, a2] = process.argv.slice(2);
  const c = await chain();

  const policy: Policy = {
    version: 1, ownerPublicKeyHex: "00", perInvoiceUqor: "5000000", dailyUqor: "8000000",
    hardPerInvoiceUqor: "20000000", hardDailyUqor: "40000000", perSupplierDailyUqor: "6000000",
    allowedPayees: [], expiresUnix: Math.floor(Date.now() / 1000) + 7 * 86400,
  };

  if (cmd === "link") {
    const tx = await c.connect();
    const res = await tx.signAndBroadcast(linkAgentMessages(c.owner, agentLinkProof(c.owner, c.pk), policy), "auto", "veilbooks-steward link");
    console.log("linked agent", c.agent.address, "to", c.owner, "tx", res.transactionHash ?? JSON.stringify(res));
  } else if (cmd === "pay") {
    if (!a1 || !a2) throw new Error("usage: pay <qor1 payee> <uqor>");
    const r = await c.pay(a1, a2);
    if (r.ok) console.log("agent paid", `${a2}uqor`, "to", a1, "tx", r.hash);
    else console.log("REFUSED by the chain:", r.reason, "tx", r.hash);
  } else if (cmd === "status") {
    const n = await c.status();
    console.log("owner", c.owner, "agent", c.agent.address, "linked", n.linked, "next nonce", String(n.nonce));
  } else if (cmd === "revoke") {
    const tx = await c.connect();
    const res = await tx.signAndBroadcast([revokeAgentMessage(c.owner, c.agent.address)], "auto", "veilbooks-steward revoke");
    console.log("revoked", c.agent.address, "tx", res.transactionHash ?? JSON.stringify(res));
  } else console.log("commands: link | pay <qor1> <uqor> | status | revoke");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
