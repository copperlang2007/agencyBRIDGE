// Audit logging — client transport.
//
// This module used to hold the chain: it hashed entries in the browser and kept
// them in localStorage. That made the operator both the subject of the audit and
// its custodian, which is the one arrangement an audit trail cannot survive —
// anyone with devtools could rewrite or discard the evidence, and the "verified"
// badge on the Security page was only ever a statement about a value the same
// browser had just written.
//
// The chain now lives in Postgres, appended by the API, hashed where the client
// cannot reach it (see api/_lib/audit.ts and src/lib/auditChain.ts). What is
// left here is delivery: buffer entries, post them, and keep the ones that have
// not made it across a reload. Nothing in this file decides what an entry says
// about who did it — the server takes actor, session and IP from the session.

import { api, type AuditAppend, type AuditRecord } from "@/lib/api";
import { csvCell, csvRows } from "@/lib/csv";

// Declared once in auditChain, which the API imports too, so a category the UI
// knows cannot be one the server rejects.
export {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  type AuditCategory,
  type AuditSeverity,
} from "@/lib/auditChain";
import type { AuditCategory, AuditSeverity } from "@/lib/auditChain";

/** An entry as stored and returned by the server. */
export type AuditEntry = AuditRecord;

export interface AuditIntegrityResult {
  /** False only when a retained entry was mutated, removed, or reordered. */
  valid: boolean;
  /** Sequence number of the first entry that failed verification. */
  brokenAt: number | null;
  /** True when entries are missing from the front of the chain. */
  truncated: boolean;
  /** Human-readable explanation, present only when `valid` is false. */
  reason?: string;
  /** How many entries were checked. */
  count: number;
}

/** Unsent entries, so a reload mid-flush does not drop them. */
const OUTBOX_KEY = "agencybridge_audit_outbox_v1";
/** Ceiling on the outbox: a server that stays down must not fill storage. */
const MAX_OUTBOX = 200;
/** Batch window. Long enough to coalesce a burst, short enough to feel immediate. */
const FLUSH_DELAY_MS = 400;
/** Backoff ceiling after repeated failures, so an outage is not hammered. */
const MAX_RETRY_DELAY_MS = 30_000;

type AuditListener = () => void;
const listeners = new Set<AuditListener>();

/** Notifies the UI that the trail may have changed, so views can refetch. */
export function subscribeAuditLog(fn: AuditListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a broken listener must not stop the others */
    }
  }
}

function readOutbox(): AuditAppend[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditAppend[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: AuditAppend[]): void {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries.slice(-MAX_OUTBOX)));
  } catch {
    /* private mode or quota — the in-memory buffer still flushes this session */
  }
}

/**
 * The queue of unsent entries, and the only place they live.
 *
 * Seeded from storage at load so entries that never reached the server survive
 * a reload; `writeOutbox` mirrors it after every change. Holding a separate
 * in-memory buffer *and* an outbox meant each entry sat in both, and a flush
 * that concatenated the two posted everything twice — duplicate rows in a
 * tamper-evident chain, which is a corruption of the record, not a cosmetic
 * bug. One queue, mirrored; never two sources added together.
 */
let queue: AuditAppend[] = readOutbox();
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;
let failures = 0;

/** How many entries one request may carry; the server rejects more. */
const MAX_BATCH = 25;

/**
 * Sends what is queued.
 *
 * Entries leave the queue only once the server has accepted them. A batch
 * rejected for a transient reason (offline, signed out, rate-limited) stays
 * queued for the next attempt; one rejected as invalid is dropped, because
 * retrying it forever would block everything behind it.
 */
async function flush(): Promise<void> {
  if (inFlight || queue.length === 0) return;

  inFlight = true;
  const batch = queue.slice(0, MAX_BATCH);
  try {
    await api.appendAudit(batch);
    // Sliced from the queue as it stands *now*, not from a snapshot taken
    // before the request: an entry logged while the request was in flight has
    // been pushed onto the end, and rewriting a pre-flight copy over it would
    // discard it silently.
    queue = queue.slice(batch.length);
    writeOutbox(queue);
    notify();
    if (queue.length > 0) schedule();
    failures = 0;
  } catch (err) {
    const status = (err as { status?: number }).status ?? 0;
    const retryable = status === 0 || status === 401 || status === 429 || status >= 500;
    if (retryable) {
      // Nothing else will come back for these: logAudit schedules a flush, but
      // an idle tab may not log again for minutes, and until it does the
      // entries sit unsent. Retry on a backoff instead of waiting to be
      // prompted.
      failures += 1;
      schedule(Math.min(FLUSH_DELAY_MS * 2 ** failures, MAX_RETRY_DELAY_MS));
    } else {
      queue = queue.slice(batch.length);
      writeOutbox(queue);
      failures = 0;
    }
  } finally {
    inFlight = false;
  }
}

function schedule(delay: number = FLUSH_DELAY_MS): void {
  if (timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, delay);
}

/**
 * Records an action. Fire-and-forget by design: the ~24 call sites are UI
 * handlers, and none of them should await a network round trip to render.
 *
 * `actor` and `actorId` are accepted for call-site compatibility and then
 * ignored — the server attributes every entry to the session that sent it. A
 * client that could name its own actor could blame somebody else.
 */
export function logAudit(params: {
  actor?: string;
  actorId?: string;
  action: string;
  category: AuditCategory;
  entity: string;
  entityId?: string;
  severity?: AuditSeverity;
  details?: string;
}): void {
  const entry: AuditAppend = {
    action: params.action,
    category: params.category,
    entity: params.entity,
    entityId: params.entityId || "-",
    severity: params.severity || "info",
    details: params.details || "",
  };
  queue.push(entry);
  writeOutbox(queue);
  schedule();
}

/** Sends anything buffered right now. Used before navigating away. */
export function flushAuditLog(): Promise<void> {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  return flush();
}

/** How many entries are waiting to reach the server. */
export function pendingAuditCount(): number {
  return queue.length;
}

/** The tenant's trail, newest first. Requires permission to read the log. */
export function fetchAuditLog(limit = 200): Promise<AuditEntry[]> {
  return api.auditEntries(limit);
}

/** The server's verdict on the chain. Recomputed there, from the stored rows. */
export function fetchAuditIntegrity(): Promise<AuditIntegrityResult> {
  return api.auditVerify();
}

/**
 * CSV of the supplied entries.
 *
 * Takes entries rather than fetching them so the export always matches what the
 * operator is looking at. Every cell goes through `csvCell`, which neutralises
 * leading `= + - @` and control characters — a carrier name or a details string
 * is attacker-influenced text, and a spreadsheet will happily execute it.
 */
export function exportAuditCSV(entries: readonly AuditEntry[]): string {
  const header = [
    "Seq", "Timestamp", "Actor", "Actor ID", "Action", "Category",
    "Entity", "Entity ID", "Severity", "Details", "Session", "IP", "User Agent", "Hash",
  ];
  const rows = entries.map((e) => [
    e.seq, e.timestamp, e.actor, e.actorId, e.action, e.category,
    e.entity, e.entityId, e.severity, e.details, e.sessionId, e.ipAddress, e.userAgent, e.hash,
  ]);
  return csvRows([header, ...rows].map((row) => row.map(csvCell)));
}
