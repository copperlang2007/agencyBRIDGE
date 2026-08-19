# agencyBRIDGE

Medicare agency management platform — CRM, commission reconciliation, compliance
tracking, retention analytics, softphone dialer, and AI agent assist in one app.

Single-page React application with a serverless API (`api/`) backed by Neon
Postgres. Authentication, authorization, the book of business and the audit trail
are server-side. Remaining page content — Medicare reference data, knowledge base
articles, campaign and workflow templates — is still in-repo sample data under
`src/lib/`.

## Requirements

Node 20+ (developed against Node 22), and a Postgres database (Neon).

## Getting started

```bash
npm install

export DATABASE_URL='postgresql://…-pooler.…/neondb?sslmode=require'
npm run db:migrate     # applies db/schema.sql then db/constraints.sql
npm run db:seed        # creates the read-only demo tenant and its accounts

npm run dev:api        # /api functions on 127.0.0.1:3101
npm run dev            # app on http://localhost:8080, proxying /api
```

Two processes: `vite dev` serves the app and knows nothing about `api/`, which
Vercel runs as separate functions. `npm run dev:api` bundles the same TypeScript
sources Vercel deploys and serves them locally, so the API is exercised in
development rather than for the first time in production.

Open <http://localhost:8080/login> and use **Explore the demo** — no password
needed, and no credentials exist in this repository.

## Deployment

Set **`DATABASE_URL`** in the Vercel project's environment variables, pointing at
the Neon **pooler** endpoint (a direct endpoint exhausts connections under
serverless traffic). Until it is set, every API request answers
`503 not_configured` with that instruction — the app will load and sign-in will
fail with a legible message rather than an opaque error.

Then run `npm run db:migrate` and `npm run db:seed` against that database.

Optional environment variables:

| Variable | Effect |
| --- | --- |
| `DEMO_ENABLED=false` | Refuses `/api/auth/demo`, closing the demo on that deployment |

### Real accounts

The seed creates **only** the demo tenant by default. Its accounts carry no
password hash, so they are reachable through the demo gate and nowhere else.

To create a real tenant and its first administrator, re-run the seed with
credentials you choose:

```bash
SEED_ADMIN_EMAIL='you@example.com' \
SEED_ADMIN_PASSWORD='<a password you choose>' \
SEED_TENANT_SLUG='your-agency' \
npm run db:seed
```

No real credential is generated, printed, or stored by this repository; the
password exists only as a scrypt hash once the seed has run.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 8080 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` across `src/` |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run dev:api` | Run the `api/` functions locally on port 3101 |
| `npm run db:migrate` | Apply `db/schema.sql` and `db/constraints.sql` (idempotent) |
| `npm run db:seed` | Seed the demo tenant; optionally a real tenant (see above) |
| `npm run db:extract` | Re-freeze `db/seed-data.json` from `src/lib/mockData.ts` |

## Stack

React 18 · Vite 5 · TypeScript · Tailwind CSS 3 · shadcn/ui (Radix) · React Router 6 ·
TanStack Query · Recharts · Framer Motion · Vitest + jsdom.

Server: Vercel Serverless Functions · Neon Postgres (`@neondatabase/serverless`) ·
scrypt password hashing and SHA-256 session tokens from the Node standard library.

## Structure

```
src/
  pages/       one component per route (Dashboard, ClientsCRM, ReconciliationPage, …)
  components/
    layout/    AppLayout, Sidebar, Topbar
    shared/    cross-page components (AgentAssist, CommunicationTimeline, …)
    ui/        shadcn/ui primitives
  lib/         mock data, role/auth context, data scoping, audit log, domain knowledge
  hooks/       shared React hooks
  test/        Vitest suites
```

## Routing and access

`src/App.tsx` gates the app in three layers:

1. Unauthenticated → `LandingPage` / `LoginPage`.
2. Authenticated but not onboarded → `OnboardingWizard` (sets `onboarding_completed`
   in `localStorage`).
3. Onboarded → `AppLayout` with per-route `RoleGuard` checks.

## Authentication

**The auth layer in `src/lib/roleContext.tsx` is a client-side demo, not a security
boundary.** There is no server-side verification: `authenticate()` compares a SHA-256
digest of the submitted password against a digest compiled into the bundle. Those
digests are unsalted and shipped to the browser, so they are offline-crackable.
Replace `authenticate()` with a real backend call before this handles anything but
mock data.

Five demo accounts exist, one per role — admin, supervisor, agent, retention, and
read-only auditor. Their emails are in `credentialPasswords` in that file; the
passwords are deliberately **not** in the repo, since a password literal in source is
a committed secret regardless of what it guards. To point an account at a password of
your own, replace its digest:

```bash
node -e 'console.log(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' '<password>'
```

Sign-in needs a secure context (HTTPS or `localhost`) because it depends on
`crypto.subtle`.

## Notes

- The landing page hero image is served from an external CDN
  (`vibe.filesafe.space`); it will not render on networks that cannot reach that host.
- `src/tailwind.config.vibe.json` is regenerated by the dev-mode `@leadconnector/vibe-tagger`
  plugin and is gitignored.
