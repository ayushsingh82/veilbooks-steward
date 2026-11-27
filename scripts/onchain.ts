/**
 * Steward on the QoreChain testnet: link the agent's key to the owner's account with the policy's spending rule,
 * make one payment with the linked key, read the result, and revoke.
 *
 *   npx tsx scripts/onchain.ts link     owner signs the link (hybrid ML-DSA-87); agent key is created on first use
 *   npx tsx scripts/onchain.ts pay <qor1 payee> <uqor>    agent signs, the relayer (operator) broadcasts
 *   npx tsx scripts/onchain.ts status
 *   npx tsx scripts/onchain.ts revoke
 *
 * The owner and relayer are the same testnet operator, loaded from OPERATOR_ENV (default: Rail's rollup/.env).
 * Testnet only. The agent key is kept in .agent.json, which is git-ignored.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRdkClient, pqcKeypairFromEnv, signerFromEnv } from "@qorechain/rdk";
import { TxClient, cosmosAuthSignBytes, executeCosmosMsg, fetchAuthNonce, getNetwork } from "@qorechain/sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { hexToBytes, type Hex } from "viem";
import { CHAIN_ID, agentLinkProof, linkAgentMessages, revokeAgentMessage } from "../src/chain";
import type { Policy } from "../src/policy";

process.loadEnvFile(resolve(process.env.OPERATOR_ENV ?? "../veilbooks-rail/rollup/.env"));
const KEYFILE = ".agent.json";
const GAS_PRICE = process.env.QORE_GAS_PRICE ?? "0.15uqor";

const agentKey = (): Hex => {
  if (existsSync(KEYFILE)) return (JSON.parse(readFileSync(KEYFILE, "utf8")) as { privateKey: Hex }).privateKey;
  const privateKey = generatePrivateKey();
  writeFileSync(KEYFILE, JSON.stringify({ privateKey }), { mode: 0o600 });
  return privateKey;
};

async function main() {
  const [cmd, a1, a2] = process.argv.slice(2);
  const net = getNetwork("testnet");
  const rest = net.endpoints.rest!;
  const rdk = createRdkClient({ network: "testnet" });
  const signer = await signerFromEnv();
  if (!signer) throw new Error("no operator key in the env file");
  const owner = (await signer.getAccounts())[0]!.address;
  const pk = agentKey();
  const agent = privateKeyToAccount(pk);
  const agentPub = hexToBytes(agent.address);

  const policy: Policy = {
    version: 1, ownerPublicKeyHex: "00", perInvoiceUqor: "5000000", dailyUqor: "8000000",
    hardPerInvoiceUqor: "20000000", hardDailyUqor: "40000000", perSupplierDailyUqor: "6000000",
    allowedPayees: [], expiresUnix: Math.floor(Date.now() / 1000) + 7 * 86400,
  };

  const connect = async () => {
    const pqc = await pqcKeypairFromEnv(rdk, owner);
    if (!pqc) throw new Error("no post-quantum key: set QORE_MNEMONIC (or QORE_PQC_SEED_HEX) in the env file");
    return TxClient.connect({
      rpcEndpoint: net.endpoints.rpc!,
      signer,
      pqcKeypair: pqc.keypair,
      rest,
    });
  };

  if (cmd === "link") {
    const tx = await connect();
    const res = await tx.signAndBroadcast(linkAgentMessages(owner, agentLinkProof(owner, pk), policy), "auto", "veilbooks-steward link");
    console.log("linked agent", agent.address, "to", owner, "tx", res.transactionHash ?? JSON.stringify(res));
  } else if (cmd === "pay") {
    if (!a1 || !a2) throw new Error("usage: pay <qor1 payee> <uqor>");
    const { nonce } = await fetchAuthNonce({ rest, address: owner, pubkey: agentPub } as never);
    const amount = `${a2}uqor`;
    const digest = cosmosAuthSignBytes({ chainId: CHAIN_ID, account: owner, pubkey: agentPub, to: a1, amount, nonce });
    const signature = hexToBytes(await agent.signMessage({ message: { raw: digest } }));
    const msg = executeCosmosMsg({ relayer: owner, account: owner, scheme: "secp256k1", pubkey: agentPub, signature, to: a1, amount, nonce });
    const tx = await connect();
    const res = await tx.signAndBroadcast([msg], "auto", "veilbooks-steward pay");
    // A refused execution still lands as a successful transaction; the refusal is an event on it.
    const hash = String(res.transactionHash);
    const t = (await (await fetch(`${rest}/cosmos/tx/v1beta1/txs/${hash}`)).json()) as { tx_response?: { events?: { type: string; attributes: { key: string; value: string }[] }[] } };
    const failed = t.tx_response?.events?.find((e) => e.type === "abstractaccount_execution_failed");
    if (failed) console.log("REFUSED by the chain:", failed.attributes.find((a) => a.key === "reason")?.value, "tx", hash);
    else console.log("agent paid", amount, "to", a1, "tx", hash);
  } else if (cmd === "status") {
    const n = await fetchAuthNonce({ rest, address: owner, pubkey: agentPub } as never);
    console.log("owner", owner, "agent", agent.address, "linked", n.linked, "next nonce", String(n.nonce));
  } else if (cmd === "revoke") {
    const tx = await connect();
    const res = await tx.signAndBroadcast([revokeAgentMessage(owner, agent.address)], "auto", "veilbooks-steward revoke");
    console.log("revoked", agent.address, "tx", res.transactionHash ?? JSON.stringify(res));
  } else console.log("commands: link | pay <qor1> <uqor> | status | revoke");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
