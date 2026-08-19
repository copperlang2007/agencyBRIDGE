import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp, jsonBody, requireMethod, send, userAgent, withErrors } from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { clearSessionCookie, currentSession, readCookie, revokeSession, SESSION_COOKIE } from "../_lib/session.js";
import { actorFor, appendClientEntries, tryAppendAudit } from "../_lib/audit.js";

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const token = readCookie(req, SESSION_COOKIE);
  const ip = clientIp(req);
  const ua = userAgent(req);

  // Set only where the token is known to be dead. Everything that decides the
  // cookie's fate hangs off this one flag, so there is no path out of this
  // handler that forgets to make the decision — see the `finally`.
  let revoked = false;

  try {
    const session = await currentSession(req);

    // Whatever the client had left unsent, delivered in the request that
    // revokes the session rather than in one before it.
    //
    // Sign-out used to be two round trips: deliver, then revoke. The browser
    // attaches the cookie when a request is *issued*, so the revoke carried
    // whatever cookie existed by the time the delivery came back — and a
    // sign-in during that gap, in this tab or another one, replaced it. The
    // revoke then ended the session that had just been created. Carrying the
    // entries here closes the gap instead of guarding it: one request, issued
    // with this session's cookie, and there is no interval left to race.
    //
    // Best-effort throughout: neither an unparseable body nor a malformed
    // entry may stop somebody signing out. The entries are cargo; the revoke
    // is the point.
    if (session) {
      let items: unknown[] = [];
      try {
        const body = jsonBody(req);
        if (Array.isArray(body.entries)) items = body.entries as unknown[];
      } catch (err) {
        // `jsonBody` throws a 400. Thrown from here it ended the request before
        // the revoke ran, so a body that would not parse left the caller
        // looking signed out with a session still live on the server.
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
    if (token) {
      try {
        await revokeSession(token);
        revoked = true;
      } catch (err) {
        console.error("session revoke failed", err);
      }
    }

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
  } finally {
    // The cookie is cleared unless the token is known to be dead.
    //
    // A revoked token is inert — `currentSession` finds no live row for it — so
    // clearing it is hygiene rather than security, and the header is not free:
    // it clears whatever cookie the browser holds when the response *lands*,
    // not the one this request arrived with. Sign out, then sign in before this
    // response returns, and the clear erased the session that had just been
    // issued. Not sending the header is what prevents that.
    //
    // Every other outcome clears, and this runs in a `finally` for the reason
    // that matters most: the session lookup above hits the database and can
    // throw, and an earlier version returned 503 without ever reaching this
    // decision. The client hides the error and clears its own state, so the
    // caller saw the login screen while their session stayed usable — the exact
    // failure the revoke exists to prevent, reached by a path that skipped it.
    // Clearing on the way out leaves the token unusable from this browser even
    // when nothing else worked. The error still propagates.
    //
    // Clearing after a failed revoke can still clobber a concurrent sign-in.
    // That needs a failed revoke *and* a sign-in inside the same window, and
    // between the two outcomes this is the right one (R-032).
    if (!revoked) clearSessionCookie(res);
  }

  send(res, 200, { ok: true });
});
