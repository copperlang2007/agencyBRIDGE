import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireMethod, send, withErrors } from "../_lib/http.js";
import { currentSession } from "../_lib/session.js";

/**
 * The client's only source of identity.
 *
 * Returning `user: null` rather than 401 keeps this a plain question — "am I
 * signed in?" — that the app asks on every load without treating the answer as
 * an error.
 */
export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["GET"]);
  const session = await currentSession(req);
  if (!session) {
    send(res, 200, { user: null, demo: false });
    return;
  }
  send(res, 200, {
    // The effective identity: who the session is acting as right now.
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      role: session.role,
    },
    // The account holder, so the UI can show whose impersonation this is and
    // offer a way back. Present only while impersonating.
    realUser: session.isImpersonating
      ? { id: session.realUserId, name: session.realName, role: session.realRole }
      : null,
    impersonating: session.isImpersonating,
    demo: session.isDemo,
    tenant: session.tenantSlug,
  });
});
