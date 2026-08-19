import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp, requireMethod, send, userAgent, withErrors } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { clearSessionCookie, currentSession, readCookie, revokeSession, SESSION_COOKIE } from "../_lib/session.js";
import { actorFor, tryAppendAudit } from "../_lib/audit.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const token = readCookie(req, SESSION_COOKIE);

  // Cleared before any database call. If the revoke below fails, the caller
  // must still end up signed out locally — a logout that throws and leaves the
  // cookie in place restores the session on the next refresh, which is the
  // opposite of what was asked for.
  clearSessionCookie(res);

  const session = await currentSession(req);

  // Revoked server-side as well, not just dropped client-side: clearing the
  // cookie alone would leave a token that still authenticates if captured.
  if (token) await revokeSession(token);

  if (session) {
    const who = actorFor(session);
    await tryAppendAudit(session.tenantId, {
      actor: who.actor,
      actorId: who.actorId,
      action: "LOGOUT",
      category: "auth",
      entity: "session",
      entityId: session.sessionId,
      severity: "info",
      details: `${session.realName} signed out` + who.suffix,
      sessionId: session.sessionId,
      ipAddress: clientIp(req),
      userAgent: userAgent(req),
    });
  }

  send(res, 200, { ok: true });
});
