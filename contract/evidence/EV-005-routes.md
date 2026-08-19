# EV-005 — Routing and payload

**Claim:** REQ-002, REQ-009.
**Timestamp:** 2026-08-19T00:30:29Z
**Environment:** Node v22.22.2, npm 10.9.7, linux x64, Chromium 1194 headless

## Code splitting

24 authenticated pages converted to `React.lazy`; `LandingPage`, `LoginPage`, and
`NotFound` stay eager so the public first paint is not behind a second round trip.

| | Entry chunk | gzip |
|---|---|---|
| before | 2,804 kB | 629 kB |
| after | 1,040 kB | 315 kB |

Landing page load requests **1 JS chunk**; no authenticated page chunk is fetched
before sign-in (verified by intercepting requests).

## Route rendering under lazy loading

`src/App.tsx` defines 24 route paths. All were navigated directly in a headless
browser against the production build, after sign-in:

```
ok  /                   "Welcome back, Lang"          ok  /reporting          "Reporting & Analytics"
ok  /clients            "Clients & Leads"             ok  /admin              "Admin Dashboard"
ok  /policies           "Policies & Commissions"      ok  /email-campaigns    "Omnichannel Marketing"
ok  /pipeline           "Sales Pipeline"              ok  /data-tools         "Data Import / Export"
ok  /reconciliation     "Commission Reconciliation"   ok  /knowledge-base     "Knowledge Base Admin"
ok  /compliance-center  "Compliance Center"           ok  /security           "Security & SOC 2 Compliance"
ok  /retention          "MA Retention Center"         ok  /supervisor         "Supervisor Dashboard"
ok  /dialer             "Softphone Dialer"            ok  /calendar           "Calendar & Appointments"
ok  /quoting            "Quoting Engine"              ok  /documents          "Document Management"
ok  /workflows          "Workflow Automation"         ok  /client-portal      "Client Portal"
ok  /agents             "Agents"                      ok  /backoffice         "Agent Backoffice"
ok  /compliance         "Compliance Dashboard"
```

The 24th path is the parameterised `/agents/:agentId`, verified separately because
it needs a concrete id:

| Path | Result |
|---|---|
| `/agents` | renders "Agents" |
| `/agents/AG-001` | renders the detail view, heading "Daniel Reyes" |
| `/agents/does-not-exist` | renders the fallback view, no error |

No route stuck on the Suspense fallback; **no JS errors**. `/nope-404` correctly
renders the in-app 404.

## Lazy-load failure containment

`React.lazy` rejects when a chunk cannot be fetched — a stale chunk after a deploy,
or a dropped connection. Before this pass that rejection reached the single root
`ErrorBoundary` and replaced the whole shell, sidebar included, for a recoverable
network blip. Statically imported pages could never fail that way, so code
splitting introduced the failure mode. Each route is now wrapped in
`RouteErrorBoundary`, which keeps the failure inside the page area, records a
`route_load_failed` audit entry, and offers a retry that remounts the subtree so
the import is re-attempted.

## Production SPA rewrite

`vercel.json` rewrites unmatched paths to `/index.html` while excluding `/assets/`,
so a missing hashed asset 404s instead of returning HTML. CI now asserts the rewrite
exists (`.github/workflows/ci.yml`), because its absence is a production-only failure.
