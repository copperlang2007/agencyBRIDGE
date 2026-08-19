import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  badRequest,
  clientIp,
  jsonBody,
  requireMethod,
  send,
  userAgent,
  withErrors,
} from "../_lib/http.js";
import { requireAction, requireSameOrigin, requireUser } from "../_lib/auth.js";
import { appendClientEntries, listAudit } from "../_lib/audit.js";

/** Ceiling on one page of entries. */
const MAX_LIMIT = 500;

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  const method = requireMethod(req, ["GET", "POST"]);

  if (method === "GET") {
    // Reading the trail is itself a privileged act — the log names who did what.
    const session = await requireAction(req, "security:view");
    const raw = Number(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit);
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), MAX_LIMIT) : 200;
    send(res, 200, { entries: await listAudit(session.tenantId, limit) });
    return;
  }

  requireSameOrigin(req);
  // Deliberately not gated by requireWritable. "Read-only demo" means the
  // sample book cannot be altered; it does not mean the demo stops recording
  // what happened. Suppressing audit writes there would leave the demo's own
  // Security page showing an empty chain, which misrepresents the feature it
  // exists to demonstrate. Appends are additive and attributed to the demo
  // session, so they cannot alter what any other visitor sees in the book.
  const session = await requireUser(req);

  const body = jsonBody(req);
  const items = Array.isArray(body.entries) ? body.entries : [body];
  if (items.length === 0) throw badRequest("No entries supplied.");

  // Validation, attribution and the batch ceiling live in one place, shared
  // with sign-out, which delivers whatever is left over in the same request
  // that revokes the session.
  const written = await appendClientEntries(session, items, clientIp(req), userAgent(req));

  send(res, 201, { written: written.length, seq: written });
});
