import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireMethod, send, withErrors } from "../_lib/http.js";
import { requireAction } from "../_lib/auth.js";
import { verifyAudit } from "../_lib/audit.js";

/**
 * Re-derives every hash in the caller's tenant chain and reports the result.
 *
 * The verdict is computed here, from the stored rows, and never by the browser.
 * A client that computed its own verdict could simply report "verified" — the
 * check has to run somewhere the party being audited does not control.
 */
export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["GET"]);
  const session = await requireAction(req, "security:view");
  send(res, 200, await verifyAudit(session.tenantId));
});
