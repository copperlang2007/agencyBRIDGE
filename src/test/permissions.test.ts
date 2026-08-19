import { describe, it, expect } from "vitest";
import {
  actionPermissions,
  getImpersonatableRoles,
  getVisibleRoles,
  isRoleId,
  ROLE_IDS,
  roleCan,
  roleHasRoute,
  roleLabels,
  routePermissions,
} from "@/lib/permissions";

/**
 * Permission tables.
 *
 * These are imported by the API and applied to every request, so a mistake here
 * is not a UI defect — it decides what a session may read and write. The suite
 * concentrates on the failure direction that matters: opening something by
 * accident.
 */

describe("fail-closed behaviour", () => {
  it("denies an unknown action", () => {
    expect(roleCan("admin", "totally:invented")).toBe(false);
  });

  it("denies an unknown route", () => {
    // This changed with the server: the browser used to return true for any
    // route missing from the table, so adding a page without a permission entry
    // silently exposed it to everyone.
    expect(roleHasRoute("admin", "/not-a-real-page")).toBe(false);
  });

  it("denies everything when there is no role", () => {
    expect(roleCan(null, "client:create")).toBe(false);
    expect(roleHasRoute(null, "/")).toBe(false);
    expect(roleCan(undefined, "client:create")).toBe(false);
  });

  it("rejects role identifiers that are not roles", () => {
    for (const bad of ["", "ADMIN", "root", "superuser", null, undefined, 7, {}]) {
      expect(isRoleId(bad), String(bad)).toBe(false);
    }
    for (const good of ROLE_IDS) {
      expect(isRoleId(good)).toBe(true);
    }
  });
});

describe("table integrity", () => {
  it("every role has a label", () => {
    for (const role of ROLE_IDS) {
      expect(roleLabels[role], role).toBeTruthy();
    }
  });

  it("every action lists only real roles", () => {
    for (const [action, roles] of Object.entries(actionPermissions)) {
      expect(roles.length, `${action} grants nobody`).toBeGreaterThan(0);
      for (const role of roles) {
        expect(isRoleId(role), `${action} lists "${role}"`).toBe(true);
      }
      expect(new Set(roles).size, `${action} lists a role twice`).toBe(roles.length);
    }
  });

  it("every route lists only real roles", () => {
    for (const [route, roles] of Object.entries(routePermissions)) {
      expect(route.startsWith("/"), `${route} is not a path`).toBe(true);
      expect(roles.length, `${route} grants nobody`).toBeGreaterThan(0);
      for (const role of roles) {
        expect(isRoleId(role), `${route} lists "${role}"`).toBe(true);
      }
    }
  });

  it("the dashboard is reachable by every role", () => {
    for (const role of ROLE_IDS) {
      expect(roleHasRoute(role, "/"), role).toBe(true);
    }
  });
});

describe("privilege boundaries", () => {
  it("only admin reaches /admin", () => {
    const allowed = ROLE_IDS.filter((r) => roleHasRoute(r, "/admin"));
    expect(allowed).toEqual(["admin"]);
  });

  it("a read-only auditor cannot write anything", () => {
    const writes = Object.keys(actionPermissions).filter(
      (a) => /:(create|edit|delete|send|upload|import|manage|move_stage|assign|capture|dispute)/.test(a) && roleCan("readonly", a),
    );
    expect(writes).toEqual([]);
  });

  it("an agent cannot manage security or edit commissions", () => {
    expect(roleCan("agent", "security:manage")).toBe(false);
    expect(roleCan("agent", "policy:edit_commission")).toBe(false);
    expect(roleCan("agent", "reconciliation:manage")).toBe(false);
  });

  it("only admin edits commission amounts", () => {
    expect(actionPermissions["policy:edit_commission"]).toEqual(["admin"]);
  });

  it("nobody can impersonate their way upward", () => {
    // The escalation to prevent: stepping down to a lesser role and using that
    // role's own impersonation list to climb back past where you started.
    for (const role of ROLE_IDS) {
      for (const target of getImpersonatableRoles(role)) {
        const onward = getImpersonatableRoles(target);
        expect(onward.includes(role) && role !== target, `${role} -> ${target} -> ${role}`).toBe(false);
      }
    }
  });

  it("a role cannot impersonate itself", () => {
    for (const role of ROLE_IDS) {
      expect(getImpersonatableRoles(role)).not.toContain(role);
    }
  });

  it("only admin and supervisor may impersonate at all", () => {
    const canImpersonate = ROLE_IDS.filter((r) => getImpersonatableRoles(r).length > 0);
    expect([...canImpersonate].sort()).toEqual(["admin", "supervisor"]);
  });

  it("a supervisor may only impersonate agents", () => {
    expect(getImpersonatableRoles("supervisor")).toEqual(["agent"]);
  });

  it("visible roles never exceed what a role may impersonate, plus itself", () => {
    for (const role of ROLE_IDS) {
      const visible = getVisibleRoles(role);
      const permitted = new Set([role, ...getImpersonatableRoles(role)]);
      for (const v of visible) {
        expect(permitted.has(v), `${role} can see ${v} but not impersonate it`).toBe(true);
      }
    }
  });
});
