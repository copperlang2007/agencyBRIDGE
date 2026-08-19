import { query } from "./db.js";
import { agentScope, bookScope } from "./scope.js";
import type { SessionUser } from "./session.js";
import { roleCan } from "../../src/lib/permissions.js";

/**
 * Book-of-business reads.
 *
 * Every query is a fixed string with bound parameters — no fragment is
 * assembled from a caller-supplied value. Scoping rides on two bound params:
 *
 *   where tenant_id = $1 and ($2::boolean or agent_id = $3)
 *
 * With `all = true` the second disjunct is never evaluated. With `all = false`
 * and a null agent id, `agent_id = NULL` is NULL, so the row is dropped. There
 * is no parameter combination that widens the scope by accident.
 */

export interface ClientDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  planType: string;
  carrier: string;
  enrollmentDate: string;
  renewalDate: string;
  premium: number;
  commission: number;
  agent: string;
  age: number;
  zip: string;
  leadSource: string;
  notes?: string;
}

export interface PolicyDTO {
  id: string;
  client: string;
  carrier: string;
  planType: string;
  status: string;
  premium: number;
  commission: number;
  effectiveDate: string;
  renewalDate: string;
  agent: string;
}

export interface AppointmentDTO {
  id: string;
  client: string;
  agent: string;
  type: string;
  date: string;
  time: string;
  duration: number;
  status: string;
  location: string;
  notes?: string;
}

export interface AgentDTO {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: string;
  contracted: boolean;
  hireDate: string;
  bookSize: number;
  ytdCommissions: number;
  complianceScore: number;
  ahip: string;
  ahipExpiry: string;
  carrierAppointments: unknown[];
  certifications: unknown[];
  w9OnFile: boolean;
  taxInfoComplete: boolean;
  tasks: unknown[];
  payments: unknown[];
}

/** Postgres returns `numeric` as a string to avoid precision loss in JS. */
function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** `date` columns come back as ISO timestamps; the UI contract is `YYYY-MM-DD`. */
function day(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

export async function listClients(session: SessionUser): Promise<ClientDTO[]> {
  const scope = bookScope(session);
  const rows = await query<Record<string, unknown>>(
    `select c.id, c.name, c.email, c.phone, c.status, c.plan_type, c.carrier,
            c.enrollment_date, c.renewal_date, c.premium, c.commission,
            a.name as agent_name, c.age, c.zip, c.lead_source, c.notes
       from clients c
       join agents  a on a.tenant_id = c.tenant_id and a.id = c.agent_id
      where c.tenant_id = $1 and ($2::boolean or c.agent_id = $3)
      order by c.id`,
    [session.tenantId, scope.all, scope.agentId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    phone: String(r.phone),
    status: String(r.status),
    planType: String(r.plan_type),
    carrier: String(r.carrier),
    enrollmentDate: day(r.enrollment_date),
    renewalDate: day(r.renewal_date),
    premium: num(r.premium),
    commission: num(r.commission),
    agent: String(r.agent_name),
    age: num(r.age),
    zip: String(r.zip),
    leadSource: String(r.lead_source),
    ...(r.notes == null ? {} : { notes: String(r.notes) }),
  }));
}

export async function listPolicies(session: SessionUser): Promise<PolicyDTO[]> {
  const scope = bookScope(session);
  const rows = await query<Record<string, unknown>>(
    `select p.id, cl.name as client_name, p.carrier, p.plan_type, p.status,
            p.premium, p.commission, p.effective_date, p.renewal_date,
            a.name as agent_name
       from policies p
       join clients cl on cl.tenant_id = p.tenant_id and cl.id = p.client_id
       join agents  a  on a.tenant_id  = p.tenant_id and a.id  = p.agent_id
      where p.tenant_id = $1 and ($2::boolean or p.agent_id = $3)
      order by p.id`,
    [session.tenantId, scope.all, scope.agentId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    client: String(r.client_name),
    carrier: String(r.carrier),
    planType: String(r.plan_type),
    status: String(r.status),
    premium: num(r.premium),
    commission: num(r.commission),
    effectiveDate: day(r.effective_date),
    renewalDate: day(r.renewal_date),
    agent: String(r.agent_name),
  }));
}

export async function listAppointments(session: SessionUser): Promise<AppointmentDTO[]> {
  const scope = bookScope(session);
  const rows = await query<Record<string, unknown>>(
    `select ap.id, ap.client_name, a.name as agent_name, ap.type,
            ap.date, ap.time, ap.duration, ap.status, ap.location, ap.notes
       from appointments ap
       join agents a on a.tenant_id = ap.tenant_id and a.id = ap.agent_id
      where ap.tenant_id = $1 and ($2::boolean or ap.agent_id = $3)
      order by ap.date, ap.time, ap.id`,
    [session.tenantId, scope.all, scope.agentId],
  );
  return rows.map((r) => ({
    id: String(r.id),
    client: String(r.client_name),
    agent: String(r.agent_name),
    type: String(r.type),
    date: day(r.date),
    time: String(r.time),
    duration: num(r.duration),
    status: String(r.status),
    location: String(r.location),
    ...(r.notes == null ? {} : { notes: String(r.notes) }),
  }));
}

export async function listAgents(session: SessionUser): Promise<AgentDTO[]> {
  const scope = agentScope(session);
  // A retention specialist may read the producer roster but not what producers
  // are paid — `agent:view_payments` is admin and supervisor only. Scoping
  // decides which *rows* are visible; it says nothing about which columns, so
  // without this the endpoint hands every producer's payment history to a role
  // the permission table denies it to.
  const maySeePayments = roleCan(session.role, "agent:view_payments");
  const rows = await query<Record<string, unknown>>(
    `select id, name, role, email, phone, status, contracted, hire_date,
            book_size, ytd_commissions, compliance_score, ahip, ahip_expiry,
            carrier_appointments, certifications, w9_on_file, tax_info_complete,
            tasks, payments
       from agents
      where tenant_id = $1
        and ($2::boolean
             or ($3::boolean and role = 'Agent')
             or id = $4)
      order by id`,
    [
      session.tenantId,
      scope.kind === "all",
      scope.kind === "producers",
      scope.kind === "self" ? scope.agentId : null,
    ],
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    role: String(r.role),
    email: String(r.email),
    phone: String(r.phone),
    status: String(r.status),
    contracted: Boolean(r.contracted),
    hireDate: day(r.hire_date),
    bookSize: num(r.book_size),
    ytdCommissions: num(r.ytd_commissions),
    complianceScore: num(r.compliance_score),
    ahip: String(r.ahip),
    ahipExpiry: day(r.ahip_expiry),
    carrierAppointments: Array.isArray(r.carrier_appointments) ? r.carrier_appointments : [],
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    w9OnFile: Boolean(r.w9_on_file),
    taxInfoComplete: Boolean(r.tax_info_complete),
    tasks: Array.isArray(r.tasks) ? r.tasks : [],
    payments: maySeePayments && Array.isArray(r.payments) ? r.payments : [],
  }));
}
