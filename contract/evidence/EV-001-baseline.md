# EV-001 — Baseline repository reality

**Claim:** REQ-001 — the project builds, typechecks, and tests green from the real HEAD.
**Timestamp:** 2026-08-19T00:30:01Z
**Environment:** Node v22.22.2, npm 10.9.7, linux x64, vitest 2.1.9, vite 5.4.21
**Repository state:** reset to `origin/main` d76b293 before any edit; local branch was stale (drift R-009).

Scope: the untouched baseline only. Post-change results belong to EV-002, EV-003,
EV-005, and EV-007 — mixing them here would make this artifact's provenance
ambiguous about which tree was measured.

| Command | Result on baseline HEAD d76b293 |
|---|---|
| `npm run typecheck` | exit 0, no diagnostics |
| `npm test` | 38 passed / 38, 2 files |
| `npm run build` | success |

**Note:** the pre-existing 38 tests covered `dataScope` only. `auditLog` (273 LOC,
7 exports, the product's tamper-evidence feature) had zero tests — the gap that
motivated EV-002.
