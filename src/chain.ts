import type { EncodeObject } from "@cosmjs/proto-signing";
import {
  linkAuthenticatorMsgs,
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
    permissions: ["evm"],
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
