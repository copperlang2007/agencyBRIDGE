-- agencyBRIDGE — server-side schema.
--
-- Every row is tenant-scoped. Authorization is enforced in SQL (see the
-- scoping predicates in api/_lib/scope.ts), not in the browser, so a client
-- that lies about its role gets no extra rows.
--
-- Idempotent: safe to re-run against an existing database.

create extension if not exists pgcrypto;

-- ── Tenancy ────────────────────────────────────────────────────────────────

create table if not exists tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  -- A demo tenant holds synthetic data only and is refused every write.
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Staff records (the product's "Agent" entity) ───────────────────────────

create table if not exists agents (
  id                    text not null,
  tenant_id             uuid not null references tenants(id) on delete cascade,
  name                  text not null,
  role                  text not null,
  email                 text not null,
  phone                 text not null,
  status                text not null,
  contracted            boolean not null,
  hire_date             date not null,
  book_size             integer not null,
  ytd_commissions       numeric(12,2) not null,
  compliance_score      integer not null,
  ahip                  text not null,
  ahip_expiry           date not null,
  carrier_appointments  jsonb not null default '[]'::jsonb,
  certifications        jsonb not null default '[]'::jsonb,
  w9_on_file            boolean not null,
  tax_info_complete     boolean not null,
  tasks                 jsonb not null default '[]'::jsonb,
  payments              jsonb not null default '[]'::jsonb,
  primary key (tenant_id, id)
);

-- ── Login accounts ─────────────────────────────────────────────────────────

create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  email          text not null,
  name           text not null,
  role           text not null check (role in ('admin','supervisor','agent','retention','readonly')),
  -- null for demo accounts: they are reachable only through the demo gate,
  -- never through the password path.
  password_hash  text,
  -- Links a login to its staff record so agent scoping can key on an id
  -- rather than on a display name.
  agent_id       text,
  status         text not null default 'active' check (status in ('active','disabled')),
  created_at     timestamptz not null default now(),
  foreign key (tenant_id, agent_id) references agents(tenant_id, id) on delete set null
);

-- Login is by email alone, so the address must be unique across tenants.
create unique index if not exists users_email_unique on users (lower(email));
create index if not exists users_tenant_idx on users (tenant_id);

-- ── Sessions ───────────────────────────────────────────────────────────────
-- The cookie carries a random token; only its SHA-256 digest is stored, so a
-- dump of this table does not hand over live sessions.

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  -- Set while the session's owner is viewing the product as somebody else.
  -- Impersonation lives here, on the server, because a role the browser could
  -- change for itself is not a permission — the old client-side role switcher
  -- changed what was drawn while the data stayed the admin's.
  impersonated_user_id uuid references users(id) on delete set null,
  token_hash  text not null unique,
  issued_at   timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  ip          text,
  user_agent  text
);

create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expiry_idx on sessions (expires_at);

-- ── Login throttling ───────────────────────────────────────────────────────

create table if not exists login_attempts (
  id           bigserial primary key,
  email_lower  text not null,
  ip           text,
  succeeded    boolean not null,
  at           timestamptz not null default now()
);

create index if not exists login_attempts_email_idx on login_attempts (email_lower, at desc);
create index if not exists login_attempts_ip_idx on login_attempts (ip, at desc);

-- ── Book of business ───────────────────────────────────────────────────────

create table if not exists clients (
  id               text not null,
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name             text not null,
  email            text not null,
  phone            text not null,
  status           text not null,
  plan_type        text not null,
  carrier          text not null,
  enrollment_date  date not null,
  renewal_date     date not null,
  premium          numeric(10,2) not null,
  commission       numeric(10,2) not null,
  agent_id         text not null,
  age              integer not null,
  zip              text not null,
  lead_source      text not null,
  notes            text,
  primary key (tenant_id, id),
  foreign key (tenant_id, agent_id) references agents(tenant_id, id) on delete restrict
);

create index if not exists clients_agent_idx on clients (tenant_id, agent_id);

create table if not exists policies (
  id              text not null,
  tenant_id       uuid not null references tenants(id) on delete cascade,
  client_id       text not null,
  carrier         text not null,
  plan_type       text not null,
  status          text not null,
  premium         numeric(10,2) not null,
  commission      numeric(10,2) not null,
  effective_date  date not null,
  renewal_date    date not null,
  agent_id        text not null,
  primary key (tenant_id, id),
  foreign key (tenant_id, client_id) references clients(tenant_id, id) on delete cascade,
  foreign key (tenant_id, agent_id) references agents(tenant_id, id) on delete restrict
);

create index if not exists policies_agent_idx on policies (tenant_id, agent_id);

-- `client_id` is nullable and `client_name` always present: an appointment can
-- exist for a prospect who is not in the book yet, which is the ordinary case
-- for an enrollment consultation. A hard FK here would force inventing a client
-- record for every first meeting.
create table if not exists appointments (
  id           text not null,
  tenant_id    uuid not null references tenants(id) on delete cascade,
  client_id    text,
  client_name  text not null,
  agent_id     text not null,
  type         text not null,
  date         date not null,
  time         text not null,
  duration     integer not null,
  status       text not null,
  location     text not null,
  notes        text,
  primary key (tenant_id, id),
  foreign key (tenant_id, client_id) references clients(tenant_id, id) on delete set null,
  foreign key (tenant_id, agent_id) references agents(tenant_id, id) on delete restrict
);

create index if not exists appointments_agent_idx on appointments (tenant_id, agent_id);

-- ── Audit trail ────────────────────────────────────────────────────────────
-- One hash chain per tenant. `seq` is dense and unique per tenant, so a
-- deleted row leaves a gap that verification reports — a chain stored in a
-- table the writer cannot rewrite is the point of moving this off the client.

-- `on delete restrict`, unlike every other table here: deleting a tenant must
-- not be a way to erase its audit history. A tenant carrying audit records
-- cannot be dropped until somebody deals with the trail deliberately.
create table if not exists audit_events (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete restrict,
  seq         bigint not null,
  ts          timestamptz not null default now(),
  actor       text not null,
  actor_id    text not null,
  action      text not null,
  category    text not null,
  entity      text not null,
  entity_id   text not null,
  severity    text not null,
  details     text not null,
  session_id  text not null,
  ip_address  text not null,
  user_agent  text not null,
  prev_hash   char(64) not null,
  hash        char(64) not null,
  unique (tenant_id, seq)
);

create index if not exists audit_tenant_seq_idx on audit_events (tenant_id, seq desc);

-- The head each tenant's chain is known to have reached.
--
-- Verification walks the stored rows, so on its own it can only prove that what
-- remains is internally consistent: delete the newest entries and the surviving
-- prefix still verifies, and delete every row and there is nothing left to
-- disagree with. This records, outside that walk, where the chain got to. It is
-- written after a successful append and only ever moves forward.
create table if not exists audit_heads (
  tenant_id   uuid primary key references tenants(id) on delete cascade,
  seq         bigint not null,
  hash        char(64) not null,
  updated_at  timestamptz not null default now()
);
