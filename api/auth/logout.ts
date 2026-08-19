import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp, HttpError, jsonBody, requireMethod, send, userAgent, withErrors } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import {
  clearSessionCookie,
  currentSession,
  readCookie,
  revokeSession,
  SESSION_COOKIE,
  type SessionUser,
} from "../_lib/session.js";
import { actorFor, appendClientEntries, tryAppendAudit } from "../_lib/audit.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const token = readCookie(req, SESSION_COOKIE);
  const ip = clientIp(req);
  const ua = userAgent(req);

  // Attribution for the entries below, and nothing else.
  //
  // Its failure is caught here rather than allowed to propagate, because the
  // revoke is what this request is *for*. An earlier version let it escape, and
  // the request then ended with the cookie cleared and the token still live on
  // the server — signed out in appearance only, and still usable by anyone who
  // had captured it. Losing the attribution costs an audit entry; losing the
  // revoke costs the session.
  let session: SessionUser | null = null;
  try {
    session = await currentSession(req);
  } catch (err) {
    console.error("session lookup on logout failed", err);
  }

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
  // Best-effort throughout: neither an unparseable body nor a malformed entry
  // may stop somebody signing out. The entries are cargo; the revoke is the
  // point.
  if (session) {
    let items: unknown[] = [];
    try {
      const body = jsonBody(req);
      if (Array.isArray(body.entries)) items = body.entries as unknown[];
    } catch (err) {
      // `jsonBody` throws a 400. Thrown from here it ended the request before
      // the revoke ran, so a body that would not parse left the caller looking
      // signed out with a session still live on the server.
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
  // Attempted regardless of everything above, for that reason.
  let revoked = false;
  if (token) {
    try {
      await revokeSession(token);
      revoked = true;
    } catch (err) {
      console.error("session revoke failed", err);
    }
  }

  // The cookie is cleared unless the token is known to be dead.
  //
  // A revoked token is inert — `currentSession` finds no live row for it — so
  // clearing it is hygiene rather than security, and the header is not free: it
  // clears whatever cookie the browser holds when the response *lands*, not the
  // one this request arrived with. Sign out, then sign in before this response
  // returns, and the clear erased the session that had just been issued. Not
  // sending the header is what prevents that.
  //
  // Every other outcome clears, including the ones reached by failure, so this
  // browser is left holding nothing it can use. Clearing after a failed revoke
  // can still clobber a concurrent sign-in; that needs a failed revoke *and* a
  // sign-in inside the same window, and between the two this is the right one
  // (R-032).
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

  // A token that could not be revoked is still usable, so answering `ok` would
  // be a false claim about the one thing this endpoint exists to do. The caller
  // is signed out in this browser either way — the cookie is gone — but the
  // session outliving it is a failure and is reported as one.
  if (token && !revoked) {
    throw new HttpError(
      503,
      "revoke_failed",
      "Signed out in this browser, but the session could not be revoked on the server.",
    );
  }

  send(res, 200, { ok: true });
});
