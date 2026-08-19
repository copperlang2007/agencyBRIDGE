# Decisions — agencyBRIDGE

Immutable IDs. Never silently rewrite a decision; supersede it with a new one.

## D-001
**Status:** accepted
**Decision:** Repository reality and executable evidence outrank AI memory.
**Rationale:** Inherited from Build Contract OS. Applied at session start: the local branch was found stale against `origin/main` and reset before any edit rather than trusting the prior handoff.

## D-002
**Status:** accepted
**Decision:** Project governance artifacts live in this repository under `contract/`, with a root `BUILD-CONTRACT.md` entrypoint, rather than under `build-contract-os/projects/agencybridge/`.
**Rationale:** `PROJECT-INHERITANCE.md` requires a root-level entrypoint in the governed repository. This session has read-only access to `build-contract-os`, so the canonical project directory and the `PROJECT-REGISTRY.yaml` entry cannot be written from here.
**Consequence:** R-008 — the registry entry is still owed upstream. This is a recorded gap, not a silent bypass.

## D-003
**Status:** accepted
**Decision:** The audit chain hashes synchronously with a bundled SHA-256 (`src/lib/sha256.ts`) instead of the async Web Crypto digest.
**Rationale:** `logAudit` is synchronous and called from 26 sites. The previous implementation wrote a weak placeholder hash, then overwrote it from a promise — so a second entry logged before that promise resolved chained against a hash that no longer existed, corrupting the chain under ordinary use. An async digest cannot satisfy a synchronous append. Verified: 10 fixed vectors plus 500 randomized inputs match Node's `crypto` exactly.
**Alternatives rejected:** making `logAudit` async (26 call-site changes, and React event handlers would still race); keeping the FNV fallback (not tamper-evident).

## D-004
**Status:** accepted
**Decision:** The audit storage key moves from `medicare_audit_log_v1` to `..._v2`.
**Rationale:** The hash input changed (it now covers every material field, length-prefixed). Existing v1 logs in a browser would fail verification against the new scheme and raise a false tamper alarm. A key bump retires them cleanly.
**Consequence:** Audit history in an existing browser profile is not migrated. Acceptable while the log is demo-local; revisit when R-003 is addressed.

## D-005
**Status:** accepted
**Decision:** A blank "paid" field in the Short-Pay Detector is analyzed as $0.00 received, not discarded.
**Rationale:** The previous filter required all three fields, so the most severe case — an agent paid nothing at all — was silently dropped from the analysis. A negative amount is likewise now preserved rather than having its sign stripped, so a chargeback is no longer scored as a full payment.
**Evidence:** `src/test/shortPayDetector.test.ts`, plus browser verification: expected $750 / paid −$450 → variance −$1,200, two short pays, chargeback guidance.

## D-006
**Status:** OPEN — owner decision required
**Decision:** Undecided. R-001 has two viable resolutions and they imply different products:
  - **(a) Real backend.** Move credential verification server-side, issue a session, and hold data in Neon. Makes the security claims true; a substantial architecture change.
  - **(b) Explicit demo.** Keep the mock-data build, but password-protect the Vercel deployment and set `robots: noindex`, so it is not presented as a production system.
**Rationale for deferring:** Choosing (a) silently would be a material architecture change the operator did not request; choosing (b) silently would change the product's public posture. `AGENT-GOVERNANCE.md` forbids an agent altering security boundaries or requirements on its own authority.

## D-007
**Status:** accepted — Brand Deviation ADR
**Decision:** agencyBRIDGE retains its navy/institutional-blue primary palette rather than the operator's house standard of dark-premium with gold accents (`#E5C07B` family, "never cool-blue primary").
**Rationale:** The product is already deployed and indexed under the navy identity; navy is the conventional trust register for carrier- and CMS-adjacent B2B software; repainting the primary would invalidate the shipped identity and every screenshot without improving the product's objective. `BRAND-GATE.md` permits a documented deviation where the canonical package would be weaker for the product.
**Scope:** agencyBRIDGE only. Does not license palette drift in other properties.
**Confidence:** Medium.
**Revisit trigger:** Portfolio-wide brand unification, or folding agencyBRIDGE under the `theartificialbridge.com` visual system.
**Generalizable?** Possibly — "vertical B2B products may hold an inherited trust palette" is a candidate for canonical review.

## D-008
**Status:** accepted
**Decision:** The CMS-benchmark payout inference in `copperlang2007/commission-engine` (`PayoutDetective`) is **ADAPT — deferred**, not reused now.
**Rationale:** See `IP-MAP.yaml` IP-001. It is materially stronger domain logic than agencyBRIDGE's classifier, but it is Python/FastAPI and requires a `Policy` record with CMS FMV rates and an effective date. agencyBRIDGE's public tool has no rate table and no server — it asks the agent to type the expected amount precisely because of that. Porting it requires infrastructure that does not exist in this repo yet.

## D-009
**Status:** accepted
**Decision:** The audit store moves from a bare entry array under `medicare_audit_log_v2` to a single object under `medicare_audit_log_v3`: `{ head, entries }`.
**Rationale:** The retained-head boundary and the entries it describes must never disagree. Held in a sibling key they were two non-atomic `setItem` calls — a failed second write or an interleaving tab left the boundary describing a head the log no longer had, and verification reported good entries as tampered. One key and one write removes the window entirely.
**Consequence:** v2 logs in an existing browser profile are not migrated, for the same reason as D-004 — a different stored shape would fail verification and raise a false alarm. Acceptable while the log is demo-local; revisit with R-003.

## D-010
**Status:** accepted — resolves D-006
**Decision:** Both paths. A real backend verifies credentials and holds the book of business, **and** the public deployment runs an explicitly gated, read-only demo tenant.
**Rationale:** The owner chose both when D-006 was put to them. They are not alternatives once a server exists: the backend makes the security claims true, and the demo makes the public URL honest about what a visitor is looking at. Neither alone does both jobs — a backend with the sample book still open would present invented clients as a live agency, and a gated demo without a backend would still be a browser deciding its own permissions.
**Consequence:** R-001 closes. R-002 closes. R-010 closes (the chain no longer lives in `localStorage`).

## D-011
**Status:** accepted
**Decision:** Vercel Serverless Functions under `api/`, with Neon Postgres, rather than migrating the app to Next.js + tRPC as the house stack prescribes.
**Rationale:** The house default applies "unless the repo overrides"; this repo is a shipped Vite SPA with its own router, CI, bundle budget and deployed identity. A framework migration would rewrite every route and invalidate the code-splitting and rewrite work already verified — for no security benefit, because the boundary that was missing is a server, not a framework. Functions in the same deployment give a real origin-side boundary with no change to how the app is built or served.
**Confidence:** High.
**Revisit trigger:** Server-rendered pages, streaming, or a shared server/client type layer become requirements.

## D-012
**Status:** accepted
**Decision:** Passwords are hashed with scrypt from the Node standard library at OWASP's recommended cost (N=2^17, r=8, p=1), not argon2 or bcrypt.
**Rationale:** Both alternatives are native addons. A serverless bundle that must compile or ship platform binaries fails on the first cold start on a runtime nobody tested, and the failure mode is "nobody can sign in". scrypt is memory-hard, in the standard library, and needs no build step. Measured at ~470ms on the deploy target, which is the intended cost.
**Consequence:** Cost parameters are stored in each hash and read back at verification, so the cost can be raised later without locking out existing accounts.

## D-013
**Status:** accepted
**Decision:** The audit chain moves from `localStorage` to Postgres, appended and verified by the API. `src/lib/auditLog.ts` becomes a transport; there is no client-side chain.
**Rationale:** A chain the audited party writes, stores and verifies is not evidence. The browser could rewrite entries, discard the log, or simply report "Verified" — and the Security page presented that self-assessment to the operator as a compliance control. Hashing on the server, in a table the client cannot reach, is what makes the verdict mean anything.
**Consequence:** `logAudit()` keeps its synchronous fire-and-forget signature, so its ~24 call sites are unchanged; entries are buffered in an outbox and posted in batches. `clearAuditLog()` is removed — an append-only trail has no clear operation, and an operator who can erase their own audit history does not have one. Actor, session and IP are taken from the session and ignored if supplied by the client. Materially advances R-003; does not close it, because the copy still claims more than the system does.

## D-014
**Status:** accepted
**Decision:** Role switching and impersonation are server-side. The session row records the impersonated user; every request resolves its effective identity from it.
**Rationale:** The previous implementation swapped the client's own `user` object. Nothing about the caller's access changed, so an admin "viewing as an agent" still held the whole book — the screen asserted a restriction that was not in force, which is worse than not offering the feature. Permission to impersonate is checked against the caller's **real** role, never the presented one, so stepping down and back up is not an escalation path.
**Consequence:** The demo's "Switch Role" and an admin's "Impersonate" are one endpoint, because they are one act.
