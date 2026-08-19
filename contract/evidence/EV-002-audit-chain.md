# EV-002 — Audit chain defects, proof, and fix

**Claim:** REQ-003, REQ-005.
**Timestamp:** 2026-08-19T00:30:01Z
**Environment:** Node v22.22.2, npm 10.9.7, linux x64, vitest 2.1.9, vite 5.4.21
**Artifacts:** `src/lib/auditLog.ts`, `src/lib/sha256.ts`, `src/test/auditLog.test.ts`, `src/test/sha256.test.ts`

## Defects found by adversarial review

| ID | Severity | Defect |
|---|---|---|
| F1 | Critical | `logAudit` wrote a weak placeholder hash, then overwrote it from a promise. A second entry logged before that promise resolved chained against a hash that no longer existed — the chain corrupted itself under ordinary use, and `SecurityPage` renders that as "Possible tampering detected." |
| F2 | Critical | `verifyAuditIntegrity` did `if (entry.hash.length === 64) continue` — it skipped recomputation for every real SHA-256 entry. It also never hashed `details`, `actorId`, `sessionId`, `ipAddress`, or `userAgent`, so those fields could be rewritten freely and still verify. |
| F3 | High | `verifyAuditIntegrityAsync` guarded on `entry.hash.length === 64`, so fallback-hash entries were never verified there either. Dead code; removed. |
| F4 | Medium | Clearing the log left no trace of the clear. |
| F6 | Medium | Past the 2,000-entry cap the head no longer linked to genesis, so verification returned `valid:false, brokenAt:0` permanently — a guaranteed false tamper alarm. |
| F7 | Medium | CSV export quoted cells but did not neutralise leading `=`/`+`/`-`/`@`, so a carrier name could inject a spreadsheet formula. |

## Proof before fix

`npx vitest run src/test/auditLog.test.ts` → **12 failed / 3 passed of 15**.
Failure list preserved at `contract/evidence/EV-002-failures-before.txt`.

## Proof after fix

`npx vitest run src/test/auditLog.test.ts` → **15 passed / 15**.

## SHA-256 primitive

Web Crypto is async-only and cannot back a synchronous append (D-003), so SHA-256
is implemented directly. Differentially tested against Node `crypto`:

```
10 fixed vectors (incl. empty, 55/56/57/64-byte padding boundaries, multi-byte UTF-8)
500 randomized inputs
ALL MATCH node:crypto
```

Plus published FIPS 180-4 vectors in `src/test/sha256.test.ts` (7 tests).

## Residual limit

Browser-local storage cannot resist wholesale deletion. Recorded as R-003/R-004 and
documented in the module header — not claimed as resolved.
