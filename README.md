# Veilbooks Steward

> An agent that pays your invoices and can't go over your limits.

Veilbooks Steward is an accounts-payable agent that pays supplier invoices within limits its owner has signed with a post-quantum key. The owner's limits are enforced twice: by the agent's decision engine and by a spending rule on the chain itself, so a compromised or misled agent still cannot move more than the owner allowed.

## Features

- **Owner-signed policy** (ML-DSA-87): per-invoice, daily and per-supplier limits, an allowed-payee list and an expiry. Any change to the policy invalidates its signature.
- **Two tiers of limits**: what the agent may pay alone, and a higher hard ceiling that the chain enforces on the agent's key.
- **Decision engine** returning pay, escalate or reject. Free text from suppliers is never read as an instruction.
- **Optional planner**: Claude when `ANTHROPIC_API_KEY` is set, otherwise a deterministic rules planner. A planner can only order or hold invoices; it cannot raise a limit.
- **Approval queue**: over-limit invoices wait for the owner, who approves or denies with a signature bound to the invoice, payee, amount and policy.
- **Signed decision log**: every decision is appended to a hash-chained log signed with the agent's ML-DSA-87 key. Editing or deleting an entry is detected.
- **Chain link adapter**: builds the owner-signed messages that link the agent's key to the owner's account with the spending rule, and the message that revokes it.
- **Scoped EVM window**: an owner-opened, native-transfer-only window (bounded blocks, transactions and total value, no staking or IBC scope) and the message that closes it.

## Quick start

Requires Node.js 20 or newer.

```sh
npm install
npm test          # policy, decisions, planner, approvals, log, chain link
npm run typecheck
npm run dev       # browser demo of the agent, approval queue and signed log
```

## How it works

1. The owner signs a **policy** and links the agent's classical key to their account with a spending rule set to the hard ceilings.
2. The agent receives invoices, asks the **planner** for an order, then runs each through the **decision engine**.
3. Invoices inside the limits are paid. Others go to the **approval queue** or are rejected, and each outcome is written to the **log**.
4. The owner approves an escalated invoice with an ML-DSA-87 signature. The chain ceiling still applies after approval.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/policy.ts` | Policy, owner signature and verification |
| `src/decide.ts` | Decision engine |
| `src/planner.ts` | Rules planner and optional Claude planner |
| `src/agent.ts` | Agent loop, approval queue, signed approvals |
| `src/log.ts` | Signed, hash-chained decision log |
| `src/chain.ts`, `src/chainRule.ts` | Key link, revoke and spending rule builders |
| `web/` | Browser demo (Vite + React) |
| `THREAT_MODEL.md` | Attackers, what stops them, and what is not covered |

## Status and limits

- The agent logic is built and tested offline, and the on-chain path has run on the QoreChain testnet with `scripts/onchain.ts`: the owner linked the agent key (permission `send`, spending rule 20 QOR per transaction and 40 QOR per day), the agent made a 1 QOR payment, and the chain refused a 25 QOR payment because it passes the per-transaction limit. The agent's own decision engine is not in that script yet: the demo script pays what it is told, so the chain ceiling is what it proves.
- A browser demo is in `web/` (`npm run dev`). It runs the real policy, decisions, approvals and signed log with a simulated payer, so no funds move.
- It pays suppliers directly through the linked key. Settling through Veilbooks Rail has not been confirmed for linked keys.
- The limits cover native uqor only.

## The Veilbooks suite

| Repository | Role |
| --- | --- |
| [veilbooks-rail](https://github.com/ayushsingh82/veilbooks-rail) | Settlement rollup for private business payments |
| [veilbooks-desk](https://github.com/ayushsingh82/veilbooks-desk) | Sealed invoices and payroll for people and auditors |
| [veilbooks-steward](https://github.com/ayushsingh82/veilbooks-steward) | Agent that pays invoices within limits the owner signed |
| [veilbooks-core](https://github.com/ayushsingh82/veilbooks-core) | Shared library: sealing, commitments, key registration |

Veilbooks keeps business payment amounts private, with signatures and encryption designed to remain secure against quantum attacks. It runs on the QoreChain testnet (`qorechain-diana`).

## Licence and AI use

Apache-2.0. See [AI_USAGE.md](AI_USAGE.md) for how AI tools were used.

## Testnet run

| Step | Result | Transaction |
| --- | --- | --- |
| Link agent key, `send` only, limits 20 / 40 QOR | linked | `FDF0EA725C854DD55721F6E5D2725B42A33AC792849437176FB5C802969E907D` |
| Agent pays 1 QOR | paid | `6A1275B88D0C5F4267D468B72491B481A642981FCA1548F1F9E95B7588B1CFF2` |
| Agent tries 25 QOR | refused by the chain: per-tx limit 20000000uqor exceeded | `FAE3A5DC489DEF2F308D693FF22DC40AC823EF26D826F6E442A187342CE77C27` |

A refused execution still lands as a successful transaction. The refusal is an `abstractaccount_execution_failed` event on it, which the script reads. The spending rule is stored on the owner's account and the chain applies it to the linked key's payments.

Run it yourself: `npx tsx scripts/onchain.ts link | pay <qor1 payee> <uqor> | status | revoke`. It needs an operator env file (path in `OPERATOR_ENV`).
