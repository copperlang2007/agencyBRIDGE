import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp, jsonBody, requireMethod, send, userAgent, withErrors } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { clearSessionCookie, currentSession, readCookie, revokeSession, SESSION_COOKIE } from "../_lib/session.js";
import { actorFor, appendClientEntries, tryAppendAudit } from "../_lib/audit.js";

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

  const ip = clientIp(req);
  const ua = userAgent(req);

  // Whatever the client had left unsent, delivered in the request that revokes
  // the session rather than in one before it.
  //
  // Sign-out used to be two round trips: deliver, then revoke. The browser
  // attaches the cookie when a request is *issued*, so the revoke carried
  // whatever cookie existed by the time the delivery came back — and a sign-in
  // during that gap, in this tab or another one, replaced it. The revoke then
  // ended the session that had just been created. Carrying the entries here
  // closes the gap instead of guarding it: one request, issued with this
  // session's cookie, and there is no interval left to race.
  //
  // Best-effort: a malformed entry must not stop somebody signing out.
  if (session) {
    const body = jsonBody(req);
    const items = Array.isArray(body.entries) ? (body.entries as unknown[]) : [];
    if (items.length > 0) {
      try {
        await appendClientEntries(session, items, ip, ua);
      } catch (err) {
        console.error("audit delivery on logout failed", err);
      }
    }
  }

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
      ipAddress: ip,
      userAgent: ua,
    });
  }

  send(res, 200, { ok: true });
});
