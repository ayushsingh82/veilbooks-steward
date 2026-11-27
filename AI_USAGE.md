# AI usage

This project is part of Veilbooks, built for the QoreChain "Build Before Q-Day" developer fest.

## Tools
- Claude Code (Claude Sonnet 5.5, Anthropic) in the terminal, used for planning, reading SDK and RDK type definitions, writing and refactoring code, writing tests and drafting documentation.

## What the AI did
- Wrote the agent logic, the limit checks, the signed decision log and the tamper and prompt-injection tests.
- Drafted README, THREAT_MODEL.md and test cases, which the human author reviewed and edited.

## What the human did
- Chose the idea, the tracks and the project structure.
- Created the accounts, repositories, project pages and testnet keys, and funded the testnet operator account.
- Kept the operator key in a git-ignored env file on their own machine. The AI ran scripts that read that file to sign testnet transactions, but never printed, copied or committed the key.
- Reviewed, ran and decided on all AI-written code before committing it.

## Limits and honesty notes
- Anything the AI could not verify against the chain or the kits' documentation is marked as unverified in the README.
- This file is updated as the project changes. See the git history for who changed what.
