import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query } from "../_lib/db.js";
import {
  badRequest,
  clientIp,
  jsonBody,
  notFound,
  requireMethod,
  requireString,
  send,
  userAgent,
  withErrors,
} from "../_lib/http.js";
import { requireAction, requireSameOrigin, requireWritable } from "../_lib/auth.js";
import { bookScope } from "../_lib/scope.js";
import { appendAudit } from "../_lib/audit.js";

/**
 * Updates a client's status and notes.
 *
 * The one write path in the product, and it exists to make three boundaries
 * real rather than theoretical:
 *
 *   - "read-only demo" refuses here, server-side, before a row is touched;
 *   - an agent may edit only their own client, enforced by the same scope
 *     predicate the reads use, applied in the UPDATE's WHERE clause rather
 *     than checked beforehand — so there is no window between the check and
 *     the write;
 *   - the change is recorded in the tenant's hash chain, with the actor taken
 *     from the session.
 */
const STATUSES = new Set(["Active", "Pending", "Lapsed", "Prospect"]);
const MAX_NOTES = 2000;

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const session = await requireAction(req, "client:edit");
  requireWritable(session);

  const body = jsonBody(req);
  const id = requireString(body, "id", 64);

  const hasStatus = body.status !== undefined;
  const hasNotes = body.notes !== undefined;
  if (!hasStatus && !hasNotes) throw badRequest("Nothing to update.");

  let status: string | null = null;
  if (hasStatus) {
    status = requireString(body, "status", 32);
    if (!STATUSES.has(status)) throw badRequest(`"${status}" is not a valid client status.`);
  }

  let notes: string | null = null;
  if (hasNotes) {
    if (body.notes !== null && typeof body.notes !== "string") {
      throw badRequest('"notes" must be a string or null.');
    }
    notes = body.notes === null ? null : String(body.notes).slice(0, MAX_NOTES);
  }

  const scope = bookScope(session);
  const updated = await query<{ id: string; name: string; status: string; notes: string | null }>(
    `update clients
        set status = coalesce($4, status),
            notes  = case when $5::boolean then $6 else notes end
      where tenant_id = $1
        and id = $2
        and ($3::boolean or agent_id = $7)
      returning id, name, status, notes`,
    [session.tenantId, id, scope.all, status, hasNotes, notes, scope.agentId],
  );

  // Out of scope and does-not-exist are the same answer on purpose: telling an
  // agent that a client exists but is not theirs leaks the shape of the book.
  if (updated.length === 0) throw notFound("No such client in your book.");
  const row = updated[0];

  await appendAudit(session.tenantId, {
    actor: session.name,
    actorId: session.userId,
    action: "CLIENT_UPDATED",
    category: "client",
    entity: "client",
    entityId: row.id,
    severity: "info",
    details: [
      hasStatus ? `status set to ${row.status}` : null,
      hasNotes ? "notes edited" : null,
    ].filter(Boolean).join("; ") || "no change",
    sessionId: session.sessionId,
    ipAddress: clientIp(req),
    userAgent: userAgent(req),
  });

  send(res, 200, {
    client: { id: row.id, name: row.name, status: row.status, notes: row.notes ?? undefined },
  });
});
