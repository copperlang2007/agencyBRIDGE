# EV-008 — PR #4 review round 3

**Timestamp:** 2026-08-19T01:44:19Z
**Source:** automated review on pull request #4 (cubic-dev-ai), 9 findings against round 2's fixes

Round 2's fixes were themselves reviewed. One finding was a genuine gap **in my
own fix** and is the most important item in this round.

## P1 — the head-boundary gap (my round-2 fix was incomplete)

Round 2 distinguished retention rollover from head deletion using a *counter* of
dropped entries. That only closed the never-trimmed case: once retention had
rolled over even once, a later head deletion looked like more of the same
rollover. Reproduced before fixing:

```
5 entries logged
legitimate rollover (retention drops 1)   -> { valid: true,  truncated: true  }   correct
attacker then deletes the retained head   -> { valid: true,  truncated: true  }   WRONG
```

Replaced the counter with a recorded **head boundary**: the `prevHash` the
current retained head is expected to carry, rewritten by `persist()` whenever
retention trims. Verification compares the head against it, so removing the head
no longer resembles housekeeping at any point in the log's life.

```
attacker deletes the retained head        -> { valid: false, brokenAt: 0 }        correct
two successive real rollovers             -> { valid: true,  truncated: true }    correct
```

The boundary is also written **after** the log write succeeds, so a failed write
cannot leave a marker claiming a rollover that never happened.

## Other findings, all accepted

| Severity | Finding | Fix |
|---|---|---|
| P2 | `isEntry` validated only `hash`/`prevHash`, so a record missing a hashed field reached the digest and failed for the wrong reason. | All 13 hashed fields must be strings. 5 new cases. |
| P2 | `toCents` overflows near `Number.MAX_VALUE` — `Math.round(1e308*100)` is `Infinity`, and `Infinity - Infinity` is `NaN`, so **equal** huge payments classified as overpayments. | Amounts beyond `MAX_SAFE_INTEGER/100` are rejected as invalid. |
| P2 | A third decimal place silently erased a real difference — `450.004` and `450.001` both round to 45000 cents. | More than two decimals is rejected unless the extra digits are padding zeros. |
| P2 | `RouteErrorBoundary` labelled every error `route_load_failed` and told the user the page "couldn't be fetched", even when a loaded page threw during render. | Import failures are distinguished from render errors, in both the audit action and the wording. |
| P2 | `routeKey` was the route *pattern*, so moving between two records of `/agents/:agentId` left a stale error on screen. | Keyed on the concrete pathname via `useLocation`. |
| P2 | For the boundary's own headline case — a stale chunk after a deploy — "Try again" cannot recover: remounting re-requests a chunk URL that no longer exists. Only a reload fetches an `index.html` with current hashes. | A reload action is always offered, and becomes the primary action once a retry has already failed on a chunk error. |
| P2 | The SPA-rewrite assertion's negative cases named only two filenames, so a rule narrowed to just the entry bundle would pass while lazy chunks got `index.html`. | Negative set covers lazy route chunks, CSS, SVG, WOFF2, and nested paths. Negative-tested against `/((?!assets/index-).*)`, which now fails with six specific violations. |

## Verification

```
npm run typecheck                     exit 0
npm test                              130 passed / 130, 7 files   (was 120)
npm run build                         success, entry chunk 1,048 kB
node scripts/assert-spa-rewrite.mjs   passes; narrowed-rule control fails as intended
```

End-to-end in the real application, against the production build — the defect
that started this work, demonstrated caught through the product's own UI:

```
clean chain      Security page: "Chain Integrity — Verified — No tampering detected"
mutate details   entry 0 of 9 rewritten directly in localStorage
after reload     Security page: "Chain Integrity — Broken — Broken at #0"
```

Seven routes including `/agents/AG-001` re-verified under the new boundary
wrapper. No JS errors.
