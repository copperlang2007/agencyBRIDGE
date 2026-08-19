/**
 * Role, route and action permission tables.
 *
 * Pure data with no React and no browser API, because both sides need it:
 * the API imports this module to *enforce* access, and the UI imports it to
 * decide what to render. The server copy is the authority — a client that
 * lies about its role changes what it draws, not what it may read or write.
 */

export type RoleId = "admin" | "supervisor" | "agent" | "retention" | "readonly";

export const ROLE_IDS: readonly RoleId[] = ["admin", "supervisor", "agent", "retention", "readonly"] as const;

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === "string" && (ROLE_IDS as readonly string[]).includes(value);
}

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: RoleId;
}

// ── Action-level permissions (beyond route access) ──────────────────
// Each action maps to the roles allowed to perform it.
// This is checked in addition to route-level access.
export const actionPermissions: Record<string, RoleId[]> = {
  // Client actions
  "client:create": ["admin", "supervisor", "agent", "retention"],
  "client:edit": ["admin", "supervisor", "agent"],
  "client:delete": ["admin", "supervisor"],
  "client:export": ["admin", "supervisor", "agent", "retention"],
  "client:mark_dnc": ["admin", "supervisor", "agent", "retention"],
  // Policy actions
  "policy:create": ["admin", "supervisor"],
  "policy:edit": ["admin", "supervisor"],
  "policy:edit_commission": ["admin"],
  "policy:export": ["admin", "supervisor", "agent", "retention"],
  "policy:contact_renewal": ["admin", "supervisor", "agent", "retention"],
  // Agent management actions
  "agent:create": ["admin"],
  "agent:edit": ["admin"],
  "agent:assign_task": ["admin", "supervisor"],
  "agent:manage_compliance": ["admin"],
  "agent:view_payments": ["admin", "supervisor"],
  "agent:request_docs": ["admin", "supervisor"],
  // Reconciliation actions
  "reconciliation:manage": ["admin", "supervisor"],
  "reconciliation:export": ["admin", "supervisor"],
  "reconciliation:upload": ["admin", "supervisor"],
  "reconciliation:dispute": ["admin", "supervisor"],
  // Security actions
  "security:manage": ["admin"],
  "security:view": ["admin", "readonly"],
  // Knowledge base actions
  "kb:manage": ["admin", "supervisor"],
  "kb:edit": ["admin", "supervisor"],
  // Compliance actions
  "compliance:manage": ["admin", "supervisor"],
  // Retention actions
  "retention:manage": ["admin", "supervisor", "retention"],
  "retention:campaign": ["admin", "supervisor", "retention"],
  // Dialer actions
  "dialer:outbound": ["admin", "supervisor", "agent"],
  "dialer:supervise": ["admin", "supervisor"],
  // Calendar actions
  "calendar:create": ["admin", "supervisor", "agent", "retention"],
  "calendar:edit": ["admin", "supervisor", "agent", "retention"],
  // Pipeline actions
  "pipeline:create": ["admin", "supervisor", "agent"],
  "pipeline:move_stage": ["admin", "supervisor", "agent"],
  "pipeline:assign_lead": ["admin", "supervisor"],
  // Quoting actions
  "quoting:compare": ["admin", "supervisor", "agent"],
  "quoting:export": ["admin", "supervisor", "agent"],
  // Document actions
  "document:upload": ["admin", "supervisor", "agent"],
  "document:delete": ["admin", "supervisor"],
  "document:download": ["admin", "supervisor", "agent"],
  // Workflow actions
  "workflow:manage": ["admin", "supervisor"],
  // Compliance center actions
  "compliance:soa_create": ["admin", "supervisor", "agent"],
  "compliance:pewc_capture": ["admin", "supervisor", "agent"],
  "compliance:esign_send": ["admin", "supervisor", "agent"],
  "compliance:recording_access": ["admin", "supervisor", "readonly"],
  // Reporting actions
  "reporting:run": ["admin", "supervisor", "retention"],
  "reporting:export": ["admin", "supervisor", "retention"],
  "reporting:create": ["admin", "supervisor"],
  // Data tools actions
  "data:import": ["admin", "supervisor", "agent", "retention"],
  "data:export": ["admin", "supervisor", "agent", "retention"],
  // Email campaign actions
  "campaign:manage": ["admin", "supervisor", "agent", "retention"],
  "campaign:send": ["admin", "supervisor", "agent"],
  "campaign:delete": ["admin", "supervisor"],
};

// ── Route → allowed roles mapping ──────────────────────────────────
export const routePermissions: Record<string, RoleId[]> = {
  "/": ["admin", "supervisor", "agent", "retention", "readonly"],
  "/clients": ["admin", "supervisor", "agent", "retention"],
  "/pipeline": ["admin", "supervisor", "agent"],
  "/calendar": ["admin", "supervisor", "agent", "retention"],
  "/policies": ["admin", "supervisor", "agent", "retention"],
  "/reconciliation": ["admin", "supervisor"],
  "/dialer": ["admin", "supervisor", "agent"],
  "/supervisor": ["admin", "supervisor"],
  "/quoting": ["admin", "supervisor", "agent"],
  "/documents": ["admin", "supervisor", "agent"],
  "/workflows": ["admin", "supervisor"],
  "/data-tools": ["admin", "supervisor", "agent", "retention"],
  "/email-campaigns": ["admin", "supervisor", "agent", "retention"],
  "/client-portal": ["admin", "supervisor", "agent"],
  "/reporting": ["admin", "supervisor", "retention"],
  "/compliance-center": ["admin", "supervisor", "readonly"],
  "/agents": ["admin", "supervisor"],
  // The detail view is a distinct route, and RoleGuard looks up the exact path.
  // Missing it denied the page to everyone once route lookup began failing
  // closed — the safe direction, but still a page nobody could open.
  "/agents/:agentId": ["admin", "supervisor"],
  "/backoffice": ["admin", "agent", "supervisor"],
  "/admin": ["admin"],
  "/retention": ["admin", "supervisor", "retention"],
  "/compliance": ["admin", "supervisor", "readonly"],
  "/security": ["admin", "readonly"],
  "/knowledge-base": ["admin", "supervisor", "agent", "retention"],
};

export const roleLabels: Record<RoleId, string> = {
  admin: "Administrator",
  supervisor: "Supervisor",
  agent: "Agent",
  retention: "Retention Specialist",
  readonly: "Read-Only / Auditor",
};

// ── Role visibility scoping ───────────────────────────────────────
// Defines which roles a given role can see/switch to in the UI.
// Admin sees everyone. Supervisor sees themselves + their reports (agents).
// Everyone else sees only their own role.
export function getVisibleRoles(currentRole: RoleId): RoleId[] {
  switch (currentRole) {
    case "admin":
      return ["admin", "supervisor", "agent", "retention", "readonly"];
    case "supervisor":
      return ["supervisor", "agent"];
    default:
      return [currentRole];
  }
}

// Roles that a given role is allowed to impersonate (for debugging).
// Admin can impersonate anyone. Supervisor can impersonate agents only.
export function getImpersonatableRoles(currentRole: RoleId): RoleId[] {
  switch (currentRole) {
    case "admin":
      return ["supervisor", "agent", "retention", "readonly"];
    case "supervisor":
      return ["agent"];
    default:
      return [];
  }
}

/** True when `role` may perform `action`. Unknown actions are denied. */
export function roleCan(role: RoleId | null | undefined, action: string): boolean {
  if (!role) return false;
  const allowed = actionPermissions[action];
  return allowed !== undefined && allowed.includes(role);
}

/**
 * True when `role` may load `route`. Unknown routes are denied, so adding a
 * page without adding it to routePermissions fails closed rather than open.
 */
export function roleHasRoute(role: RoleId | null | undefined, route: string): boolean {
  if (!role) return false;
  const allowed = routePermissions[route];
  return allowed !== undefined && allowed.includes(role);
}

