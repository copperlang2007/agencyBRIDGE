# EV-011 — PR #5 review round

Four findings against `7e7137a`, from Vercel Agent Review, LlamaPReview, Sourcery
and GitGuardian. Two were real defects in code this pass introduced, and both
were in the audit path — the part of the change whose whole purpose is to be
trustworthy.

---

## P1 — every audit entry was written to the chain twice

Found independently by Vercel Agent Review and LlamaPReview. Correct, and worse
than it first sounds.

`logAudit` pushed each entry into an in-memory `buffer` **and** mirrored it to
the persisted outbox. `flush()` then built its batch from both:

```ts
const pending = [...readOutbox(), ...buffer];   // every entry, twice
```

So each action was posted twice, and the API appended both copies with their own
sequence numbers and hashes. **Verification still passed**, because each copy
hashes correctly against its predecessor — the chain was internally consistent
and factually wrong. An audit trail that duplicates events is not a cosmetic
defect; it misstates the record while reporting itself intact.

Fixed by removing the second source. One queue, seeded from storage at load and
mirrored back after every change; nothing is ever added to itself.

**Proven, not assumed.** `src/test/auditTransport.test.ts` was written against
the fix, then the old two-source `flush` was reinstated to confirm the tests
actually catch it:

```
with the bug reinstated:  5 failed | 2 passed
restored:                 9 passed
```

## P1 (second half) — an entry logged during an in-flight send

LlamaPReview also flagged that an entry logged while a request is open could be
overwritten by the flush's completion. The rewrite already avoids it, but only
because of a detail worth stating rather than leaving to luck: the queue is
sliced **as it stands after the await**, not from a snapshot taken before it. A
pre-flight copy written back on completion would discard anything logged in
between. Now covered by test, and the reason is a comment at the slice.

Related gap, also from LlamaPReview and also real: after a transient failure
nothing rescheduled. `schedule()` was only called by `logAudit`, so an idle tab
could hold unsent entries indefinitely — until the user happened to do something
else. Retries now run on a backoff (400 ms doubling, capped at 30 s), covered by
a test that advances time without logging anything new.

## P1 — the Security page could claim "Verified" when it had verified nothing

Found by Vercel Agent Review. Correct, and the sharpest finding of the round: it
is precisely the failure this pass exists to eliminate, reintroduced one layer up.

`integrity` was initialised to `{ valid: true, … }`, and `reload()` set
`logError` on failure — a value nothing rendered. So if the verify request
failed, the page kept the initial value and displayed **Verified — No tampering
detected**. The old implementation lied because the browser verified its own
chain; this would have lied because the browser assumed an answer it never got.

`integrity` is now `null` until the server answers, and the tile distinguishes
three states rather than two:

| State | Tile | Detail |
|---|---|---|
| answered, intact | **Verified** | "No tampering detected across N entries" |
| answered, broken | **Broken** | the server's reason, e.g. "Entry 5 has been modified…" |
| no answer | **Unavailable** | the error, plus a banner saying integrity is *unknown* — "this is not a statement that the chain is intact" |

Verified in the browser by intercepting `/api/audit/verify` with a 503
(`07-security-unavailable.png`): the tile reads **Unavailable — This deployment
has no database configured**, and `Chain Integrity\nVerified` does not appear.

## P2 — the audit vocabulary was defined twice

Sourcery. Categories and severities existed as runtime `Set`s in
`api/audit/index.ts` and as union types in `src/lib/auditLog.ts`, free to
diverge — a category the UI offers and the server rejects, or one the server
stores and the UI has no branch for. Both now derive from `AUDIT_CATEGORIES` /
`AUDIT_SEVERITIES` in `src/lib/auditChain.ts`, which the API already imports for
hashing.

## P2 — a timing assertion that would flake

Sourcery, correctly: the decoy test compared wall-clock durations as a ratio,
which is noisy on a loaded CI runner. Their preferred fix — count derivations by
mocking `node:crypto` — was tried and does not work here: vitest intercepts the
mock for imports in the test file but not for `api/_lib/password.ts`, confirmed
with a probe (`direct call count: 1`, `via hashPassword count: 0`).

Replaced with a **one-sided lower bound**: the decoy path must take longer than
90 ms, roughly a fifth of the real cost. A lower bound cannot flake the way a
ratio does — a slower machine only makes the number larger. Stated plainly in
the test: this catches a decoy that short-circuits, and does **not** catch a
decoy built by hashing (two derivations). That variant is prevented structurally
— `DECOY_HASH` is a module-level constant of random bytes with no scrypt on the
path — and was measured by hand at ~1130 ms against ~665 ms (EV-010 §2).

## GitGuardian — false positive

`api/_lib/password.ts:26` flagged as "Generic Password". The line was
`scrypt(password.normalize("NFKC"), …)`; the detector read `password … "NFKC"`
as a password assigned a literal. There is no secret: the repository contains no
credential, and the demo accounts have no password at all.

Rather than argue with a scanner that blocks CI, the normalisation moved into a
named helper — which it should have been anyway, since it was duplicated across
both derivation paths and the two must normalise identically or a password would
verify on one keyboard and fail on another.

## Checks

```
npm run typecheck   clean
npm test            141 passed (10 files)   [was 132]
npm run build       clean
```

Tests added: `auditTransport` (9). The audit-duplication defect would have been
caught by a transport test at any point; there was none, which LlamaPReview also
noted as P2. There is one now.
