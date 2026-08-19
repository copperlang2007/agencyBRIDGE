import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp, requireMethod, send, userAgent, withErrors } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { clearSessionCookie, currentSession, readCookie, revokeSession, SESSION_COOKIE } from "../_lib/session.js";
import { tryAppendAudit } from "../_lib/audit.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const session = await currentSession(req);
  const token = readCookie(req, SESSION_COOKIE);

  // Revoked server-side, not just dropped client-side: clearing the cookie
  // alone would leave a token that still authenticates if it was captured.
  if (token) await revokeSession(token);
  clearSessionCookie(res);

  if (session) {
    await tryAppendAudit(session.tenantId, {
      actor: session.name,
      actorId: session.userId,
      action: "LOGOUT",
      category: "auth",
      entity: "session",
      entityId: session.sessionId,
      severity: "info",
      details: `${session.email} signed out`,
      sessionId: session.sessionId,
      ipAddress: clientIp(req),
      userAgent: userAgent(req),
    });
  }

  send(res, 200, { ok: true });
});
