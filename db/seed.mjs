/**
 * Seeds the database.
 *
 * Idempotent — every insert upserts, so re-running realigns rows without
 * duplicating them. Run after applying db/schema.sql:
 *
 *   DATABASE_URL=... node db/seed.mjs
 *
 * The demo tenant is seeded unconditionally: it holds synthetic data only, is
 * flagged `is_demo`, and its accounts carry no password, so they are reachable
 * through the demo gate and nowhere else.
 *
 * A real tenant and its first administrator are created ONLY when both
 * SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are supplied. No real credential is
 * generated here, printed here, or stored in this repository — the operator
 * chooses the password and it exists only as a scrypt hash after this runs.
 */
import { neon } from "@neondatabase/serverless";
import { build } from "esbuild";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

// Load the real password module rather than reimplementing scrypt here, so the
// seed can never drift from what the login endpoint verifies against.
const dir = await mkdtemp(join(tmpdir(), "seed-pw-"));
const outfile = join(dir, "password.mjs");
await build({
  entryPoints: ["api/_lib/password.ts"],
  outfile,
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["node:*"],
  logLevel: "error",
});
const { hashPassword } = await import(`file://${outfile}`);
await rm(dir, { recursive: true, force: true });

const data = JSON.parse(await readFile("db/seed-data.json", "utf8"));

/** Inserts many rows in one statement; Neon's HTTP driver is one round trip per call. */
async function insertMany(table, columns, rows, conflictTarget, updateColumns) {
  if (rows.length === 0) return 0;
  const params = [];
  const tuples = rows.map((row) => {
    const placeholders = columns.map((col) => {
      params.push(row[col]);
      return `$${params.length}`;
    });
    return `(${placeholders.join(",")})`;
  });
  const update = updateColumns.map((c) => `"${c}" = excluded."${c}"`).join(", ");
  const text =
    `insert into ${table} (${columns.map((c) => `"${c}"`).join(",")}) values ${tuples.join(",")} ` +
    `on conflict ${conflictTarget} do update set ${update}`;
  await sql(text, params);
  return rows.length;
}

const DEMO_SLUG = "demo";

/**
 * Creates or updates a tenant, never changing what kind of tenant it is.
 *
 * `is_demo` is deliberately absent from the update clause. Flipping it would
 * silently rewire the product's two strongest guarantees at once: a demo turned
 * real loses the read-only gate while still holding invented clients, and a real
 * tenant turned demo has every write refused. Neither is something a re-run of
 * a seed script should be able to do.
 */
async function upsertTenant(slug, name, isDemo) {
  const rows = await sql(
    `insert into tenants (slug, name, is_demo) values ($1,$2,$3)
     on conflict (slug) do update set name = excluded.name
     returning id, is_demo`,
    [slug, name, isDemo],
  );
  const row = rows[0];
  if (row.is_demo !== isDemo) {
    throw new Error(
      `Tenant "${slug}" already exists as ${row.is_demo ? "a demo" : "a real"} tenant; ` +
        `refusing to reuse it as ${isDemo ? "a demo" : "a real"} tenant.`,
    );
  }
  return row.id;
}

async function seedBook(tenantId) {
  await insertMany(
    "agents",
    ["tenant_id", "id", "name", "role", "email", "phone", "status", "contracted", "hire_date",
     "book_size", "ytd_commissions", "compliance_score", "ahip", "ahip_expiry",
     "carrier_appointments", "certifications", "w9_on_file", "tax_info_complete", "tasks", "payments"],
    data.agents.map((a) => ({
      tenant_id: tenantId, id: a.id, name: a.name, role: a.role, email: a.email, phone: a.phone,
      status: a.status, contracted: a.contracted, hire_date: a.hireDate, book_size: a.bookSize,
      ytd_commissions: a.ytdCommissions, compliance_score: a.complianceScore, ahip: a.ahip,
      ahip_expiry: a.ahipExpiry, carrier_appointments: JSON.stringify(a.carrierAppointments ?? []),
      certifications: JSON.stringify(a.certifications ?? []), w9_on_file: a.w9OnFile,
      tax_info_complete: a.taxInfoComplete, tasks: JSON.stringify(a.tasks ?? []),
      payments: JSON.stringify(a.payments ?? []),
    })),
    "(tenant_id, id)",
    ["name", "role", "email", "phone", "status", "contracted", "hire_date", "book_size",
     "ytd_commissions", "compliance_score", "ahip", "ahip_expiry", "carrier_appointments",
     "certifications", "w9_on_file", "tax_info_complete", "tasks", "payments"],
  );

  await insertMany(
    "clients",
    ["tenant_id", "id", "name", "email", "phone", "status", "plan_type", "carrier",
     "enrollment_date", "renewal_date", "premium", "commission", "agent_id", "age", "zip",
     "lead_source", "notes"],
    data.clients.map((c) => ({
      tenant_id: tenantId, id: c.id, name: c.name, email: c.email, phone: c.phone,
      status: c.status, plan_type: c.planType, carrier: c.carrier,
      enrollment_date: c.enrollmentDate, renewal_date: c.renewalDate, premium: c.premium,
      commission: c.commission, agent_id: c.agentId, age: c.age, zip: c.zip,
      lead_source: c.leadSource, notes: c.notes ?? null,
    })),
    "(tenant_id, id)",
    ["name", "email", "phone", "status", "plan_type", "carrier", "enrollment_date",
     "renewal_date", "premium", "commission", "agent_id", "age", "zip", "lead_source", "notes"],
  );

  await insertMany(
    "policies",
    ["tenant_id", "id", "client_id", "carrier", "plan_type", "status", "premium", "commission",
     "effective_date", "renewal_date", "agent_id"],
    data.policies.map((p) => ({
      tenant_id: tenantId, id: p.id, client_id: p.clientId, carrier: p.carrier,
      plan_type: p.planType, status: p.status, premium: p.premium, commission: p.commission,
      effective_date: p.effectiveDate, renewal_date: p.renewalDate, agent_id: p.agentId,
    })),
    "(tenant_id, id)",
    ["client_id", "carrier", "plan_type", "status", "premium", "commission", "effective_date",
     "renewal_date", "agent_id"],
  );

  await insertMany(
    "appointments",
    ["tenant_id", "id", "client_id", "client_name", "agent_id", "type", "date", "time",
     "duration", "status", "location", "notes"],
    data.appointments.map((a) => ({
      tenant_id: tenantId, id: a.id, client_id: a.clientId, client_name: a.clientName,
      agent_id: a.agentId, type: a.type, date: a.date, time: a.time, duration: a.duration,
      status: a.status, location: a.location, notes: a.notes,
    })),
    "(tenant_id, id)",
    ["client_id", "client_name", "agent_id", "type", "date", "time", "duration", "status",
     "location", "notes"],
  );
}

/**
 * Creates or updates an account within one tenant.
 *
 * Two things this deliberately will not do:
 *
 *  - move an existing account to another tenant. Email is unique across the
 *    whole table, so an unqualified upsert would hand somebody else's account —
 *    with its password intact — to whichever tenant seeded that address last.
 *  - leave a password on a demo account. Demo accounts are reachable only
 *    through the demo gate, and that is only true while they have no password
 *    to verify. A `coalesce` that preserved an existing hash would quietly make
 *    them reachable from /api/auth/login instead.
 */
async function upsertUser({ tenantId, email, name, role, agentId, passwordHash, isDemo }) {
  const normalized = email.trim().toLowerCase();

  const existing = await sql(`select id, tenant_id from users where lower(email) = $1`, [normalized]);
  if (existing.length > 0 && existing[0].tenant_id !== tenantId) {
    throw new Error(
      `The address ${normalized} already belongs to another tenant. ` +
        `Refusing to move an existing account between tenants.`,
    );
  }

  await sql(
    `insert into users (tenant_id, email, name, role, agent_id, password_hash)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (lower(email)) do update
       set name      = excluded.name,
           role      = excluded.role,
           agent_id  = excluded.agent_id,
           -- A demo account is set to null outright; a real one keeps its
           -- password when the seed is re-run without one.
           password_hash = case when $7::boolean then null
                                else coalesce(excluded.password_hash, users.password_hash) end
           -- `status` is deliberately absent: a new row defaults to active, and
           -- an existing one keeps whatever it has. Re-running the seed must not
           -- silently reinstate an account somebody disabled.
     where users.tenant_id = excluded.tenant_id`,
    [tenantId, normalized, name, role, agentId, passwordHash, isDemo === true],
  );
}

// ── Demo tenant ────────────────────────────────────────────────────────────

const demoId = await upsertTenant(DEMO_SLUG, "agencyBRIDGE Demo Agency", true);
await seedBook(demoId);

// Addresses use the RFC 2606 reserved `.invalid` TLD: unmistakably synthetic,
// and incapable of colliding with a real account or receiving mail.
const demoUsers = [
  { email: "admin@demo.invalid",       name: "Patricia Chen",    role: "admin",      agentId: "ADM-001" },
  { email: "supervisor@demo.invalid",  name: "Ryan Mitchell",    role: "supervisor", agentId: null },
  // AG-001 is the only producer carrying clients, policies and appointments;
  // pointing the demo agent at anyone else shows an empty calendar.
  { email: "agent@demo.invalid",       name: "Daniel Reyes",     role: "agent",      agentId: "AG-001" },
  { email: "retention@demo.invalid",   name: "Kevin O'Brien",    role: "retention",  agentId: "RET-001" },
  { email: "auditor@demo.invalid",     name: "External Auditor", role: "readonly",   agentId: null },
];
for (const u of demoUsers) {
  await upsertUser({ ...u, tenantId: demoId, passwordHash: null, isDemo: true });
}

console.log(`demo tenant ${demoId}`);
console.log(
  `  ${data.agents.length} agents, ${data.clients.length} clients, ` +
    `${data.policies.length} policies, ${data.appointments.length} appointments, ` +
    `${demoUsers.length} passwordless demo accounts`,
);

// ── Real tenant (only on request) ──────────────────────────────────────────

const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (adminEmail && adminPassword) {
  if (adminPassword.length < 12) {
    console.error("SEED_ADMIN_PASSWORD must be at least 12 characters");
    process.exit(1);
  }
  const slug = (process.env.SEED_TENANT_SLUG || "agencybridge").trim();
  if (slug === "") {
    console.error("SEED_TENANT_SLUG is empty; choose a slug or leave it unset.");
    process.exit(1);
  }
  if (slug === DEMO_SLUG) {
    console.error(`"${DEMO_SLUG}" is reserved for the read-only demo tenant; choose another SEED_TENANT_SLUG.`);
    process.exit(1);
  }
  const tenantName = process.env.SEED_TENANT_NAME || "agencyBRIDGE";
  const tenantId = await upsertTenant(slug, tenantName, false);
  await upsertUser({
    tenantId,
    email: adminEmail,
    name: process.env.SEED_ADMIN_NAME || "Administrator",
    role: "admin",
    agentId: null,
    passwordHash: await hashPassword(adminPassword),
    isDemo: false,
  });
  console.log(`real tenant ${slug} (${tenantId}) with administrator ${adminEmail}`);
} else {
  console.log("no real tenant seeded (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create one)");
}
