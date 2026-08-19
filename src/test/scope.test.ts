import { describe, it, expect } from "vitest";
import { agentScope, bookScope } from "../../api/_lib/scope";
import { ROLE_IDS, type RoleId } from "@/lib/permissions";

/**
 * Scoping rules, tested where they are now enforced.
 *
 * These replace the tests for `src/lib/dataScope.ts`, which checked that a
 * browser filtered an array it had already been handed. The rules are the same;
 * what changed is that they now describe which rows a SQL query returns, so a
 * mistake here is a data leak rather than a display bug.
 *
 * `bookScope` produces two bound parameters:
 *
 *   where tenant_id = $1 and ($2::boolean or agent_id = $3)
 *          all ────────────────┘                    agentId ┘
 *
 * so `all: true` means every row in the tenant, and `all: false` with a null
 * agent id means `agent_id = NULL`, which is never true — no rows.
 */

const session = (role: RoleId, agentId: string | null = null) => ({ role, agentId });

describe("bookScope", () => {
  it("gives admin the whole tenant book", () => {
    expect(bookScope(session("admin"))).toEqual({ all: true, agentId: null });
  });

  it("gives supervisor the whole tenant book", () => {
    expect(bookScope(session("supervisor"))).toEqual({ all: true, agentId: null });
  });

  it("gives retention the whole tenant book", () => {
    expect(bookScope(session("retention"))).toEqual({ all: true, agentId: null });
  });

  it("gives a read-only auditor the whole tenant book", () => {
    expect(bookScope(session("readonly"))).toEqual({ all: true, agentId: null });
  });

  it("restricts an agent to their own agent id", () => {
    expect(bookScope(session("agent", "AG-001"))).toEqual({ all: false, agentId: "AG-001" });
  });

  it("keeps two agents apart", () => {
    expect(bookScope(session("agent", "AG-001")).agentId).not.toBe(
      bookScope(session("agent", "AG-002")).agentId,
    );
  });

  it("an agent login with no staff record gets no rows, not every row", () => {
    // The dangerous failure: `all` must stay false so the query keeps the
    // `agent_id = $3` arm, and a null id matches nothing.
    const scope = bookScope(session("agent", null));
    expect(scope.all).toBe(false);
    expect(scope.agentId).toBeNull();
  });

  it("an unrecognised role gets no rows", () => {
    const scope = bookScope({ role: "auditor-general" as RoleId, agentId: "AG-001" });
    expect(scope).toEqual({ all: false, agentId: null });
  });

  it("never widens scope for any known role without saying so", () => {
    // Whole-book access is a decision, so it is enumerated here rather than
    // inferred: adding a role that reads everything must fail this test until
    // the list is updated deliberately.
    const wholeBook = ROLE_IDS.filter((r) => bookScope(session(r, "AG-001")).all);
    expect([...wholeBook].sort()).toEqual(["admin", "readonly", "retention", "supervisor"]);
  });

  it("ignores an agent id supplied alongside a whole-book role", () => {
    // A supervisor carrying a staff record still reads the whole book; the id
    // must not silently narrow them.
    expect(bookScope(session("supervisor", "AG-003"))).toEqual({ all: true, agentId: null });
  });
});

describe("agentScope", () => {
  it("lets admin list every staff record", () => {
    expect(agentScope(session("admin"))).toEqual({ kind: "all" });
  });

  it("lets supervisor list every staff record", () => {
    expect(agentScope(session("supervisor"))).toEqual({ kind: "all" });
  });

  it("shows retention the producer roster", () => {
    expect(agentScope(session("retention"))).toEqual({ kind: "producers" });
  });

  it("shows an agent only their own record", () => {
    expect(agentScope(session("agent", "AG-005"))).toEqual({ kind: "self", agentId: "AG-005" });
  });

  it("shows a read-only auditor only their own record", () => {
    // Distinct from bookScope: an auditor reads the whole book but is not
    // handed the staff roster, which carries pay and compliance detail.
    expect(agentScope(session("readonly"))).toEqual({ kind: "self", agentId: null });
  });

  it("an agent with no staff record resolves to a null id, which matches nothing", () => {
    expect(agentScope(session("agent", null))).toEqual({ kind: "self", agentId: null });
  });

  it("only admin and supervisor reach the full roster", () => {
    const full = ROLE_IDS.filter((r) => agentScope(session(r, "AG-001")).kind === "all");
    expect([...full].sort()).toEqual(["admin", "supervisor"]);
  });
});
