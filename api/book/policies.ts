import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireMethod, send, withErrors } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";
import { listPolicies } from "../_lib/book.js";

/**
 * Policies visible to the caller.
 *
 * Authorization here is the *scope*, not a route check. Page routes and data
 * needs do not line up: the dashboard is open to every role and shows an agent
 * their own record, while the /agents page is admin-only — gating this endpoint
 * on `/agents` would deny a request the product is supposed to serve. So the
 * endpoint requires a session, and bookScope decides which rows exist for
 * that session. It fails closed: an unrecognised role resolves to no rows.
 */
export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["GET"]);
  const session = await requireUser(req);
  send(res, 200, { policies: await listPolicies(session) });
});
