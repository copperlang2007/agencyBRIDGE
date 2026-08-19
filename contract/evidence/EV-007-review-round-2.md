# EV-007 — PR #4 review round 2

**Timestamp:** 2026-08-19T00:58:24Z
**Source:** automated review on pull request #4 (cubic-dev-ai), 19 findings across two passes

Every finding was checked against the code rather than accepted or dismissed on
its description. Two turned out to be defects I introduced in this pass.

## Accepted — real defects, fixed with regression tests

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | High | `classifyVariance` compared a float epsilon: `449.99 - 450.00` is `-0.009999999999990905`, which is **less than** `0.01`, so an exact one-cent short pay was classified `paid_on_time`. Reproduced at 450.00, 1000.01, 100.10, 19.99, 8.07 — 4 of 5 sampled magnitudes were wrong. | Money is now compared in integer cents (`toCents`). 7 new tests. |
| 2 | High | `csvCell` guarded `\r` but not `\n`, leaving a newline-prefixed field as an unescaped formula trigger. | `\n` added to the guarded class; test enumerates all seven triggers. |
| 3 | Medium | A failed lazy chunk propagated to the root `ErrorBoundary` and replaced the entire SPA. Code splitting introduced this — static imports could not fail at runtime. | `RouteErrorBoundary` per route: contains the failure, audits it, offers a retry that re-attempts the import. |
| 4 | Medium | `verifyAuditIntegrity` threw on a malformed stored entry, dropping the Security page into the global error path. | Entry shape is validated; a malformed record is reported as `brokenAt` instead. 3 new tests. |
| 5 | Medium | Head deletion was indistinguishable from retention rollover — dropping the genesis entry read as benign `truncated`. | Retention now records how many entries it actually dropped. A missing head with **zero** recorded trims is reported as tampering. |
| 6 | Medium | `truncated` was computed before verification, so it could be `true` alongside `valid:false`, contradicting the claim in EV-006. | Computed only on the verified path; the code now matches the claim rather than the claim being softened. |
| 7 | Medium | Fixed SVG gradient id `ab-tile`. `url(#…)` resolves against the whole document, so two brand-tone marks on one page would collide. | Per-instance id via `useId`. Verified rendering as `ab-tile-r1v`. Latent rather than active — no page currently renders two brand-tone marks. |
| 8 | Medium | Brand tile on the dark sidebar: gradient endpoint `#0f1b3d` against sidebar ground `hsl(222 62% 15%)` measures **1.14:1**, so the tile edge dissolved. | Sidebar switched to `tone="light"`. |
| 9 | Low | `BrandLockup` announced "agencyBRIDGE" twice to assistive tech — once from the mark's label, once from the wordmark. | Mark is `aria-hidden` inside a lockup. Verified: 0 announced marks, 1 hidden. |
| 10 | Medium | `sha256.test.ts` multi-byte assertion was a tautology — the ternary always evaluated to the same expression, so it passed even if the implementation hashed code units. | Pinned to real digests derived from Node. |
| 11 | Low | CI asserted only that *some* rewrite targeted `/index.html`; a rule matching nothing would pass while deep links 404. | `scripts/assert-spa-rewrite.mjs` exercises the source pattern against real deep links and asset paths. Negative-tested: a `/nomatch` source now fails the check. |
| 12 | Low | CSV reported a meaningless `0.0%` variance when there was no positive expectation, though the summary omitted it. | Percentage appended only when `totalExpected > 0`. |

## Accepted — evidence and documentation corrections

| # | Finding | Disposition |
|---|---|---|
| 13 | The SHA-256 differential proof in EV-002 was run in a scratch script, so it was not reproducible from the repository. | The strongest finding of the round: a governance claim with no reproducible artifact. Committed as `src/test/sha256.differential.test.ts` — 13 fixed inputs, 500 random, and every length 0–200, all against Node's `crypto`. |
| 14 | EV-001 mixed post-change results into a baseline artifact. | Scoped to the baseline HEAD; post-change counts live in EV-002/003/005/007. |
| 15 | EV-005 claimed 23 routes; `App.tsx` defines 24, and `/agents/:agentId` was untested. | Count corrected and the param route verified — `/agents/AG-001` renders "Daniel Reyes". |
| 16 | R-005 cited "5 of 11" `src/lib` modules; there are 14. | Corrected to 5 of 14, with the covered modules named. |
| 17 | HANDOFF wrote "Six defects (F1–F7)", which reads as seven. | Corrected to F1–F4, F6–F7. |
| 18 | BRAND-PACKAGE specified `agency` as regular weight; the component renders it bold. | Doc corrected to bold (700) / extrabold (800). |

## Accepted as a risk, not fixed

| # | Finding | Disposition |
|---|---|---|
| 19 | Two tabs logging concurrently can overwrite each other's snapshot, silently dropping an entry while the surviving chain still verifies. | Real. Not fixable while `logAudit` is synchronous — the Web Locks API is async, and synchronous append is what removed the original hash race (D-003). Recorded as **R-010** rather than half-mitigated. |

## Verification after this round

```
npm run typecheck                     exit 0
npm test                              120 passed / 120, 7 files   (was 94 / 6)
npm run build                         success, entry chunk 1,046 kB
node scripts/assert-spa-rewrite.mjs   passes; negative control fails as intended
```

Browser verification against the production build: param route renders, gradient
ids unique, lockup announces the brand once, no JS errors.
