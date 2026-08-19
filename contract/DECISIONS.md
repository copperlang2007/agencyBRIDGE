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
