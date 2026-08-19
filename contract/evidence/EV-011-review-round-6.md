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
(`screens/07-security-unavailable.webp`): the tile reads **Unavailable — This deployment
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

---

# Second round — cubic (31 findings) and a production-only crash

## The deployed API was crashing at import

Found by exercising the Vercel preview rather than by review. `/api/auth/me` and
`/api/book/clients` answered correctly, but `/api/auth/demo` returned
`FUNCTION_INVOCATION_FAILED` — **including on its acknowledgement check, which
runs before any database call**. A handler failing before its first line means
the module never loaded.

The cause: `src/lib/auditChain.ts` imported `./sha256` with no extension. That is
correct for a bundler and wrong for Node ESM, which is what Vercel runs. Every
function reaching the audit chain — demo, login, logout, audit, client-update —
died on import. `me.ts` survived only because nothing it imports touches the
chain.

Nothing local catches this: the dev host bundles with esbuild and vitest resolves
through Vite, and both are happy with extensionless specifiers. It is visible
only on the platform. The specifier is now `./sha256.js`, with a comment saying
why it is not stylistic.

**This is the strongest argument in this evidence file for deploying before
declaring done.** Local typecheck, 141 tests, a production build and a full
browser journey against that build all passed while the deployed API was dead.

## P1s accepted and fixed

| Finding | Why it was real |
|---|---|
| **Audit entries named the impersonated user** | An administrator acting as an agent produced entries attributed to the agent. The trail hid the only person who could be held to the action, while looking perfectly well-formed. Actor is now the account holder; the effective identity moves to the details as `(acting as …)`. |
| **Deleting the newest entries verified clean** | Verification walked the surviving rows, so a truncated chain was still internally consistent — and an emptied one verified vacuously. A head marker (`audit_heads`) is now written after each append and compared during verification. |
| **Impersonation survived a role change** | The stored pointer was trusted on every request. If the impersonated account was later promoted, the session resolved as the *new* role — escalation arriving without anyone doing anything suspicious. Permission is now re-checked on every lookup, and failing it drops the impersonation rather than the session. |
| **Retention could read every producer's pay** | `agent:view_payments` is admin and supervisor only, but the endpoint returned the `payments` array to anyone who could list agents. Scoping decides which *rows* are visible and says nothing about columns. |
| **`/agents/:agentId` was denied to everyone** | A regression from making route lookup fail closed: the detail route was absent from the table. Fixed, and a test now reads the route list out of `App.tsx` so a page added without a permission entry fails there rather than in someone's browser. |
| **Hooks presented a failed fetch as an empty book** | "Could not load" and "you have no clients" are different facts that looked identical, and a revoked session kept rendering cached rows. |
| **Seed could convert the demo tenant to a real one** | `SEED_TENANT_SLUG=demo` would strip the read-only gate from a tenant full of invented clients. `is_demo` is no longer updatable and the slug is reserved. |
| **Seed could move an account between tenants** | Email is unique table-wide, so an unqualified upsert handed somebody else's account — password intact — to whichever tenant seeded that address last. |
| **Seed could leave a password on a demo account** | `coalesce` preserved an existing hash, which would have made a demo account reachable from `/api/auth/login`. Demo accounts are now set to null outright. |
| **A direct Neon endpoint was only warned about** | A warning nobody reads is not a control. Refused in production. |

Verified end to end after the fixes:

```
retention agents:  5 agents, payment rows total: 0     (admin: 7 agents, 15 rows)
audit while impersonating:
  TEST_WHILE_IMPERSONATING  actor=Patricia Chen | acted (acting as Daniel Reyes, agent)
tail deletion:     "The chain ends at entry 82, but entry 84 was recorded."
total deletion:    "The chain is empty, but 84 entries were recorded."
```

## P2s accepted and fixed

Logout clears the cookie before any database call, so a failed revoke cannot
restore the session on refresh. Same-origin checking compares scheme as well as
host. `audit_events` uses `on delete restrict`, so removing a tenant is no longer
a route to erasing its trail. The demo button is disabled while a credential
sign-in is in flight. The exported setup block runs `db:extract` before
`db:seed`. `SEED_ADMIN_EMAIL` is trimmed.

**Screenshots are committed** under `screens/`. cubic was right that citing
images absent from the repository is not reproducible evidence.

## Disputed

**"Adding `api` to tsconfig breaks typecheck without Node types."** It does not.
`npm run typecheck` passes, and the coverage was confirmed by planting a
deliberate type error in `api/` and watching it fail. Recorded here because the
claim is specific and checkable, and checking it is cheaper than assuming either
way.

## Accepted as open risks, not fixed here

- **Any authenticated user can submit arbitrary audit semantics** (`POST /api/audit`).
  True, and inherent to a client transport: the UI logs what the UI did. It is
  bounded — actor, session and IP come from the session, category and severity
  are validated, and entries are additive — so the trail can be padded but not
  falsified as to who acted. Emitting every event server-side from the operation
  handlers is the real answer and is a larger change than this pass. **R-014.**
- **Batch appends are not one transaction**, so a lost response can duplicate
  entries on retry. Needs client-generated idempotency keys. **R-015.**
- **A write and its audit entry are not atomic** in `client-update`. **R-016.**
- **Login throttling has a check-then-act race** under concurrency. **R-017.**
- **Verification rehashes the whole chain** on every call, which will not hold at
  length. **R-011**, already recorded.
- **Demo audit entries carry visitor IP and user agent**, readable by any demo
  visitor with the auditor role. **R-018.**
- **CSV export covers only the 500 loaded rows.** **R-019.**

---

# Third round — a stale verdict, which is the same defect one step later

Vercel Agent Review, against `6770e89`, on code I had just changed to fix the
first version of this:

> A failed `reload()`/`handleVerify()` leaves stale `integrity` state, so the
> Chain Integrity card falsely shows "Verified" while an error banner is
> displayed.

Correct, and a genuinely different case from the one already fixed. That fix
covered the **initial** state — `integrity` starts `null` rather than
optimistically valid, so a page that has never had an answer does not claim one.
It did nothing for the **stale** case: a load that succeeded, followed by a
refresh that failed, kept the earlier verdict on screen while the error was
reported beside it.

"Verified" then means *it was intact when we last managed to ask*, displayed
identically to *it is intact*. For a control an auditor reads, those are not the
same statement, and the difference is invisible.

Both catch blocks now clear the verdict as well as recording the error, and the
banner says the listed entries may be out of date, since only the verdict is
cleared and the rows are left in place as context.

Verified in the browser — load cleanly, then fail only the refresh
(`screens/08-security-stale-verdict.webp`):

```
1. loaded successfully : Verified
2. refresh then failed : Unavailable
   still claims Verified?  false
   says integrity unknown? true
```

Worth recording plainly: this is the third distinct way the same page has
claimed a verified chain without having verified one. First the browser verified
its own chain; then it assumed an answer it had never received; then it kept an
answer that had expired. The failure mode is not a bug that keeps recurring by
accident — it is what a status display does by default, unless every path that
can fail is made to say so.

---

# Fourth round — cubic, 36 findings

Eight fixed as real defects, several of which falsified claims made earlier in
this same evidence file. The rest are recorded rather than fixed, with reasons.

## Fixed — defects

| Finding | Why it mattered |
|---|---|
| **`verifyAudit` returned valid when the head marker was absent** | The marker is what detects deletion of the *newest* entries. Guarding the comparison on `if (marker …)` meant deleting the marker — one row, easier than deleting the chain — restored exactly the hole the marker was added to close. Now fails closed: entries with no marker cannot be reported as verified. |
| **The raw query hooks kept serving rows after an authorization failure** | The previous round's fix covered the array helpers (`useClients`) but not `useClientsQuery`, which `ClientsCRM` uses directly. TanStack keeps the last successful data alongside `isError` — correct for a flaky feed, wrong for rows behind an authorization check, because a revoked session kept rendering the book. Blanked at the one place every consumer passes through. |
| **The CSV export escaped every cell twice** | `csvRows` escapes each cell; the caller mapped `csvCell` over the rows first. A spreadsheet showed `"""Patricia Chen"""` instead of a name. The injection defence still worked — the output was simply wrong. |
| **Queued audit entries could be delivered under the next user's identity** | Entries carry no actor: the server attributes them to whoever is signed in when they arrive. An entry queued before sign-out and flushed after the next sign-in would name the wrong person. Sign-out now flushes while the cookie is still valid, revokes, then discards the remainder — a gap in the trail rather than a misattribution, which is the better failure. |
| **Recovered entries waited for the next user action** | A queue restored from storage was only flushed when something else happened to call `logAudit`. An idle tab held it indefinitely. Flushed on load. |
| **Re-seeding re-enabled a disabled account** | `status = 'active'` was unconditional in the upsert. Somebody disables an administrator; the next `npm run db:seed` turns them back on. `status` is now absent from the update clause entirely. |
| **A malformed entry reported its array index as `brokenAt`** | The Security page renders that as "Broken at #N" and sends the operator to a row. For any window not starting at seq 1, it sent them to the wrong one. Reports the row's own sequence, falling back to position only when that field is unusable — which is possible precisely because the record is malformed. The existing test asserted the old behaviour and was corrected. |
| **`esbuild` was imported by the seed but never declared** | It resolved transitively through Vite. A production-only install would not have it. |

Also fixed: `contract/RISKS.md` had a blank line between R-010 and R-011 that
split the markdown table, so nine risk rows rendered as literal pipes.

## Corrected claims

Two numbers and one statement in EV-010 were wrong, and review was right to
check them against the tree rather than take them:

- Test counts quoted figures from mid-pass runs. They now match what `npm test`
  reports at this commit: **143 across 10 files**.
- "No server code shipped to client" was false as stated. The export feature
  deliberately ships `api/` and `db/` as raw text so the downloadable zip is
  runnable. What that exposes is implementation, not secrets — scrypt cost
  parameters, the session-digest scheme and the schema are all safe to publish,
  and a design depending on their secrecy would be broken regardless. The claim
  is corrected rather than the behaviour changed.

## Recorded, not fixed

Each of these is real. None is a defect that a reader of this branch would hit,
and each needs a design decision rather than a patch:

- **The database does not enforce append-only.** The API's role can `UPDATE` and
  `DELETE` `audit_events`. The chain makes tampering *detectable*, which is what
  it claims; making it *impossible* needs a restricted writer role or a
  security-definer function. **R-020.**
- **Multi-tab duplicate sends.** Two tabs share one outbox and flush
  independently. **R-021.**
- **Append and head-marker are two statements**, so a failure between them can
  leave a stale marker and a false tamper report. Needs one transaction, which
  the HTTP driver does not offer. **R-022.**
- **Verification reads entries and marker separately**, so a concurrent append
  can make a healthy chain look truncated for one request. **R-023.**
- **Sessions and login attempts are never purged.** **R-024.**
- **`__Host-` cookie prefix** would stop a sibling subdomain planting a duplicate
  session cookie. **R-025.**
- **A missing `Origin` header skips the same-origin check.** Deliberate — a
  non-browser client has no ambient cookie — but it is an assumption worth
  naming. **R-026.**
- **NFKC vs NFC.** NFKC folds compatibility characters, so a few visually
  distinct passwords become aliases. The entropy cost is small and the
  cross-keyboard benefit is the reason it is there; changing it now would
  invalidate existing hashes. **R-027.**
- **`requireRoute` is unused.** Route permissions gate pages, not endpoints, and
  the endpoints are scope-gated instead. Kept deliberately or removed — it is one
  or the other, and it is currently neither. **R-028.**
- **Notes over 2,000 characters are truncated rather than rejected.** **R-029.**
- **The route-list test parses `App.tsx` with a regex.** Fragile, as noted; the
  right fix is exporting the route table from a module both sides import.
  **R-030.**
