# Veilbooks Steward

> An agent that pays your invoices and can't go over your limits.

Part of Veilbooks: business payments with the amounts veiled, safe from quantum attacks.

An agent that pays sealed invoices inside limits the owner signed.

Entry in the QoreChain "Build Before Q-Day" developer fest, category: Post-Quantum AI Agents. Apache-2.0.

_Work in progress._

## Status
Work in progress for the QoreChain "Build Before Q-Day" developer fest (deadline 2 December 2026). Network: QoreChain testnet `qorechain-diana`.

## The Veilbooks suite
| Repo | Role | Category |
|---|---|---|
| [veilbooks-rail](https://github.com/ayushsingh82/veilbooks-rail) | Settlement rollup | Protocol Builders |
| [veilbooks-desk](https://github.com/ayushsingh82/veilbooks-desk) | Sealed invoices and payroll app | Encrypted Apps |
| [veilbooks-steward](https://github.com/ayushsingh82/veilbooks-steward) | Agent that pays within signed limits | Post-Quantum AI Agents |
| [veilbooks-core](https://github.com/ayushsingh82/veilbooks-core) | Shared library | not entered |

## How it works
An agent opens sealed invoices, checks them against limits the owner signed with ML-DSA, and pays through Veilbooks Rail. Anything over a limit waits for the owner's approval.

## Licence
Apache-2.0. AI use is documented in [AI_USAGE.md](AI_USAGE.md).

## Design in one screen
- The **owner** signs a policy with ML-DSA-87: per-invoice and daily limits the agent may use alone, plus hard ceilings the chain enforces on the agent's key.
- The **agent** holds only a classical key, linked to the owner's account by an owner-signed transaction (`src/chain.ts`). It cannot raise its own limits.
- A **planner** (Claude if `ANTHROPIC_API_KEY` is set, otherwise rules) may only order or hold invoices. `decide()` and the chain have the last word. Invoice text is treated as data, never as instructions.
- Over-limit invoices wait in an **approval queue**. The owner approves or denies with an ML-DSA-87 signature bound to the invoice, payee, amount and policy.
- Every decision goes into a **hash-chained log signed by the agent**.

## Status
Offline logic is built and tested (`npm test`, 35 tests). Not done: sending the link transaction and agent calls to the testnet (needs a funded owner account), and the UI.
