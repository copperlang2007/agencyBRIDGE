# EV-012 — Review round 7

cubic's re-review of `b778e8b` returned **6 new findings and 2 it had raised
before**. Five were real defects and one was a wrong number in my own evidence.
All six are fixed. Two of them were races I had introduced in round 6 while
fixing a different race, which is recorded here rather than smoothed over.

## The sign-out race, in two halves

Round 6 gave sign-out a deliberate order — deliver what the session recorded,
then revoke, then drop the rest — because entries carry no actor and the server
attributes them to whoever is signed in when they arrive. The order was right.
The implementation did not hold it.

**`flushAuditLog()` did not wait.** `flush()` opened with
`if (inFlight || queue.length === 0) return;`, and `inFlight` was a boolean. A
caller arriving while a request was open got an already-resolved promise, so
`await flushAuditLog()` returned immediately and the revoke overtook the
delivery it was supposed to follow. `inFlight` is now the promise itself, and a
second caller is handed *that* — the state was a boolean where the callers
needed something to wait on.

**The discard reached into the next session's queue.** `discardAuditQueue()`
emptied the queue but left the in-flight request running. That request finished
with `queue = queue.slice(batch.length)` — correct against the queue it was sent
from, and after a discard that is a *different* queue. Signing out while an
append was open therefore deleted up to 25 of the *next* user's entries, from an
audit trail, with nothing to show it had happened. A generation counter, bumped
by the discard, now makes a completion from a superseded session a no-op.

Both are covered by tests that were checked against the defect, not just against
the fix:

| Defect reinstated | Result |
|---|---|
| generation guard removed | `does not let a discarded session's request eat the next session's entries` fails — `expected +0 to be 1` |
| `flush` resolves early when a request is open | `waits for a request already in flight` fails — `flushAuditLog resolved before the request came back` |

In both runs the other ten transport tests stayed green, so each test fails for
its own reason rather than from collateral breakage.

## Sign-out could revoke the session that replaced it

The third finding is the one the other two were hiding. `logout()` ran its
sequence in a fire-and-forget IIFE while clearing the UI synchronously, so the
login screen appeared while a valid cookie was still on its way to
`/api/auth/logout`. Authenticating inside that window replaces the cookie, and
the revoke — which names no session, only "whoever is calling" — then lands on
the session that was just created. The user signs in and is signed straight back
out.

The order cannot be inverted: the entries still to be delivered are
authenticated by the cookie the revoke destroys. So `logout()` now returns its
promise, and `login()` and `enterDemo()` await it before authenticating. The
window is closed by waiting it out rather than by racing it.

## `truncated` meant two things

`ChainIntegrityResult.truncated` is documented as "the head of the chain has
aged out of the retained window" — entries missing from the *front*. Two of
`verifyAudit`'s returns set it on paths where nothing is missing from the front:

| Path | Was | Now | Why |
|---|---|---|---|
| head marker absent | `true` | `false` | the walk already established the chain starts at `seq 1` and links from genesis; what is missing is the means to check the *end* |
| chain ends before the marker | `true` | `false` | entries were removed from the **end**; reporting front-truncation would have a consumer read retention into a deletion |
| chain starts above `seq 1` | `true` | `true` | genuine front loss |
| chain empty, marker present | `true` | `true` | every entry gone, front included |

cubic flagged the first. The second has the same defect and is fixed with it.
Neither is user-visible today — both consumers in `SecurityPage.tsx` read
`truncated` only when `valid` is true, and these are `valid: false` paths — so
this is a contract correction, not a bug fix, and is stated as one.

`verifyAudit` has no automated test (R-005: no handler test needs a database in
CI). This change was made by reading the field's own contract against its four
call sites, and that is the whole of its evidence.

## The count was wrong

`EV-010` claimed `auditChain` (21). The file declares 20 `it()` cases —
3 + 4 + 13. Corrected to 20, which is also the figure that makes the parts sum
to the 143 the same paragraph reports. An evidence file that misstates its own
test counts undermines the numbers next to it that are load-bearing, so this is
a P3 finding worth the same treatment as the rest.

## What was not fixed

The unconditional discard when the revoke fails (cubic P2, `roleContext.tsx:150`)
**stands as written**. The argument for retaining those entries is that the old
session may still be valid; the argument against is that the client has just
destroyed its own identity and cannot bind leftovers to the session that made
them, so an entry retained through a failed sign-out and delivered under the
next one is filed against the wrong person. For an audit trail a gap is a better
failure than a misattribution, and that is the existing, deliberate choice.

The finding is not dismissed — it names a real loss. It is recorded as
**R-031**, with the fix that would actually resolve it: bind each queued entry
to the session id that produced it and have the server reject entries whose
session does not match the caller's. Then they could be retained safely. That is
a change to the append contract and does not belong in a review round.

## Checks

```
npm run typecheck   clean
npm test            145 passed (10 files)     was 143; +2 transport races
npm run build       clean
node scripts/assert-spa-rewrite.mjs   OK
```

---

# Round 8 — the gate was the wrong shape

cubic's review of `7181660` found two more, both on the fix above.

**The gate only covered one tab** (P1). `pendingLogout` is a ref inside one
`RoleProvider`. A sign-in in *another* tab during this tab's flush still lands
inside the window, because the cookie is shared across tabs and the ref is not.

**A hung request blocked sign-in indefinitely** (P2). `await
pendingLogout.current` has no timeout, so an append or revoke that never
settles leaves the login form waiting until the page is reloaded.

Both are true, and both are consequences of guarding the window rather than
removing it. The window exists because sign-out was two round trips and **the
browser attaches the cookie when a request is issued** — so the revoke went out
with whatever cookie existed once the delivery came back.

Sign-out is now **one request**. `POST /api/auth/logout` carries the leftover
entries in its body; the server appends them under the session it is about to
revoke, then revokes. The request is issued synchronously in the click handler,
with this session's cookie, and there is no interval left for a sign-in to
occupy — in this tab or any other. `pendingLogout` and both `await` gates are
gone, so the hang has nothing to hang on.

Validation, attribution and the batch ceiling moved into
`appendClientEntries`, shared by `POST /api/audit` and by sign-out, because a
category one rejects must not be one the other quietly accepts. The delivery is
best-effort inside logout: a malformed entry must not stop somebody signing out.

Two consequences worth stating rather than leaving to be discovered:

- **Entries beyond one request's worth are dropped**, as they were before. That
  is the same loss already recorded as R-031, not a new one.
- **`flushAuditLog` had become dead production code** — after this change
  nothing but its own tests called it, while its comment claimed it was "used
  before navigating away". Nothing did that. It is now wired to `pagehide`,
  which makes the claim true and closes a real gap: entries queued when a tab
  closes previously waited for somebody to open the app again. `pagehide`
  rather than `beforeunload` because it fires for the bfcache and on mobile.

```
npm run typecheck   clean
npm test            147 passed (10 files)     +2 for takeAuditQueue
npm run build       clean
node scripts/assert-spa-rewrite.mjs   OK
```

---

# Round 9 — five more, and a claim of mine that was too strong

cubic's review of `79f5d31` found five. All five are real, and one of them
contradicts something I wrote in round 8.

## The correction first

Round 8 said sign-out as one request left "no interval to race". That is true of
**which session gets revoked** — the revoke names the token the request arrived
with, so it always targets the old session — and it is *not* true of the
cookie-clearing header, which I did not think about. `Set-Cookie` clears
whatever cookie the browser holds **when the response lands**, not the one the
request carried. Sign out, sign in before the response returns, and the clear
erased the session that had just been issued. Issuing the request first fixed
the revoke; it never controlled the header.

**The cookie is now cleared only when the revoke failed.** A revoked token is
inert — `currentSession` finds no live row for it — so clearing it is hygiene
rather than security, and not sending the header is what makes a concurrent
sign-in survive. When the revoke *fails* the token may still authenticate, and
leaving the caller signed in is the worse failure, so the cookie goes; that can
still clobber a concurrent sign-in, which now needs a failed revoke **and** a
sign-in in the same window. Recorded as **R-032** rather than described as
solved.

## A malformed body left the session alive

`jsonBody` throws a 400. Thrown from the delivery step it ended the request
before `revokeSession` ran, so a client that sent a body which would not parse
came away looking signed out — the cookie was cleared first — with its session
still live on the server. Parsing is now inside the best-effort path, and the
revoke runs regardless. Signing out is the point of the request; the entries are
cargo.

## Half a batch, then a 400

`appendClientEntries` validated and inserted in one loop, so a batch whose
second entry was invalid committed the first and then answered 400 — and the
client treats 400 as "this will never be accepted" and drops the batch. One
request left one entry in the chain and silently lost the rest. Validation is
now a separate pass over the whole batch (`prepareClientEntries`) and nothing is
appended until every entry has passed.

This closes the validation case, not every case. The appends are still separate
statements, so a database failure part-way through a batch still leaves it
partly written — that is R-015, unchanged, and it is stated rather than folded
into this fix.

## The suffix that records who was really acting

`details: str(e.details) + who.suffix` was clamped to 500 afterwards, so 500
characters of caller-supplied detail pushed the suffix off the end. The entry
then read as though the impersonated user had acted alone — losing the one fact
the suffix exists to preserve, and losing it precisely when a caller supplies
enough text to cause it. `detailsWithSuffix` reserves the suffix's room first.

## Sign-out delivered in-flight entries twice

`send` slices its batch but leaves it in the queue until the server answers, so
those entries sit there for the whole request. `takeAuditQueue` sliced from the
front, so signing out during an open append handed that request's own entries to
the logout request as well — and the server appends both. One action, two rows,
each hashing correctly, and verification passes: indistinguishable from two
things having happened. That is worse than losing them, because a gap is visible
as a gap. `takeAuditQueue` now skips whatever is on the wire.

If that open request then fails, its entries are lost. That is the R-031 trade
taken again, deliberately, over delivering an entry twice.

## Tests

Two of the five are pinned by tests checked against the defect:

| Defect reinstated | Result |
|---|---|
| `takeAuditQueue` slices from the front | fails — `expected [ 'on-the-wire', 'still-queued' ] to deeply equal [ 'still-queued' ]` |
| suffix appended then clamped | fails — `keeps the impersonation suffix when details fill the field` |

`prepareClientEntries` is covered by seven cases in a new `auditIntake` suite,
but its guarantee is structural rather than behavioural: the function is pure
and throws before `appendClientEntries` reaches its append loop, so there is no
interleaved version left to reinstate. That is a weaker form of evidence than
the two above and is worth naming as such.

The two logout fixes have **no automated test**. They live in a handler, and a
handler suite needs a database in CI (R-005). They were derived by reading the
control flow, and that is the whole of their evidence.

```
npm run typecheck   clean
npm test            159 passed (11 files)     +12; new auditIntake suite
npm run build       clean
node scripts/assert-spa-rewrite.mjs   OK
```

---

# Round 10 — two more, one of them mine again

cubic's review of `569a8ff` found two, both P1, and both true.

## A stale index outlived the queue it indexed

`inFlightCount` records how many entries at the head of the queue are already on
the wire. It indexes *positions in the queue it was measured against*, and
`discardAuditQueue` replaced that queue without resetting it. The count then
described a batch belonging to a session that no longer existed, so the next
sign-out sliced from that offset into the new session's queue and skipped that
many entries — and entries skipped at sign-out are dropped, not deferred.

Two sign-outs while one append is still open is the whole reproduction. Fixed by
resetting the count inside `discardAuditQueue`; `takeAuditQueue` reads it before
calling that, so the call that legitimately needs it still gets it.

| Defect reinstated | Result |
|---|---|
| count survives the discard | fails — `expected [] to deeply equal [ 'b1', 'b2' ]` |

That is session B's entries vanishing, which is precisely what was claimed.

## A database failure signed the user out without signing them out

This one is a regression I introduced in round 9. The original handler cleared
the cookie **before any database call**, with a comment saying why. Round 9
moved the clear to the end and made it conditional, to stop it wiping a
concurrent sign-in — and in doing so put it behind `await currentSession(req)`,
which hits the database and can throw. On that path the handler returned 503
having never reached the decision, so the cookie survived. The client swallows
the error and clears its own state, so the caller saw the login screen while
their session stayed usable: the exact failure the revoke exists to prevent,
reached by a path that skipped it.

The clear now runs in a `finally` keyed on a single `revoked` flag, so no exit
from the handler can forget to decide, and the error still propagates. The
round-9 property is kept — a token known to be dead is left alone, so a
concurrent sign-in survives — and every other outcome clears.

## The pattern is worth naming

Rounds 8, 9 and 10 have each found real defects in the sign-out and audit
transport path, and **four of them were introduced by the previous round's
fix** — the cookie header in round 9, the stale index and this one in round 10.
Each individual fix is correct. The rate at which fixing one thing here breaks
another is the actual signal: this path holds more concurrent state than its job
justifies — a queue, an outbox, a generation counter, an in-flight index, and a
handover at sign-out, all to move records the server could have written itself.

The structural answer is already written down as **R-014**: emit audit events
from the server-side operation handlers instead of accepting them from the
client. That deletes the queue, the outbox, the generation counter, the in-flight
index and the sign-out handover together, and it closes R-014, R-021, R-031 and
most of R-015 as a side effect. It is a design change, not a review-round fix,
and it is the owner's call — recorded here rather than started.

```
npm run typecheck   clean
npm test            160 passed (11 files)
npm run build       clean
node scripts/assert-spa-rewrite.mjs   OK
```
