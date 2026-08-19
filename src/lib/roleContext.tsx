import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import { logAudit } from "@/lib/auditLog";
import {
  actionPermissions,
  getImpersonatableRoles,
  getVisibleRoles,
  roleCan,
  roleHasRoute,
  roleLabels,
  routePermissions,
  type RoleId,
  type UserInfo,
} from "@/lib/permissions";

/**
 * Identity, as reported by the server.
 *
 * This module used to *be* the authentication system: it held a table of
 * SHA-256 password digests, compared them in the browser, and wrote a session
 * object to localStorage. Every part of that was decorative. The digests shipped
 * in the bundle, the "session" was a value the user could type into devtools,
 * and the data it guarded was already downloaded. It is now a thin client over
 * /api/auth — the browser asks who it is and is told; it no longer decides.
 *
 * The permission tables are still imported here, but only to decide what to
 * render. Nothing granted by them is enforced here; the server checks the same
 * tables again on every request.
 */

// Re-exported so the 30-odd modules importing these from this file keep working.
export {
  actionPermissions,
  getImpersonatableRoles,
  getVisibleRoles,
  roleLabels,
  routePermissions,
  type RoleId,
  type UserInfo,
};

interface AuthResult {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

interface RoleContextValue {
  user: UserInfo | null;
  isAuthenticated: boolean;
  role: RoleId | null;
  /** True while the first /api/auth/me is in flight, so routes can wait instead of bouncing to /login. */
  loading: boolean;
  /** True when this session runs against the read-only demo tenant. */
  isDemo: boolean;
  setRole: (role: RoleId) => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  enterDemo: (role: RoleId) => Promise<AuthResult>;
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

export function RoleProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [originalUser, setOriginalUser] = useState<UserInfo | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  /** Pulls the session from the server; the single place identity is set. */
  const refresh = useCallback(async () => {
    try {
      const s = await api.session();
      setUser(s.user);
      setIsDemo(s.demo);
      setOriginalUser(
        s.impersonating && s.realUser
          ? { id: s.realUser.id, name: s.realUser.name, email: "", role: s.realUser.role }
          : null,
      );
    } catch {
      // A failed identity check means "not signed in", never "signed in anyway".
      setUser(null);
      setOriginalUser(null);
      setIsDemo(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    try {
      const result = await api.login(email, password);
      setUser(result.user);
      setIsDemo(result.demo);
      setOriginalUser(null);
      setLoading(false);
      return { success: true, user: result.user };
    } catch (err) {
      // The failure is already recorded server-side, with the caller's real IP.
      // Logging it again from here would attribute it to an unauthenticated
      // client that has no identity to attribute it to.
      const message =
        err instanceof ApiError ? err.message : "Sign-in failed. Please try again.";
      return { success: false, error: message };
    }
  }, []);

  const enterDemo = useCallback(async (role: RoleId): Promise<AuthResult> => {
    try {
      const result = await api.enterDemo(role);
      setUser(result.user);
      setIsDemo(true);
      setOriginalUser(null);
      setLoading(false);
      return { success: true, user: result.user };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not open the demo.";
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    // Clear locally at once so the UI cannot keep rendering a signed-in shell,
    // then revoke on the server. The revoke is what actually ends the session.
    setUser(null);
    setOriginalUser(null);
    setIsDemo(false);
    void api.logout().catch(() => undefined);
  }, []);

  /**
   * Both the demo's "switch role" and an admin's "impersonate" go to the same
   * endpoint, because they are the same act: ask the server to treat this
   * session as somebody else. Neither changes anything until it answers.
   */
  const applyRole = useCallback(
    async (role: RoleId | null) => {
      try {
        await api.switchRole(role);
        await refresh();
      } catch (err) {
        if (err instanceof ApiError) {
          logAudit({
            action: "ROLE_SWITCH_DENIED",
            category: "security",
            entity: "role",
            entityId: role ?? "self",
            severity: "warning",
            details: err.message,
          });
        }
      }
    },
    [refresh],
  );

  const setRole = useCallback((role: RoleId) => void applyRole(role), [applyRole]);
  const impersonate = useCallback((role: RoleId) => void applyRole(role), [applyRole]);
  const endImpersonation = useCallback(() => void applyRole(null), [applyRole]);

  const role = user?.role ?? null;

  // Both delegate to the shared tables. `hasAccess` used to return true for any
  // route missing from the table, which meant adding a page without adding a
  // permission entry silently exposed it. It now fails closed, matching the
  // server.
  const hasAccess = useCallback((route: string) => roleHasRoute(role, route), [role]);
  const can = useCallback((action: string) => roleCan(role, action), [role]);

  return (
    <RoleContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        role,
        loading,
        isDemo,
        setRole,
        login,
        enterDemo,
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

const nullContextValue: RoleContextValue = {
  user: null,
  isAuthenticated: false,
  role: null,
  loading: true,
  isDemo: false,
  setRole: () => {},
  login: async () => ({ success: false, error: "Not initialized" }),
  enterDemo: async () => ({ success: false, error: "Not initialized" }),
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
