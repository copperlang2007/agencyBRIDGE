# EV-006 — PR #4 review round

**Timestamp:** 2026-08-19T00:37:33Z
**Source:** automated review on pull request #4 (sourcery-ai)

## Finding 1 — duplicated CSV escaping. Accepted, fixed.

`csvCell` existed byte-identically in `auditLog.ts` and `shortPayDetector.ts`.
Verified identical by diff before acting. A security control duplicated per call
site is a control that drifts, so it is now defined once in `src/lib/csv.ts` and
imported by both exporters, with `csvRows` for whole-grid serialization.

New coverage: `src/test/csv.test.ts`, 13 tests — quoting, embedded quotes, commas
and newlines, all six leading formula triggers (`= + - @ TAB CR`), the
false-positive case (a trigger character mid-string must **not** be prefixed),
null/undefined, and non-string values.

## Finding 2 — could a corrupted head prevHash be laundered as truncation? Tested, not reproducible.

The concern: `verifyAuditIntegrity` infers truncation from
`log[0].prevHash !== GENESIS_HASH`, so a corrupted head might be waved through as
a benign retention rollover.

This does not occur, because `prevHash` is part of the hashed payload —
`hashEntry` computes `sha256Hex(prevHash + canonicalPayload(entry))`. Altering the
head's `prevHash` therefore breaks the head's own hash recomputation before the
truncation flag is ever consulted.

Verified rather than argued — three regression tests added:

| Test | Result |
|---|---|
| head `prevHash` set to `ffff…` | `valid:false, brokenAt:0` |
| head `prevHash` set to near-genesis (`000…1`) | `valid:false` |
| genuinely trimmed log, head hash intact | `valid:true, truncated:true` |

`truncated` is only ever reported for a head whose own hash still verifies, so it
cannot be used to launder a mutation.

**Residual, unchanged:** an attacker who deletes entries 0..N *cleanly* leaves a
chain that verifies and reports `truncated`. That is inherent to client-side
storage — a browser log cannot prove its own head existed. Already recorded as
R-004; server-side append-only storage is the only real fix, and it is not claimed
here.

## Verification after this round

```
npm run typecheck   exit 0
npm test            94 passed / 94, 6 files   (was 78 / 5)
npm run build       success
```
