# EV-009 — PR #4 review round 4

**Timestamp:** 2026-08-19T01:58:09Z
**Source:** automated review on pull request #4 (cubic-dev-ai), 4 findings against round 3's fixes

Two of the four were defects in round 3's fixes. Both were reproduced before
being changed.

## Cent precision at the upper bound — a magnitude guard was not enough

Round 3 rejected amounts above `MAX_SAFE_INTEGER / 100`. But `Number()` rounds
*before* that guard can see the value, so two amounts a cent apart collapsed to
the same double and were both accepted:

```
Number("90071992547409.90") === Number("90071992547409.91")   ->  true
```

Replaced the magnitude bound with an exact **round-trip check**: cents are
computed from the digits in the string, and the value is accepted only if
`toCents(value)` returns those same cents. Anything that cannot survive the
conversion is rejected, wherever that boundary happens to fall.

The property now pinned by test is the one that matters: **no two accepted
amounts a cent apart ever parse equal.** (Of the colliding pair above, exactly
one survives — which one is an artefact of rounding and the test no longer
asserts a side, only that both cannot pass.)

## The head boundary could disagree with the log it described

Round 3 stored the boundary in a sibling key, written after the log:

```ts
localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(kept));
localStorage.setItem(HEAD_BOUNDARY_KEY, kept[0].prevHash);
```

Two `setItem` calls are not atomic. If the second threw on quota, or another tab
interleaved between them, the boundary described a head the log no longer had —
and `verifyAuditIntegrity` would report **perfectly good entries as tampered**.
That is the same false-alarm class this whole pass exists to remove.

Entries and boundary now live in one value under one key:

```json
{ "head": "<prevHash the retained head must carry>", "entries": [ ... ] }
```

One write, no window in which the two can disagree. Storage key bumped
`v2` → `v3`; see DECISIONS D-009.

## Also fixed

| Severity | Finding | Fix |
|---|---|---|
| P2 | `attempt` was cleared only while an error was displayed, so a count left over from a recovered route made the *first* failure on the next route look like a post-retry stale deployment and pushed Reload as the primary action. | Reset on every pathname change. |
| P3 | EV-008's header said 9 findings while the table listed 8 — the trim-marker atomicity finding had been folded into the P1 narrative instead of getting a row. | Row restored; header and table now both read 9. |

## Verification

```
npm run typecheck                     exit 0
npm test                              137 passed / 137, 7 files   (was 130)
npm run build                         success
node scripts/assert-spa-rewrite.mjs   passes
```

Against the production build, with the new storage shape:

```
stored shape    { keys: ["head","entries"], head: "000000000000…", entries: 7 }
sibling key     none left behind
clean chain     "Chain Integrity — Verified — No tampering detected"
mutate details  entry 0 of 7 rewritten in localStorage
after reload    "Chain Integrity — Broken — Broken at #0"
```

Five routes including `/agents/AG-001` re-verified. No JS errors.
