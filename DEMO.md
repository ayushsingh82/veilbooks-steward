# Demo run-sheet: Veilbooks Steward (about 3 minutes)

Have ready: `npm run dev` running, the README Live testnet run table, and the explorer open on the three transactions if you want to show them.

| Time | Show | Say |
| --- | --- | --- |
| 0:00 | README title and problem | "An agent that pays is only useful if its owner can trust it not to overspend. Agents read free text from suppliers, so a hostile memo can try to talk them into paying more." |
| 0:25 | Browser demo, limits and invoices, **Sign policy and run agent** | "The owner signs the limits with a post-quantum key. The decision engine looks only at the numbers." |
| 0:55 | Outcome table | "Small invoices are paid. An invoice over the limit waits for the owner. A payee not on the list is rejected. The last invoice's memo says ignore all limits. It changes nothing, because memos are never read." |
| 1:25 | Approval queue, **Approve** | "The owner approves the large one. The signature is bound to that invoice, payee and amount, so it cannot be reused for a different amount." |
| 1:50 | Log, then **Tamper with an entry** | "Every decision is in a signed, hash-chained log. Edit one entry and the check fails." |
| 2:15 | README Live testnet run | "On the testnet the owner linked the agent's key with a spending rule: 20 QOR per transaction. The agent paid 1 QOR. It tried 25 QOR and the chain refused it, whatever the agent does." |
| 2:45 | THREAT_MODEL.md | "Each claim is marked tested or planned." |

Before recording: `npm test` should pass, and run the browser demo once end to end.
