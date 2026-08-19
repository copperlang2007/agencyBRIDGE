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
import { csvRows } from "@/lib/csv";

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
let failures = 0;

/**
 * The request currently on the wire, or null.
 *
 * A promise rather than a boolean because callers need to *wait* for it. This
 * held `false`/`true`, and `flushAuditLog` returned as soon as it saw `true` —
 * so sign-out's "deliver, then revoke" sequence revoked the cookie while the
 * delivery it had just awaited was still in the air.
 */
let inFlight: Promise<void> | null = null;

/**
 * Bumped by `discardAuditQueue`.
 *
 * A request already in flight when the queue is discarded belongs to a session
 * that no longer exists. Its completion must not touch the queue that replaced
 * it — see the guard in `send`.
 */
let generation = 0;

/** How many entries one request may carry; the server rejects more. */
const MAX_BATCH = 25;

/**
 * Sends one batch.
 *
 * Entries leave the queue only once the server has accepted them. A batch
 * rejected for a transient reason (offline, signed out, rate-limited) stays
 * queued for the next attempt; one rejected as invalid is dropped, because
 * retrying it forever would block everything behind it.
 *
 * Every path that touches `queue` after the await is gated on the generation
 * being unchanged. Without that gate a sign-out during a request removed
 * `batch.length` entries from whatever queue existed when the request landed —
 * and after a discard that is the *next* session's queue, so signing out while
 * an append was in flight silently deleted up to 25 of the next user's entries.
 */
async function send(): Promise<void> {
  const gen = generation;
  const batch = queue.slice(0, MAX_BATCH);
  try {
    await api.appendAudit(batch);
    if (gen !== generation) return;
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
    if (gen !== generation) return;
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
  }
}

/**
 * Sends what is queued, and resolves when the wire is quiet.
 *
 * When a request is already in flight the caller gets *that* promise, not an
 * immediately-resolved one. The distinction is the whole point: `flushAuditLog`
 * is awaited by sign-out before the cookie is revoked, and a flush that
 * resolved early let the revoke overtake the delivery it was supposed to
 * follow.
 */
function flush(): Promise<void> {
  if (inFlight !== null) {
    // Entries added during the current request are not in it. Leave a timer so
    // they go out on their own rather than waiting for the next unrelated call.
    if (queue.length > 0) schedule();
    return inFlight;
  }
  if (queue.length === 0) return Promise.resolve();

  const run = send();
  inFlight = run.finally(() => {
    inFlight = null;
  });
  return inFlight;
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

/**
 * Hands the caller what is queued and clears the queue in the same step.
 *
 * Sign-out uses this to carry its leftovers in the request that revokes the
 * session, so there is no interval between delivering them and the cookie they
 * are authenticated by going away. Capped at what one request may carry; the
 * remainder is dropped, which is the loss recorded as R-031.
 */
export function takeAuditQueue(): AuditAppend[] {
  const pending = queue.slice(0, MAX_BATCH);
  discardAuditQueue();
  return pending;
}

/**
 * Drops anything still queued.
 *
 * Called at sign-out, after a final flush attempt. Entries name no actor — the
 * server attributes them to whoever is signed in when they arrive — so an entry
 * left over from one session and delivered during the next would be recorded
 * against the wrong person. An audit trail that misattributes is worse than one
 * with a gap, so the gap is the deliberate choice.
 */
export function discardAuditQueue(): void {
  // Invalidates any request still in flight, so its completion cannot reach
  // into the queue that replaces this one.
  generation += 1;
  queue = [];
  failures = 0;
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  writeOutbox(queue);
}

/** Sends anything buffered right now, without waiting for the batch window. */
export function flushAuditLog(): Promise<void> {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  return flush();
}

// Leaving the page is the last chance to deliver. Without this the entries
// survive — the outbox is written on every change — but they sit there until
// somebody opens the app again, which for a closed tab may be never.
// `pagehide` rather than `beforeunload`: it fires for the bfcache and on
// mobile, where `beforeunload` frequently does not.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    void flushAuditLog();
  });
}

// Anything recovered from a previous page load is sent without waiting for the
// user to happen to do something else; an idle tab would otherwise hold it
// indefinitely.
if (queue.length > 0) schedule();

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
 * operator is looking at. `csvRows` escapes every cell, neutralising leading
 * `= + - @` and control characters — a carrier name or a details string is
 * attacker-influenced text, and a spreadsheet will happily execute it.
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
  // csvRows escapes each cell itself; mapping csvCell first quoted everything
  // twice, so a spreadsheet showed `"""Patricia Chen"""` rather than the name.
  return csvRows([header, ...rows]);
}
