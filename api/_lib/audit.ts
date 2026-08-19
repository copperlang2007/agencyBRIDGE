import { randomUUID } from "node:crypto";
import { query, queryOne } from "./db.js";
import {
  chainHash,
  GENESIS_HASH,
  verifyChain,
  type ChainIntegrityResult,
  type ChainRecord,
} from "../../src/lib/auditChain.js";

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
 * The chain must start at seq 1. Nothing in this system removes an audit row —
 * there is no retention trim — so a first entry above 1 means rows were deleted
 * outright, which is tampering and is reported as such. Taking the head's own
 * `prevHash` as the expected boundary instead would make front-deletion verify
 * clean, which is precisely the hole a deleter would use. If a retention window
 * is ever added it must record the boundary hash it trimmed to, and that
 * recorded value — never the surviving head's own claim — becomes the expected
 * predecessor here.
 */
export async function verifyAudit(tenantId: string): Promise<ChainIntegrityResult & { count: number }> {
  const rows = await query<Record<string, unknown>>(
    `select * from audit_events where tenant_id = $1 order by seq asc`,
    [tenantId],
  );
  const entries = rows.map(toRecord);
  if (entries.length === 0) {
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
  return { ...result, count: entries.length };
}
