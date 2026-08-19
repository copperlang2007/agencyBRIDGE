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
import { appendAudit, listAudit } from "../_lib/audit.js";

/** Ceiling on one page of entries, and on one batch of appends. */
const MAX_LIMIT = 500;
const MAX_BATCH = 25;

const CATEGORIES = new Set([
  "auth", "client", "policy", "commission", "compliance", "agent", "communication",
  "call", "supervisor", "retention", "knowledge_base", "security", "campaign", "system",
]);
const SEVERITIES = new Set(["info", "warning", "critical", "success"]);

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

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
  if (items.length > MAX_BATCH) throw badRequest(`At most ${MAX_BATCH} entries per request.`);

  const ip = clientIp(req);
  const ua = userAgent(req);
  const written: number[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") throw badRequest("Each entry must be an object.");
    const e = item as Record<string, unknown>;

    const category = str(e.category, "system");
    const severity = str(e.severity, "info");
    if (!CATEGORIES.has(category)) throw badRequest(`Unknown audit category "${category}".`);
    if (!SEVERITIES.has(severity)) throw badRequest(`Unknown audit severity "${severity}".`);

    // Actor, session and network identity come from the session, never from the
    // request body. A client that could name its own actor could write entries
    // attributing its actions to somebody else — which would make the trail
    // worse than no trail.
    written.push(
      (
        await appendAudit(session.tenantId, {
          actor: session.name,
          actorId: session.userId,
          action: str(e.action, "UNKNOWN"),
          category,
          entity: str(e.entity, "unknown"),
          entityId: str(e.entityId, "-"),
          severity,
          details: str(e.details),
          sessionId: session.sessionId,
          ipAddress: ip,
          userAgent: ua,
        })
      ).seq,
    );
  }

  send(res, 201, { written: written.length, seq: written });
});
