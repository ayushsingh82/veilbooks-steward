import type { EncodeObject } from "@cosmjs/proto-signing";
import {
  checkOpenEvmWindowScope,
  closeEvmWindowMsg,
  linkAuthenticatorMsgs,
  openEvmWindowMsg,
  revokeAuthenticatorMsg,
  signAuthenticatorLinkEip191,
  verifyAuthenticatorLinkProof,
  type AuthenticatorLinkProof,
} from "@qorechain/sdk";
import { getAddress, hexToBytes, type Address, type Hex } from "viem";
import type { Policy } from "./policy";

export const CHAIN_ID = "qorechain-diana";

/** The agent proves it holds its key. Made by the agent; it is bound to the chain and the owner's account. */
export function agentLinkProof(owner: string, agentPrivateKey: Hex): AuthenticatorLinkProof {
  return signAuthenticatorLinkEip191({ chainId: CHAIN_ID, account: owner, privateKey: agentPrivateKey });
}

/**
 * The messages the owner signs (hybrid, ML-DSA-87) in ONE transaction to link the agent's key and set its
 * spending rule to the policy's hard ceilings. The agent cannot raise its own limits: only the owner can send this.
 * Note: this replaces every spending rule on the owner's account.
 */
export function linkAgentMessages(owner: string, proof: AuthenticatorLinkProof, p: Policy, label = "veilbooks-steward"): EncodeObject[] {
  if (!verifyAuthenticatorLinkProof({ chainId: CHAIN_ID, account: owner, scheme: proof.scheme, pubkey: proof.pubkey, possessionProof: proof.possessionProof })) {
    throw new Error("the agent's link proof does not verify for this owner");
  }
  return linkAuthenticatorMsgs({
    owner,
    chainId: CHAIN_ID,
    scheme: proof.scheme,
    pubkey: proof.pubkey,
    possessionProof: proof.possessionProof,
    permissions: ["send"],
    expiryUnix: BigInt(p.expiresUnix),
    label,
    spendingRules: [
      {
        id: label,
        enabled: true,
        perTxLimit: BigInt(p.hardPerInvoiceUqor),
        dailyLimit: BigInt(p.hardDailyUqor),
        allowedDenoms: ["uqor"],
        allowedEvmCalls: [],
        denomLimits: [],
      },
    ],
  });
}

/** The owner's message that switches the agent key off at once. */
export function revokeAgentMessage(owner: string, agentAddress: Address): EncodeObject {
  return revokeAuthenticatorMsg({ owner, scheme: "secp256k1", pubkey: hexToBytes(getAddress(agentAddress)) });
}

/**
 * A narrow EVM authorisation window for the agent's payments: native QOR transfers only (no calldata, no contract
 * creation), a small number of transactions, and a total capped at the policy's hard daily ceiling. The scope fields
 * stay empty, so staking, IBC and validator modules are denied by default. The owner opens it explicitly; the agent cannot.
 */
export function agentWindowMessage(owner: string, p: Policy, opts: { blocks?: number; maxTxs?: number } = {}): EncodeObject {
  return openEvmWindowMsg({
    sender: owner,
    blocks: opts.blocks ?? 7200,
    maxTxs: opts.maxTxs ?? 50,
    maxValue: BigInt(p.hardDailyUqor),
    nativeOnly: true,
    ...checkOpenEvmWindowScope({}),
  });
}

/** The owner's message that closes the window at once. */
export function closeAgentWindowMessage(owner: string): EncodeObject {
  return closeEvmWindowMsg(owner);
}
