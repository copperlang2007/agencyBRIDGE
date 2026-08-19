import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp, jsonBody, requireMethod, send, userAgent, withErrors } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { clearSessionCookie, currentSession, readCookie, revokeSession, SESSION_COOKIE } from "../_lib/session.js";
import { actorFor, appendClientEntries, tryAppendAudit } from "../_lib/audit.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const token = readCookie(req, SESSION_COOKIE);

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
    let items: unknown[] = [];
    try {
      const body = jsonBody(req);
      if (Array.isArray(body.entries)) items = body.entries as unknown[];
    } catch (err) {
      // A body that will not parse must not stop the revoke below. `jsonBody`
      // throws a 400, and thrown from here it ended the request before the
      // session was revoked — so a malformed body left the caller looking
      // signed out with a session still live on the server. Signing out is the
      // point of this request; the entries are cargo.
      console.error("audit delivery on logout could not parse the body", err);
    }
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
  let revoked = false;
  if (token) {
    try {
      await revokeSession(token);
      revoked = true;
    } catch (err) {
      console.error("session revoke failed", err);
    }
  }

  // The cookie is cleared only when the token could *not* be revoked.
  //
  // A revoked token is inert — `currentSession` finds no live row for it — so
  // clearing it is hygiene rather than security, and the header is not free:
  // it clears whatever cookie the browser holds when the response lands, not
  // the one this request arrived with. Sign out, then sign in before this
  // response returns, and the clear erased the session that had just been
  // issued. Issuing this request first, as the client now does, fixes *which
  // session gets revoked* — it does not control which cookie a late response
  // wipes. Not sending the header is what does.
  //
  // When the revoke failed the token may still authenticate, and leaving the
  // caller signed in is the worse failure, so the cookie goes. That can still
  // clobber a concurrent sign-in; it needs a failed revoke and a sign-in inside
  // the same window, and between the two outcomes this is the right one.
  if (!revoked) clearSessionCookie(res);

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
