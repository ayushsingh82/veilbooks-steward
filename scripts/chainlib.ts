/**
 * Testnet plumbing shared by the Steward scripts: the operator (owner and relayer), the agent's linked key,
 * and a `pay` that signs as the agent and reports whether the chain really paid.
 * The owner and relayer are the same testnet operator, loaded from OPERATOR_ENV (default: Rail's rollup/.env).
 * The agent key is kept in .agent.json, which is git-ignored. Testnet only.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRdkClient, pqcKeypairFromEnv, signerFromEnv } from "@qorechain/rdk";
import { TxClient, cosmosAuthSignBytes, executeCosmosMsg, fetchAuthNonce, getNetwork } from "@qorechain/sdk";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { hexToBytes, type Hex } from "viem";
import { CHAIN_ID } from "../src/chain";

process.loadEnvFile(resolve(process.env.OPERATOR_ENV ?? "../veilbooks-rail/rollup/.env"));
const KEYFILE = ".agent.json";

export const agentKey = (): Hex => {
  if (existsSync(KEYFILE)) return (JSON.parse(readFileSync(KEYFILE, "utf8")) as { privateKey: Hex }).privateKey;
  const privateKey = generatePrivateKey();
  writeFileSync(KEYFILE, JSON.stringify({ privateKey }), { mode: 0o600 });
  return privateKey;
};

type Ev = { type: string; attributes: { key: string; value: string }[] };

export async function chain() {
  const net = getNetwork("testnet");
  const rest = net.endpoints.rest!;
  const rdk = createRdkClient({ network: "testnet" });
  const signer = await signerFromEnv();
  if (!signer) throw new Error("no operator key in the env file");
  const owner = (await signer.getAccounts())[0]!.address;
  const pk = agentKey();
  const agent = privateKeyToAccount(pk);
  const agentPub = hexToBytes(agent.address);

  /** An owner-signed (hybrid ML-DSA-87) transaction client. */
  const connect = async () => {
    const pqc = await pqcKeypairFromEnv(rdk, owner);
    if (!pqc) throw new Error("no post-quantum key: set QORE_MNEMONIC (or QORE_PQC_SEED_HEX) in the env file");
    return TxClient.connect({ rpcEndpoint: net.endpoints.rpc!, signer, pqcKeypair: pqc.keypair, rest });
  };

  const status = () => fetchAuthNonce({ rest, address: owner, pubkey: agentPub } as never);

  /**
   * The agent signs a payment and the operator relays it. A refused execution still lands as a successful transaction;
   * the refusal is an event on it, so read the transaction back and report what really happened.
   */
  async function pay(to: string, uqor: string): Promise<{ ok: boolean; hash: string; reason?: string }> {
    const { nonce } = await status();
    const amount = `${uqor}uqor`;
    const digest = cosmosAuthSignBytes({ chainId: CHAIN_ID, account: owner, pubkey: agentPub, to, amount, nonce });
    const signature = hexToBytes(await agent.signMessage({ message: { raw: digest } }));
    const msg = executeCosmosMsg({ relayer: owner, account: owner, scheme: "secp256k1", pubkey: agentPub, signature, to, amount, nonce });
    const res = await (await connect()).signAndBroadcast([msg], "auto", "veilbooks-steward pay");
    const hash = String(res.transactionHash);
    const t = (await (await fetch(`${rest}/cosmos/tx/v1beta1/txs/${hash}`)).json()) as { tx_response?: { events?: Ev[] } };
    const failed = t.tx_response?.events?.find((e) => e.type === "abstractaccount_execution_failed");
    return failed ? { ok: false, hash, reason: failed.attributes.find((a) => a.key === "reason")?.value } : { ok: true, hash };
  }

  return { owner, pk, agent, agentPub, rest, connect, status, pay };
}
