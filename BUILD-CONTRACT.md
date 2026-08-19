# Build Contract Entrypoint — agencyBRIDGE

## STOP — LOAD GOVERNANCE BEFORE BUILDING

This project is governed by **Build Contract OS** (`copperlang2007/build-contract-os`).

Before making changes:

1. Load the canonical contract: `build-contract-os/CONTRACT.md`.
2. Load inherited doctrine: `doctrine/THE-FORGE-GATE.md`, `BRAND-GATE.md`, `IP-FIRST.md`,
   `VERIFICATION.md`, `RED-TEAM.md`, `DRIFT-RECONCILIATION.md`, `AGENT-GOVERNANCE.md`.
3. Load this project's state: [`contract/STATE.yaml`](contract/STATE.yaml).
4. Load [`contract/REQUIREMENTS.yaml`](contract/REQUIREMENTS.yaml),
   [`contract/DECISIONS.md`](contract/DECISIONS.md),
   [`contract/RISKS.md`](contract/RISKS.md),
   [`contract/IP-MAP.yaml`](contract/IP-MAP.yaml).
5. Read the latest [`contract/HANDOFF.md`](contract/HANDOFF.md).
6. Inspect actual repository state — `git log`, `npm run typecheck`, `npm test`, `npm run build`.
7. Reconcile drift between documentation and reality **before** writing code.
8. Identify the next contractual action from `STATE.yaml.next_action`.

## Non-negotiable rules

- Evidence outranks AI memory.
- Repository reality outranks stale handoffs.
- Reuse owned IP before rebuilding.
- Do not silently change user constraints.
- Test failure paths and adversarial cases.
- Red-team continuously.
- Backtrack when evidence invalidates an earlier decision.
- Persist state after material work.
- Never claim verification without evidence.

## Verification commands

```bash
npm ci
npm run typecheck     # tsc --noEmit
npm test              # vitest run
npm run build         # vite build
```

CI (`.github/workflows/ci.yml`) enforces all four on every pull request, plus an
assertion that the SPA rewrite in `vercel.json` is present.

## Completion

Do not report this project as complete merely because implementation is finished.

The only final completion declaration is:

> **Clear for review by the-forge.**

**agencyBRIDGE has NOT passed the Forge Gate.** See `contract/STATE.yaml.gates`
and the open blockers in `contract/RISKS.md` (R-001 is release-blocking).
