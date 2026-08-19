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
import { requireSameOrigin } from "../_lib/auth.js";
import { createSession, setSessionCookie } from "../_lib/session.js";
import { tryAppendAudit } from "../_lib/audit.js";
import { isRoleId, type RoleId } from "../../src/lib/permissions.js";

/**
 * The demo gate.
 *
 * This is what makes the public deployment honest. Entering the demo is an
 * explicit, acknowledged act — not the default state of an app that merely
 * failed to check a password — and it lands the caller in a tenant flagged
 * `is_demo`, whose every write is refused server-side by `requireWritable`.
 *
 * Demo accounts carry no password hash, so they are unreachable from
 * /api/auth/login. There is no credential here to leak, and no path from this
 * session to a real tenant's rows: scoping keys on the session's tenant id.
 */
const DEMO_SLUG = "demo";

interface DemoUserRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: RoleId;
}

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  if (process.env.DEMO_ENABLED === "false") {
    throw forbidden("The demo is not available on this deployment.");
  }

  const body = jsonBody(req);

  // An explicit acknowledgement, not a checkbox the server trusts blindly:
  // the caller cannot reach the demo without asserting they understand it is
  // synthetic and read-only, which is the difference between a gated demo and
  // an unlocked app.
  if (body.acknowledged !== true) {
    throw badRequest("Entering the demo requires acknowledging that it is synthetic, read-only sample data.");
  }

  const requested = body.role ?? "admin";
  if (!isRoleId(requested)) {
    throw badRequest("Unknown demo role.");
  }

  const user = await queryOne<DemoUserRow>(
    `select u.id, u.tenant_id, u.email, u.name, u.role
       from users u
       join tenants t on t.id = u.tenant_id
      where t.slug = $1 and t.is_demo = true and u.role = $2 and u.status = 'active'
      limit 1`,
    [DEMO_SLUG, requested],
  );
  if (!user) {
    throw notFound("That demo role is not available.");
  }

  const ip = clientIp(req);
  const ua = userAgent(req);
  const { token } = await createSession(user.id, ip, ua);
  setSessionCookie(res, token);

  await tryAppendAudit(user.tenant_id, {
    actor: user.name,
    actorId: user.id,
    action: "DEMO_SESSION_STARTED",
    category: "auth",
    entity: "session",
    entityId: user.id,
    severity: "info",
    details: `Demo session opened as ${user.role}`,
    sessionId: user.id,
    ipAddress: ip,
    userAgent: ua,
  });

  send(res, 200, {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    demo: true,
  });
});
