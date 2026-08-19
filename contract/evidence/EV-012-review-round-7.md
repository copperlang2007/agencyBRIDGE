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
