import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { logAudit } from "@/lib/auditLog";

export type RoleId = "admin" | "supervisor" | "agent" | "retention" | "readonly";

export interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: RoleId;
}

interface AuthResult {
  success: boolean;
  user?: UserInfo;
  error?: string;
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

interface RoleContextValue {
  user: UserInfo | null;
  isAuthenticated: boolean;
  role: RoleId | null;
  setRole: (role: RoleId) => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
  hasAccess: (route: string) => boolean;
  can: (action: string) => boolean;
  roleLabel: string;
  originalUser: UserInfo | null;
  impersonatedRole: RoleId | null;
  isImpersonating: boolean;
  impersonate: (role: RoleId) => void;
  endImpersonation: () => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

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

export const roleUsers: Record<RoleId, UserInfo> = {
  admin: {
    id: "u1",
    name: "Lang Bridge",
    email: "lang@theartificialbridge.com",
    role: "admin",
  },
  supervisor: {
    id: "u3",
    name: "Ryan Mitchell",
    email: "ryan@agencybridge.com",
    role: "supervisor",
  },
  agent: {
    id: "u5",
    name: "Sarah Chen",
    email: "sarah@agencybridge.com",
    role: "agent",
  },
  retention: {
    id: "u7",
    name: "Diane Foster",
    email: "diane@agencybridge.com",
    role: "retention",
  },
  readonly: {
    id: "u8",
    name: "External Auditor",
    email: "auditor@firm.com",
    role: "readonly",
  },
};

// ── Credential store (simulates backend auth) ──────────────────────
// In production this would be a POST to /api/auth/login returning a JWT.
// Returns null when the Web Crypto API is unavailable (non-secure context), so
// authenticate() can report that plainly instead of failing every comparison.
async function sha256(text: string): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Demo accounts, stored as SHA-256 digests. A password literal in source is a
// committed secret even when the account only guards mock data, so the plaintext
// lives outside the repo. To point an account at a new password, print its digest:
//
//   node -e 'console.log(require("crypto").createHash("sha256").update(process.argv[1]).digest("hex"))' '<password>'
//
// This is a demo auth layer, not a security boundary: the digests ship in the
// client bundle, are unsalted, and are therefore offline-crackable. Replace
// authenticate() with a real backend call before this guards anything real.
const credentialPasswords: Record<string, { hash: string; role: RoleId }> = {
  "lang@theartificialbridge.com": { hash: "3deef9febca75099c299f30cde5ec7a953c471a71fc189af9a20947619c7bd72", role: "admin" },
  "ryan@agencybridge.com": { hash: "04b4b063c2038952abec8e274f99a6b9a964642d3cf5e98707aae82148f29f05", role: "supervisor" },
  "sarah@agencybridge.com": { hash: "5f2454135728535b83e52ac676b0e3902103e027cac47153fe809b677afd5763", role: "agent" },
  "diane@agencybridge.com": { hash: "3f3fc01af4fd267891372a7877ac7892a26769b7f2aee13e5a19dfd9ccbde79a", role: "retention" },
  "auditor@firm.com": { hash: "0e4dc10f409646010c72567cd55f4ca9afcf05fc20b6192023759f77564b825d", role: "readonly" },
};

const SESSION_KEY = "agencybridge_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

interface StoredSession {
  user: UserInfo;
  token: string;
  issuedAt: number;
  expiresAt: number;
}

function generateToken(): string {
  // Cryptographically random session token
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/** Simulated backend auth call — replace with real fetch in production. */
async function authenticate(email: string, password: string): Promise<AuthResult> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 700));

  const normalized = email.trim().toLowerCase();
  const record = credentialPasswords[normalized];

  if (!record) {
    return { success: false, error: "No account found with that email address." };
  }
  const inputHash = await sha256(password);
  if (inputHash === null) {
    return { success: false, error: "Sign-in requires a secure connection (HTTPS or localhost)." };
  }
  if (inputHash !== record.hash) {
    return { success: false, error: "Incorrect password. Please try again." };
  }

  const user = roleUsers[record.role];
  return { success: true, user };
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRoleState] = useState<RoleId | null>(null);
  const [originalUser, setOriginalUser] = useState<UserInfo | null>(null);

  // Restore session from localStorage (with token validation + expiry)
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredSession;
        // Validate token exists and session hasn't expired
        if (parsed && parsed.token && parsed.user && parsed.expiresAt) {
          if (Date.now() < parsed.expiresAt) {
            setUser(parsed.user);
            setRoleState(parsed.user.role);
          } else {
            // Session expired — clear it
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await authenticate(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      setRoleState(result.user.role);
      const now = Date.now();
      const session: StoredSession = {
        user: result.user,
        token: generateToken(),
        issuedAt: now,
        expiresAt: now + SESSION_TTL_MS,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      logAudit({
        actor: result.user.name,
        actorId: result.user.id,
        action: "LOGIN_SUCCESS",
        category: "auth",
        entity: "session",
        entityId: result.user.id,
        severity: "success",
        details: `${result.user.name} (${result.user.role}) logged in`,
      });
    } else {
      logAudit({
        actor: email,
        actorId: "unknown",
        action: "LOGIN_FAILED",
        category: "auth",
        entity: "session",
        severity: "warning",
        details: `Failed login attempt for ${email}`,
      });
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    if (user) {
      logAudit({
        actor: user.name,
        actorId: user.id,
        action: "LOGOUT",
        category: "auth",
        entity: "session",
        entityId: user.id,
        severity: "info",
        details: `${user.name} (${user.role}) logged out`,
      });
    }
    setUser(null);
    setRoleState(null);
    setOriginalUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, [user]);

  const setRole = useCallback((newRole: RoleId) => {
    const previousRole = role;
    setRoleState(newRole);
    const newUser = roleUsers[newRole];
    setUser(newUser);
    // Persist session with new user but preserve token/expiry
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as StoredSession;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, user: newUser }));
      } catch { /* ignore */ }
    }
    if (previousRole && previousRole !== newRole) {
      logAudit({
        actor: user?.name ?? "unknown",
        actorId: user?.id ?? "unknown",
        action: "ROLE_SWITCHED",
        category: "security",
        entity: "role",
        entityId: newRole,
        severity: "warning",
        details: `${user?.name} switched role from ${roleLabels[previousRole]} to ${roleLabels[newRole]}`,
      });
    }
  }, [role, user]);

  // Impersonation: admin/supervisor switches to a lower-privilege role for debugging.
  // The original user is preserved so they can return to their real identity.
  const impersonate = useCallback((newRole: RoleId) => {
    setOriginalUser((prev) => prev ?? user ?? null);
    setRoleState(newRole);
    const newUser = roleUsers[newRole];
    setUser(newUser);
    logAudit({
      actor: user?.name ?? "unknown",
      actorId: user?.id ?? "unknown",
      action: "IMPERSONATE_ROLE",
      category: "security",
      entity: "role",
      entityId: newRole,
      severity: "warning",
      details: `${user?.name} (${user?.role}) impersonated ${newUser.name} (${newRole}) for debugging`,
    });
  }, [user]);

  const endImpersonation = useCallback(() => {
    if (originalUser) {
      logAudit({
        actor: originalUser.name,
        actorId: originalUser.id,
        action: "END_IMPERSONATION",
        category: "security",
        entity: "role",
        entityId: originalUser.role,
        severity: "info",
        details: `${originalUser.name} ended impersonation and returned to ${roleLabels[originalUser.role]}`,
      });
      setUser(originalUser);
      setRoleState(originalUser.role);
      setOriginalUser(null);
    }
  }, [originalUser]);

  const hasAccess = useCallback(
    (route: string): boolean => {
      if (!role) return false;
      const allowed = routePermissions[route];
      if (!allowed) return true;
      return allowed.includes(role);
    },
    [role]
  );

  const can = useCallback(
    (action: string): boolean => {
      if (!role) return false;
      const allowed = actionPermissions[action];
      if (!allowed) return false; // unknown action = deny by default
      return allowed.includes(role);
    },
    [role]
  );

  return (
    <RoleContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role,
        setRole,
        login,
        logout,
        hasAccess,
        can,
        roleLabel: role ? roleLabels[role] : "",
        originalUser,
        impersonatedRole: originalUser ? role : null,
        isImpersonating: !!originalUser,
        impersonate,
        endImpersonation,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

const nullUser: UserInfo = { id: "", name: "", email: "", role: "readonly" };
const nullContextValue: RoleContextValue = {
  user: null,
  isAuthenticated: false,
  role: null,
  setRole: () => {},
  login: async () => ({ success: false, error: "Not initialized" }),
  logout: () => {},
  hasAccess: () => false,
  can: () => false,
  roleLabel: "",
  originalUser: null,
  impersonatedRole: null,
  isImpersonating: false,
  impersonate: () => {},
  endImpersonation: () => {},
};

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  // Return a safe default instead of throwing — prevents white-screen crashes
  // during HMR or if the provider is not yet mounted.
  return ctx ?? nullContextValue;
}
