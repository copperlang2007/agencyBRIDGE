import type { VercelRequest, VercelResponse } from "@vercel/node";
import { queryOne } from "../_lib/db.js";
import {
  badRequest,
  clientIp,
  forbidden,
  jsonBody,
  notFound,
  requireMethod,
  send,
  userAgent,
  withErrors,
} from "../_lib/http.js";
import { requireSameOrigin, requireUser } from "../_lib/auth.js";
import { setImpersonation } from "../_lib/session.js";
import { tryAppendAudit } from "../_lib/audit.js";
import { getImpersonatableRoles, isRoleId, roleLabels, type RoleId } from "../../src/lib/permissions.js";

/**
 * Views the product as another role, or returns to your own.
 *
 * The product has always offered this — "Switch Role" in the demo, "Impersonate
 * Role" for an admin debugging what a user can see. It used to be done entirely
 * in the browser: the client swapped its own `user` object and carried on
 * holding the same data. Nothing about the caller's access actually changed, so
 * an admin "viewing as an agent" still saw the whole book, which is a worse
 * failure than not offering the feature — the screen asserts a restriction that
 * is not in force.
 *
 * Now the target is recorded on the session row, and every later request
 * resolves its effective identity from it. An admin viewing as an agent gets
 * exactly that agent's rows, from the same scoping used for a real sign-in.
 *
 * Who may do it is checked here against the caller's REAL role, never the role
 * they are currently presenting as — otherwise stepping down to `agent` and
 * back up to `admin` would be a privilege escalation loop.
 */
export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const session = await requireUser(req);
  const body = jsonBody(req);
  const requested = body.role;

  // Returning to your own identity is always permitted.
  if (requested === null) {
    if (session.isImpersonating) {
      await setImpersonation(session.sessionId, null);
      await tryAppendAudit(session.tenantId, {
        actor: session.realName,
        actorId: session.realUserId,
        action: "END_IMPERSONATION",
        category: "security",
        entity: "role",
        entityId: session.realRole,
        severity: "info",
        details: `Returned to ${roleLabels[session.realRole]}`,
        sessionId: session.sessionId,
        ipAddress: clientIp(req),
        userAgent: userAgent(req),
      });
    }
    send(res, 200, { ok: true, impersonating: false });
    return;
  }

  if (!isRoleId(requested)) throw badRequest("Unknown role.");

  const allowed = getImpersonatableRoles(session.realRole);
  if (!allowed.includes(requested as RoleId)) {
    throw forbidden(`${roleLabels[session.realRole]} may not view the product as ${roleLabels[requested]}.`);
  }

  // Pick a real account of that role inside the caller's own tenant. There is
  // no cross-tenant path here by construction: the lookup is bounded by
  // session.tenantId, and the session resolver re-checks the tenant when it
  // reads the impersonation back.
  const target = await queryOne<{ id: string; name: string }>(
    `select id, name from users
      where tenant_id = $1 and role = $2 and status = 'active' and id <> $3
      order by created_at
      limit 1`,
    [session.tenantId, requested, session.realUserId],
  );
  if (!target) throw notFound(`No ${roleLabels[requested]} account exists in this workspace.`);

  await setImpersonation(session.sessionId, target.id);

  await tryAppendAudit(session.tenantId, {
    actor: session.realName,
    actorId: session.realUserId,
    action: "IMPERSONATE_ROLE",
    category: "security",
    entity: "role",
    entityId: requested,
    severity: "warning",
    details: `${roleLabels[session.realRole]} is now viewing the product as ${target.name} (${roleLabels[requested]})`,
    sessionId: session.sessionId,
    ipAddress: clientIp(req),
    userAgent: userAgent(req),
  });

  send(res, 200, { ok: true, impersonating: true, role: requested });
});
