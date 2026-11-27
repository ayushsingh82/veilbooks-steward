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
