import { randomUUID } from "node:crypto";
import { query, queryOne } from "./db.js";
import { badRequest } from "./http.js";
import {
  chainHash,
  GENESIS_HASH,
  isAuditCategory,
  isAuditSeverity,
  verifyChain,
  type ChainIntegrityResult,
  type ChainRecord,
} from "../../src/lib/auditChain.js";

/**
 * Who an entry is attributed to.
 *
 * The account holder, never the identity they are presenting as. An
 * administrator viewing the product as an agent is still the person who acted,
 * and an audit trail that names the impersonated user hides the only party who
 * can be held to it — while looking perfectly well-formed. The effective
 * identity is not lost: it is appended to the details, where it belongs as
 * context rather than as the actor.
 */
export function actorFor(session: {
  realName: string;
  realUserId: string;
  name: string;
  role: string;
  isImpersonating: boolean;
}): { actor: string; actorId: string; suffix: string } {
  return {
    actor: session.realName,
    actorId: session.realUserId,
    suffix: session.isImpersonating ? ` (acting as ${session.name}, ${session.role})` : "",
  };
}

export interface AuditInput {
  actor: string;
  actorId: string;
  action: string;
  category: string;
  entity: string;
  entityId: string;
  severity: string;
  details: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
}

/** Longest a single field may be. Keeps one caller from bloating the chain. */
const MAX_FIELD = 500;

function clamp(value: unknown): string {
  return String(value ?? "").slice(0, MAX_FIELD);
}

/**
 * Appends one entry to a tenant's chain.
 *
 * The head is read, then the row is inserted with `seq = head + 1`. Two
 * concurrent appends can read the same head; the `unique (tenant_id, seq)`
 * index turns that into a failed insert rather than a forked chain, and the
 * loop retries against the new head. Losing the race costs a round trip;
 * corrupting the chain is not among the outcomes.
 */
export async function appendAudit(
  tenantId: string,
  input: AuditInput,
  attempts = 4,
): Promise<{ seq: number; hash: string }> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const head = await queryOne<{ seq: string; hash: string }>(
      `select seq, hash from audit_events where tenant_id = $1 order by seq desc limit 1`,
      [tenantId],
    );
    const seq = head ? Number(head.seq) + 1 : 1;
    const prevHash = head ? head.hash : GENESIS_HASH;

    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const record: ChainRecord = {
      seq: String(seq),
      id,
      timestamp,
      actor: clamp(input.actor),
      actorId: clamp(input.actorId),
      action: clamp(input.action),
      category: clamp(input.category),
      entity: clamp(input.entity),
      entityId: clamp(input.entityId),
      severity: clamp(input.severity),
      details: clamp(input.details),
      sessionId: clamp(input.sessionId),
      ipAddress: clamp(input.ipAddress),
      userAgent: clamp(input.userAgent),
    };
    const hash = chainHash(prevHash, record);

    try {
      await query(
        `insert into audit_events
           (id, tenant_id, seq, ts, actor, actor_id, action, category, entity,
            entity_id, severity, details, session_id, ip_address, user_agent,
            prev_hash, hash)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          id, tenantId, seq, timestamp,
          record.actor, record.actorId, record.action, record.category, record.entity,
          record.entityId, record.severity, record.details, record.sessionId,
          record.ipAddress, record.userAgent, prevHash, hash,
        ],
      );
      // Record where the chain has reached. Written after the row, and only
      // ever forward, so a lost race cannot rewind the marker.
      await query(
        `insert into audit_heads (tenant_id, seq, hash, updated_at)
         values ($1, $2, $3, now())
         on conflict (tenant_id) do update
           set seq = excluded.seq, hash = excluded.hash, updated_at = now()
         where excluded.seq > audit_heads.seq`,
        [tenantId, seq, hash],
      );
      return { seq, hash };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      // Only a sequence collision is worth retrying; anything else is a real
      // failure and retrying would just repeat it.
      if (!message.includes("audit_events_tenant_id_seq_key") && !message.includes("duplicate key")) {
        throw err;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not append audit entry after repeated sequence collisions");
}

/**
 * Best-effort append for paths where losing the log must not fail the request —
 * a login that succeeded should not report failure because the audit insert
 * timed out. The failure is logged for the platform, not swallowed silently.
 */
export async function tryAppendAudit(tenantId: string, input: AuditInput): Promise<void> {
  try {
    await appendAudit(tenantId, input);
  } catch (err) {
    console.error("audit append failed", { action: input.action, err });
  }
}

export interface AuditRow extends ChainRecord {
  prevHash: string;
  hash: string;
}

function toRecord(r: Record<string, unknown>): AuditRow {
  const ts = r.ts instanceof Date ? r.ts.toISOString() : String(r.ts);
  return {
    seq: String(r.seq),
    id: String(r.id),
    timestamp: ts,
    actor: String(r.actor),
    actorId: String(r.actor_id),
    action: String(r.action),
    category: String(r.category),
    entity: String(r.entity),
    entityId: String(r.entity_id),
    severity: String(r.severity),
    details: String(r.details),
    sessionId: String(r.session_id),
    ipAddress: String(r.ip_address),
    userAgent: String(r.user_agent),
    prevHash: String(r.prev_hash),
    hash: String(r.hash),
  };
}

/** Most recent `limit` entries, newest first (the order the UI lists them). */
export async function listAudit(tenantId: string, limit: number): Promise<AuditRow[]> {
  const rows = await query<Record<string, unknown>>(
    `select * from audit_events where tenant_id = $1 order by seq desc limit $2`,
    [tenantId, limit],
  );
  return rows.map(toRecord);
}

/**
 * Verifies the whole chain for a tenant.
 *
 * Reads oldest-first so the walk matches the order the entries were written.
 *
 * Three things are checked, because a walk of the surviving rows alone proves
 * only that what remains is self-consistent:
 *
 *  - the chain starts at seq 1. Nothing here removes a row — there is no
 *    retention trim — so a higher first entry means rows were deleted from the
 *    front. Taking the surviving head's own `prevHash` as the expected boundary
 *    would make that verify clean, which is precisely the hole a deleter uses.
 *  - every entry re-derives to its stored hash and links to its predecessor.
 *  - the last entry matches the recorded head. Without this, deleting the
 *    *newest* rows leaves a shorter chain that still verifies perfectly, and
 *    deleting every row leaves an empty one that verifies vacuously. The marker
 *    is kept outside the walk for exactly that reason.
 *
 * If a retention window is ever added it must record the boundary hash it
 * trimmed to, and that recorded value — never a surviving row's own claim —
 * becomes the expected predecessor.
 */
export async function verifyAudit(tenantId: string): Promise<ChainIntegrityResult & { count: number }> {
  const rows = await query<Record<string, unknown>>(
    `select * from audit_events where tenant_id = $1 order by seq asc`,
    [tenantId],
  );
  const entries = rows.map(toRecord);

  const marker = await queryOne<{ seq: string; hash: string }>(
    `select seq, hash from audit_heads where tenant_id = $1`,
    [tenantId],
  );

  if (entries.length === 0) {
    if (marker) {
      return {
        valid: false,
        brokenAt: 1,
        truncated: true,
        reason: `The chain is empty, but ${marker.seq} entries were recorded. Every entry has been deleted.`,
        count: 0,
      };
    }
    return { valid: true, brokenAt: null, truncated: false, count: 0 };
  }
  const firstSeq = Number(entries[0].seq);
  if (firstSeq !== 1) {
    return {
      valid: false,
      brokenAt: 1,
      truncated: true,
      reason: `The chain starts at entry ${firstSeq}; entries before it were removed.`,
      count: entries.length,
    };
  }
  const result = verifyChain(entries, GENESIS_HASH);
  if (!result.valid) return { ...result, count: entries.length };

  const last = entries[entries.length - 1];

  // No marker, but entries exist: the one check that detects deletion of the
  // *newest* rows cannot run, so this cannot be reported as verified. Skipping
  // it on a missing marker would leave exactly the hole the marker was added to
  // close — and deleting the marker is easier than deleting the chain.
  if (!marker) {
    return {
      valid: false,
      brokenAt: Number(last.seq),
      // Not truncated: the walk above already established that this chain
      // starts at seq 1 and links from genesis, so nothing is missing from the
      // front. What is missing is the means to check the *end*.
      truncated: false,
      reason: "No recorded head for this chain, so entries removed from the end could not be detected.",
      count: entries.length,
    };
  }

  if (Number(last.seq) !== Number(marker.seq) || last.hash !== marker.hash) {
    return {
      valid: false,
      brokenAt: Number(marker.seq),
      // Entries were removed from the end, which `truncated` does not describe:
      // it means the head aged out of a retention window. Reporting it here
      // would have a consumer read deliberate retention into a deletion.
      truncated: false,
      reason: `The chain ends at entry ${last.seq}, but entry ${marker.seq} was recorded. Later entries have been removed.`,
      count: entries.length,
    };
  }

  return { ...result, count: entries.length };
}

/** Ceiling on one batch of client-supplied appends. */
export const MAX_CLIENT_BATCH = 25;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/**
 * Appends entries a client submitted, under the caller's own identity.
 *
 * Shared by `POST /api/audit` and by sign-out, which carries whatever the
 * client had left over in the same request that revokes the session. One
 * implementation because they must apply the same rules: a category the batch
 * endpoint rejects cannot be one sign-out quietly accepts.
 *
 * Actor, session and network identity come from the session, never from the
 * body. A client that could name its own actor could write entries attributing
 * its actions to somebody else, which would make the trail worse than no trail.
 */
export async function appendClientEntries(
  session: { tenantId: string; sessionId: string; realName: string; realUserId: string; name: string; role: string; isImpersonating: boolean },
  items: unknown[],
  ipAddress: string,
  userAgent: string,
): Promise<number[]> {
  if (items.length > MAX_CLIENT_BATCH) {
    throw badRequest(`At most ${MAX_CLIENT_BATCH} entries per request.`);
  }

  const who = actorFor(session);
  const written: number[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") throw badRequest("Each entry must be an object.");
    const e = item as Record<string, unknown>;

    const category = str(e.category, "system");
    const severity = str(e.severity, "info");
    if (!isAuditCategory(category)) throw badRequest(`Unknown audit category "${category}".`);
    if (!isAuditSeverity(severity)) throw badRequest(`Unknown audit severity "${severity}".`);

    const { seq } = await appendAudit(session.tenantId, {
      actor: who.actor,
      actorId: who.actorId,
      action: str(e.action, "UNKNOWN"),
      category,
      entity: str(e.entity, "unknown"),
      entityId: str(e.entityId, "-"),
      severity,
      details: str(e.details) + who.suffix,
      sessionId: session.sessionId,
      ipAddress,
      userAgent,
    });
    written.push(seq);
  }

  return written;
}
