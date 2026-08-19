/**
 * The browser's only door to the server.
 *
 * Every call sends the session cookie and nothing else — no token in
 * localStorage, no role in a header. The cookie is HttpOnly, so this code
 * cannot read it, forge it, or hand it to a script that asks nicely.
 */

import type { RoleId, UserInfo } from "@/lib/permissions";
// Type-only import: the domain vocabulary (statuses, plan types, roles) is
// declared alongside the sample data but belongs to the product, not to the
// mock. Importing it here keeps the API contract and the UI speaking the same
// language — widen `ClientStatus` and this file follows — and erases at build
// time, so nothing in the mock arrays is pulled into the bundle by it. The
// database enforces the same sets with CHECK constraints, so the narrowing is
// backed end to end rather than asserted.
import type {
  AgentRole,
  AppointmentType,
  ClientStatus,
  ComplianceStatus,
  LeadSource,
  PlanType,
  PolicyStatus,
  TaskPriority,
} from "@/lib/mockData";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  /** True when the demo refused a write, which the UI explains rather than treats as a fault. */
  get isDemoReadOnly(): boolean {
    return this.code === "demo_read_only";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    // A network failure is not a 500 and should not read like one.
    throw new ApiError(0, "network_error", "Could not reach the server. Check your connection and try again.");
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text !== "") {
    try {
      payload = JSON.parse(text);
    } catch {
      // An HTML body here almost always means a routing rule swallowed the API
      // path and returned the SPA shell. Say that, rather than surfacing a
      // JSON parse error about "<!doctype".
      throw new ApiError(
        response.status,
        "bad_response",
        "The server returned an unexpected response. The API may not be reachable at this URL.",
      );
    }
  }

  if (!response.ok) {
    const body = (payload ?? {}) as { error?: string; message?: string };
    throw new ApiError(
      response.status,
      body.error ?? "error",
      body.message ?? `Request failed (${response.status}).`,
    );
  }
  return payload as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

// ── Session ────────────────────────────────────────────────────────────────

export interface SessionResponse {
  user: UserInfo | null;
  realUser?: { id: string; name: string; role: RoleId } | null;
  impersonating?: boolean;
  demo: boolean;
  tenant?: string;
}

export const api = {
  session: () => get<SessionResponse>("/api/auth/me"),

  login: (email: string, password: string) =>
    post<{ user: UserInfo; demo: boolean }>("/api/auth/login", { email, password }),

  /** `acknowledged` is required by the server; it is the demo gate, not a formality. */
  enterDemo: (role: RoleId) =>
    post<{ user: UserInfo; demo: boolean }>("/api/auth/demo", { role, acknowledged: true }),

  logout: () => post<{ ok: true }>("/api/auth/logout"),

  switchRole: (role: RoleId | null) =>
    post<{ ok: true; impersonating: boolean }>("/api/auth/switch-role", { role }),

  // ── Book of business ─────────────────────────────────────────────────────

  clients: () => get<{ clients: ClientRecord[] }>("/api/book/clients").then((r) => r.clients),
  policies: () => get<{ policies: PolicyRecord[] }>("/api/book/policies").then((r) => r.policies),
  appointments: () =>
    get<{ appointments: AppointmentRecord[] }>("/api/book/appointments").then((r) => r.appointments),
  agents: () => get<{ agents: AgentRecord[] }>("/api/book/agents").then((r) => r.agents),

  updateClient: (input: { id: string; status?: ClientStatus; notes?: string | null }) =>
    post<{ client: { id: string; name: string; status: string; notes?: string } }>(
      "/api/book/client-update",
      input,
    ),

  // ── Audit ────────────────────────────────────────────────────────────────

  auditEntries: (limit = 200) =>
    get<{ entries: AuditRecord[] }>(`/api/audit?limit=${encodeURIComponent(String(limit))}`).then(
      (r) => r.entries,
    ),

  auditVerify: () =>
    get<{ valid: boolean; brokenAt: number | null; truncated: boolean; reason?: string; count: number }>(
      "/api/audit/verify",
    ),

  appendAudit: (entries: AuditAppend[]) => post<{ written: number }>("/api/audit", { entries }),
};

// ── Record shapes, matching what the API returns ───────────────────────────

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  planType: PlanType;
  carrier: string;
  enrollmentDate: string;
  renewalDate: string;
  premium: number;
  commission: number;
  agent: string;
  age: number;
  zip: string;
  leadSource: LeadSource;
  notes?: string;
}

export interface PolicyRecord {
  id: string;
  client: string;
  carrier: string;
  planType: PlanType;
  status: PolicyStatus;
  premium: number;
  commission: number;
  effectiveDate: string;
  renewalDate: string;
  agent: string;
}

export interface AppointmentRecord {
  id: string;
  client: string;
  agent: string;
  type: AppointmentType;
  date: string;
  time: string;
  duration: number;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  location: string;
  notes?: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  role: AgentRole;
  email: string;
  phone: string;
  status: "Active" | "On Leave" | "Terminated";
  contracted: boolean;
  hireDate: string;
  bookSize: number;
  ytdCommissions: number;
  complianceScore: number;
  ahip: ComplianceStatus;
  ahipExpiry: string;
  carrierAppointments: { carrier: string; status: ComplianceStatus; expiry: string }[];
  certifications: { name: string; status: ComplianceStatus; expiry: string }[];
  w9OnFile: boolean;
  taxInfoComplete: boolean;
  tasks: { id: string; title: string; priority: TaskPriority; due: string; done: boolean }[];
  payments: { id: string; date: string; amount: number; type: "Commission" | "Bonus"; status: "Paid" | "Pending" }[];
}

export interface AuditRecord {
  seq: string;
  id: string;
  timestamp: string;
  actor: string;
  actorId: string;
  action: string;
  category: string;
  entity: string;
  entityId: string;
  severity: string;
  details: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  prevHash: string;
  hash: string;
}

export interface AuditAppend {
  action: string;
  category: string;
  entity: string;
  entityId?: string;
  severity?: string;
  details?: string;
}
