import type { RoleId } from "../../src/lib/permissions.js";
import type { SessionUser } from "./session.js";

/**
 * Which slice of the tenant's book a role may read.
 *
 * This used to live in the browser (`src/lib/dataScope.ts`), where it filtered
 * an array that had already been shipped to the client — so it decided what was
 * *displayed*, not what was *reachable*. It is now applied in SQL.
 */
export interface BookScope {
  /** True when the role reads the whole tenant book. */
  all: boolean;
  /** When `all` is false, the only agent whose rows are visible. */
  agentId: string | null;
}

const FULL_BOOK_ROLES: readonly RoleId[] = ["admin", "supervisor", "retention", "readonly"];

/**
 * Fails closed twice over: an unknown role gets no rows, and an agent-role
 * login with no linked staff record resolves to `agentId: null`, which the
 * queries below turn into `agent_id = NULL` — never true, so zero rows rather
 * than the whole book.
 */
export function bookScope(session: Pick<SessionUser, "role" | "agentId">): BookScope {
  if (FULL_BOOK_ROLES.includes(session.role)) return { all: true, agentId: null };
  if (session.role === "agent") return { all: false, agentId: session.agentId };
  return { all: false, agentId: null };
}

/**
 * Which staff records a role may list.
 *
 * `self` is deliberately distinct from `agent`: a retention specialist sees the
 * agent roster, an agent sees only their own record.
 */
export type AgentScope = { kind: "all" } | { kind: "producers" } | { kind: "self"; agentId: string | null };

export function agentScope(session: Pick<SessionUser, "role" | "agentId">): AgentScope {
  if (session.role === "admin" || session.role === "supervisor") return { kind: "all" };
  if (session.role === "retention") return { kind: "producers" };
  return { kind: "self", agentId: session.agentId };
}
