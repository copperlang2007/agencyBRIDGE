# EV-001 — Baseline repository reality

**Claim:** REQ-001 — the project builds, typechecks, and tests green from the real HEAD.
**Timestamp:** 2026-08-19T00:30:01Z
**Environment:** Node v22.22.2, npm 10.9.7, linux x64, vitest 2.1.9, vite 5.4.21
**Repository state:** reset to `origin/main` d76b293 before any edit; local branch was stale (drift R-009).

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` (before this pass) | 38 passed / 38, 2 files |
| `npm test` (after this pass) | 78 passed / 78, 5 files |
| `npm run build` | success |

**Note:** the pre-existing 38 tests covered `dataScope` only. `auditLog` (273 LOC,
7 exports, the product's tamper-evidence feature) had zero tests — the gap that
motivated EV-002.
