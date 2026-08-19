# EV-010 — Server-side authentication, authorization, and the gated demo

Closes **R-001**, **R-002**, **R-010**. Advances **R-003**. Records **D-010** … **D-014**.

Everything below was exercised against the running system: the API on its dev
host and the app in Chromium at 1440×900, both talking to the real Neon
database (`falling-dream-48302930`, Postgres 18.4). No result here is inferred
from reading the code.

The screenshots cited are committed alongside this file under `screens/`, so a
reader can check the claims rather than take them. They are WebP at 72% scale —
legible, and a fraction of the 6 MB the originals would have added to the
repository.

---

## 1. What was actually wrong

`roleContext.tsx` held a table of SHA-256 password digests, compared them in the
browser, and wrote a "session" object to `localStorage`. Every part of that was
decorative:

- the digests shipped inside the JavaScript bundle, unsalted and offline-crackable;
- the session was a value any user could type into devtools;
- the data it "protected" had already been downloaded — `dataScope.ts` filtered
  arrays that were in the bundle either way;
- the audit chain that evidenced all of it was written, stored and verified by
  the same browser it was auditing.

The product was live at a public URL while presenting this as access control.

## 2. Authentication

| Check | Result |
|---|---|
| Correct password | `200` + `Set-Cookie: ab_session=…; HttpOnly; SameSite=Lax` |
| Wrong password | `401 {"error":"unauthorized","message":"Email or password is incorrect."}` |
| Unknown address | `401` — byte-identical message |
| Unauthenticated `GET /api/book/clients` | `401`, no rows |
| After `POST /api/auth/logout` | `401` — the session row is revoked server-side, not just the cookie dropped |

**Account enumeration by timing.** The unknown-address path originally built its
decoy hash by running scrypt, so it cost *two* derivations against a real
account's one. Measured before the fix:

```
known (wrong password)   median  665 ms
unknown address          median 1130 ms      <- a 465 ms signal, reliable enough to enumerate
```

The decoy's key bytes are now random rather than derived, leaving exactly one
derivation on both paths:

```
known    763 1615 1464 671 756   median  763 ms
unknown 1326  726  704 718 777   median  726 ms      gap 37 ms, inside a 671–1615 ms noise band
```

Timing on the deploy target is not something this environment can measure; what
is established is the structural property — one derivation per path — and the
disappearance of the systematic gap.

**Throttling.** After 8 failures for an address inside 15 minutes the endpoint
returns `429` before doing any hashing. Observed directly: a run of samples
collapsed from ~700 ms to a median of 83 ms once the limit engaged, which is
what invalidated an earlier timing measurement and is recorded here because it
is the same evidence.

## 3. Authorization is the scope, in SQL

Scoping is two bound parameters on a fixed query:

```sql
where tenant_id = $1 and ($2::boolean or agent_id = $3)
```

`all = false` with a null agent id yields `agent_id = NULL`, which is never
true — an agent login with no staff record gets **no rows**, not every row.

Measured through the API, demo tenant:

| Session | clients | policies | appointments | agents |
|---|---|---|---|---|
| Administrator | 48 | 38 | 12 | 7 |
| Agent (Daniel Reyes, AG-001) | 10 | 8 | 6 | 1 |

And in the product, not just the API — `screens/05-clients-as-agent.webp`: the header
badge reads **Viewing: My Book**, the counts are 6 Active / 2 Pending / 2
Prospects / 0 Lapsed, every row's Agent column is *Daniel Reyes*, and
Reconciliation and Supervisor have disappeared from the navigation.

**Cross-tenant.** A temporary real tenant (`qa-temp`, since deleted) was seeded
with its own book. Its administrator saw exactly its 1 client and none of the
demo's 48. Targeting a demo client id by hand returned `404`.

**Write scoping**, on the real tenant:

| Attempt | Result |
|---|---|
| Agent edits their own client | `200` |
| Agent edits another agent's client | `404 "No such client in your book."` — and the row was confirmed unchanged |
| Read-only auditor edits anything | `403 "Your role (readonly) may not perform \"client:edit\"."` |

Out-of-scope and does-not-exist return the same answer deliberately: telling an
agent that a client exists but is not theirs leaks the shape of the book. The
scope predicate is applied inside the `UPDATE`'s `WHERE` clause rather than
checked beforehand, so there is no window between the check and the write.

## 4. The gated demo

| Check | Result |
|---|---|
| `POST /api/auth/demo` without acknowledgement | `400` — the gate is server-side, not a checkbox the UI honours |
| With acknowledgement | `200`, session bound to the tenant flagged `is_demo` |
| Demo write | `403 {"error":"demo_read_only", …}` |
| Demo accounts via `/api/auth/login` | impossible — they carry no password hash |

The "Enter demo" button is disabled until the acknowledgement is ticked
(`screens/01-login.webp`), and every page carries the banner *"Demo — Sample agency,
invented data. Changes are disabled."* (`screens/03-clients-admin.webp`).

The onboarding wizard is skipped for demo sessions. It was not, at first: the
first run of this journey landed on *"Welcome to agencyBRIDGE — Step 1 of 6"*
and never reached the product. A visitor who clicked "Enter demo" came to look
at the thing, and nothing they typed would have been kept anyway.

**Audit appends are deliberately exempt from the read-only rule.** Suppressing
them would leave the demo's own Security page showing an empty chain — a
misrepresentation of the feature the page exists to demonstrate. Appends are
additive and attributed to the demo session; they cannot alter the book anyone
else sees.

## 5. The audit trail is now evidence

Hashed and verified in Postgres, by code the browser cannot reach. Verified by
tampering with the database directly and reading the product's own UI:

| Tampering, applied with SQL | Server verdict |
|---|---|
| none | `{"valid":true,"brokenAt":null,"truncated":false,"count":5}` |
| `details` of entry 5 rewritten | `valid:false, brokenAt:5, "Entry 5 has been modified since it was written."` |
| a middle entry deleted | `valid:false, brokenAt:4, "Entry 4 does not link to its predecessor."` |
| head entries 1–2 deleted | `valid:false, brokenAt:1, truncated:true, "The chain starts at entry 3; entries before it were removed."` |

That last row is the case a naive verifier misses. Taking the surviving head's
own `prevHash` as the expected boundary would make front-deletion verify clean.
Nothing in this system removes an audit row, so a chain that does not start at
`seq = 1` has had rows deleted, and it is reported as tampering rather than
retention. (If a retention window is ever added it must record the boundary hash
it trimmed to — noted as R-011.)

And through the UI: after rewriting the demo tenant's entry 1 in Postgres, the
Security page's Chain Integrity tile read **Broken — Broken at #1**
(`screens/06-security-tampered.webp`). Restored, it reads **Verified — No tampering
detected** (`screens/04-security.webp`).

**Actor spoofing.** A client posting `{"actor":"Somebody Else","actorId":"impostor"}`
had it ignored; the entry recorded `QA Admin` with the session's own user id.
Actor, session and IP come from the session or they mean nothing.

## 6. Impersonation

Previously the client swapped its own `user` object — an admin "viewing as an
agent" still held the whole book, so the screen asserted a restriction that was
not in force. The impersonated user is now recorded on the session row and every
request resolves its effective identity from it. Permission is checked against
the caller's **real** role, so stepping down to `agent` and back up is not an
escalation path (a property also pinned by test).

Observed: `POST /api/auth/switch-role {"role":"agent"}` → `200`, then the same
page returned 10 clients instead of 48, with the banner *"Viewing as Daniel
Reyes (Agent) — You are impersonating this role from Patricia Chen
(Administrator)"*.

## 7. Routing

`vercel.json`'s SPA rewrite was `/((?!assets/).*)`, which would have swallowed
every `/api/*` request and returned the HTML shell — a production-only failure
behind a green build, surfacing as a JSON parse error on `"<!doctype"`. The
pattern is now `/((?!api/|assets/).*)`, and `scripts/assert-spa-rewrite.mjs`
exercises four API paths in its negative set, so CI fails if it regresses. The
client also names this case explicitly when a response is not JSON, rather than
surfacing a parser error.

## 7a. Two defects this pass introduced or exposed, found by running it

Both were caught by driving the real app rather than by reading the diff.

**Signing in landed on a 404.** Authenticating does not change the URL, so a
session that began at `/login` fell through the authenticated router — which has
no `/login` route — to the catch-all. The first thing a new user saw after a
successful sign-in was *"404 — Oops! Page not found"* (`screens/02-dashboard-admin.webp`,
before the fix). The condition pre-dates this pass; it was hidden because the
onboarding wizard rendered outside the router and covered it. Skipping onboarding
for demo visitors exposed it to every one of them. `/login` now redirects to the
dashboard once a session exists.

**The demo could not be reached past a six-step setup wizard.** The first run of
this journey never got to the product: it stopped at *"Welcome to agencyBRIDGE —
Step 1 of 6"*. A visitor who clicked "Enter demo" came to look at the product,
and the demo tenant is read-only, so nothing they typed would have been kept.
Onboarding is now skipped for demo sessions.

## 8. Checks

```
npm run typecheck   clean
npm test            143 passed (10 files)
npm run build       3425 modules, entry chunk unchanged at 1.1 MB
node scripts/assert-spa-rewrite.mjs   OK
```

`tsconfig.json` covered `src` only, so the entire API layer was invisible to
`tsc` — CI would have stayed green while a broken handler shipped. `api` is now
in `include`, verified by planting a deliberate type error and confirming it
failed the check. The bundle was checked in both directions, and the result needs stating
precisely rather than as a slogan. **No password digests reach the client** —
the credential table is gone. **No server code executes in the client**: nothing
under `api/` is imported by the app's runtime. But the "export source" feature
*does* ship `api/` and `db/` as raw text, in lazily-loaded chunks, so the
downloadable zip is runnable — a deliberate choice recorded in the diff, and one
that makes "no server code shipped to client" false as stated. What is exposed is
implementation, not secrets: scrypt cost parameters, the session-digest scheme
and the schema are all safe to publish, and any design that depended on their
secrecy would be broken anyway. The claim is corrected here rather than the
behaviour changed.

The final journey was run against the **production build**, served with the
rewrite semantics `vercel.json` declares and `/api` proxied to the function host
— the shape the deployment has, not the dev server. Results were identical.
Remaining console noise is five `ERR_CONNECTION_RESET` from the hot-linked CDN
images this sandbox cannot reach (R-006) and the 403/401 from the deliberate
negative tests above.

Tests added over this pass and the review rounds that followed it: `scope` (17),
`permissions` (18), `auditChain` (20), `password` (12), `auditTransport` (11).
The counts here are the ones `npm test` reports at this commit; earlier drafts of
this file quoted figures from mid-pass runs, which review correctly caught as
inconsistent with the tree.
Removed: `dataScope.test.ts` and `auditLog.test.ts` — both tested modules that no
longer exist. Their subject matter did not disappear with them; the scoping rules
are now tested where they are enforced, and the chain is tested in the module the
API appends with.

## 9. What this does not do

- **R-003 is advanced, not closed.** The log is server-side and append-only, but
  "meeting CMS 42 CFR requirements" also implies retention guarantees, access
  review, backup and recovery, and an independent time source. None of those
  exist. The claim is closer to true and is still not earned.
- **No API handler has an automated test.** Authorization is proven at the unit
  level and by the manual exercise above. A handler-level suite needs a database
  in CI, which is not set up.
- **`DATABASE_URL` must be set by hand** in the Vercel project (R-012); it cannot
  be set from this environment.
- **Only four entities moved server-side** — clients, policies, appointments,
  agents. They are the ones scoping applied to, so they are the security surface.
  The remaining page content (knowledge base, campaign templates, workflow
  definitions, Medicare reference data) is product content rather than customer
  records and still ships in the bundle.
- **The demo's audit chain grows without bound** (R-011), and the demo gate is
  not rate-limited (R-013).
