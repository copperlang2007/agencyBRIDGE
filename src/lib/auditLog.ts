// Tamper-evident audit log.
//
// Every meaningful action is appended with actor, action, entity, severity, and
// session context, chained by SHA-256 so that any later edit to a stored entry is
// detectable. SecurityPage surfaces the verification result to the operator, so
// both false alarms and missed tampering are user-visible compliance defects.
//
// Scope limit (see RISKS R-003): this is browser-local evidence. It detects
// mutation of retained entries; it cannot prevent an operator with devtools from
// discarding the log wholesale. Server-side append-only storage is required
// before this constitutes an audit trail of record.

import { sha256Hex } from "./sha256";
import { csvCell } from "./csv";

export type AuditSeverity = "info" | "warning" | "critical" | "success";
export type AuditCategory =
  | "auth"
  | "client"
  | "policy"
  | "commission"
  | "compliance"
  | "agent"
  | "communication"
  | "call"
  | "supervisor"
  | "retention"
  | "knowledge_base"
  | "security"
  | "campaign"
  | "system";

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO 8601
  actor: string; // user / agent / system
  actorId: string;
  action: string;
  category: AuditCategory;
  entity: string;
  entityId: string;
  severity: AuditSeverity;
  details: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  hash: string; // SHA-256 over prevHash + every field above
  prevHash: string;
}

export interface AuditIntegrityResult {
  /** False only when a retained entry was mutated, removed, or reordered. */
  valid: boolean;
  /** Index of the first entry that failed verification. */
  brokenAt: number | null;
  /** True when the head of the chain has aged out of the retention window. */
  truncated: boolean;
}

/** Exported so tests and tooling do not have to hardcode the key. */
export const AUDIT_STORAGE_KEY = "medicare_audit_log_v3";

/** Predecessor hash of the first entry in an untruncated chain. */
export const GENESIS_HASH = "0".repeat(64);

/**
 * Stored shape: the entries and the boundary they were written with, in one
 * value.
 *
 * The boundary is the `prevHash` the retained head is expected to carry. A
 * counter of dropped entries is not enough — once retention has trimmed even
 * once, any later head deletion looks like more of the same rollover — so the
 * boundary itself pins where the window is supposed to start.
 *
 * It lives *inside* the payload rather than in a sibling key because two
 * `setItem` calls are not atomic: if the second failed, or another tab
 * interleaved between them, the boundary would disagree with the log and
 * verification would report perfectly good entries as tampered. One key, one
 * write, no window in which they can disagree.
 */
interface StoredLog {
  head: string;
  entries: AuditEntry[];
}

const MAX_ENTRIES = 2000;
const MAX_ENTRIES_UNDER_PRESSURE = 500;

const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ── Pub/Sub for real-time event streaming ──────────────────────────
type AuditListener = (entry: AuditEntry) => void;
const listeners = new Set<AuditListener>();

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("medicare_audit_stream") : null;

function emit(entry: AuditEntry) {
  listeners.forEach((fn) => {
    try {
      fn(entry);
    } catch {
      /* a listener must never break the chain */
    }
  });
}

if (channel) {
  channel.onmessage = (ev: MessageEvent<AuditEntry>) => {
    if (ev.data && ev.data.id) emit(ev.data);
  };
}

// Fallback for browsers without BroadcastChannel.
if (typeof window !== "undefined" && !channel) {
  window.addEventListener("storage", (ev) => {
    if (ev.key === AUDIT_STORAGE_KEY && ev.newValue) {
      try {
        const { entries } = JSON.parse(ev.newValue) as StoredLog;
        const last = Array.isArray(entries) ? entries[entries.length - 1] : undefined;
        if (last) emit(last);
      } catch {
        /* ignore malformed cross-tab payload */
      }
    }
  });
}

/** Subscribe to new audit entries as they are logged (same-tab + cross-tab). Returns an unsubscribe fn. */
export function subscribeAuditLog(fn: AuditListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function generateId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getSessionInfo() {
  return {
    sessionId: SESSION_ID,
    ipAddress: "10.0.0.1", // placeholder: the browser cannot observe its own egress IP
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 120) : "server",
  };
}

/**
 * Canonical byte-string covering every field an auditor would rely on.
 * Field values are length-prefixed so that content cannot be shifted across
 * delimiters to forge a colliding payload (e.g. an actor ending in "|").
 */
function canonicalPayload(e: AuditEntry): string {
  const parts = [
    e.id, e.timestamp, e.actor, e.actorId, e.action, e.category,
    e.entity, e.entityId, e.severity, e.details, e.sessionId, e.ipAddress, e.userAgent,
  ];
  return parts.map((p) => `${String(p).length}:${p}`).join("|");
}

function hashEntry(entry: AuditEntry): string {
  return sha256Hex(`${entry.prevHash}|${canonicalPayload(entry)}`);
}

/** Read all audit entries from localStorage. */
export function getAuditLog(): AuditEntry[] {
  return readStored().entries;
}

function readStored(): StoredLog {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return { head: GENESIS_HASH, entries: [] };
    const parsed = JSON.parse(raw) as Partial<StoredLog>;
    return {
      head: typeof parsed?.head === "string" ? parsed.head : GENESIS_HASH,
      entries: Array.isArray(parsed?.entries) ? (parsed.entries as AuditEntry[]) : [],
    };
  } catch {
    return { head: GENESIS_HASH, entries: [] };
  }
}

/** Every field that goes into the hash must be a string, or the record is corrupt. */
const HASHED_FIELDS = [
  "id", "timestamp", "actor", "actorId", "action", "category",
  "entity", "entityId", "severity", "details", "sessionId", "ipAddress", "userAgent",
] as const;

function isEntry(e: unknown): e is AuditEntry {
  if (!e || typeof e !== "object") return false;
  const c = e as Record<string, unknown>;
  if (typeof c.hash !== "string" || typeof c.prevHash !== "string") return false;
  return HASHED_FIELDS.every((f) => typeof c[f] === "string");
}

function write(kept: AuditEntry[]): void {
  const payload: StoredLog = {
    head: kept.length > 0 ? kept[0].prevHash : GENESIS_HASH,
    entries: kept,
  };
  // One write: the entries and the boundary they belong to can never diverge.
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(payload));
}

function persist(log: AuditEntry[]): void {
  try {
    write(log.slice(-MAX_ENTRIES));
  } catch {
    try {
      write(log.slice(-MAX_ENTRIES_UNDER_PRESSURE));
    } catch {
      /* storage unavailable (private mode / quota) — in-memory listeners still fire */
    }
  }
}

/** Core logging function. Call from anywhere in the app. */
export function logAudit(params: {
  actor: string;
  actorId?: string;
  action: string;
  category: AuditCategory;
  entity: string;
  entityId?: string;
  severity?: AuditSeverity;
  details?: string;
}): void {
  const log = getAuditLog();
  const session = getSessionInfo();

  const entry: AuditEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    actor: params.actor,
    actorId: params.actorId || "unknown",
    action: params.action,
    category: params.category,
    entity: params.entity,
    entityId: params.entityId || "",
    severity: params.severity || "info",
    details: params.details || "",
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    hash: "",
    prevHash: log.length > 0 ? log[log.length - 1].hash : GENESIS_HASH,
  };

  // Hashed synchronously: an async digest would let the next entry chain against
  // a placeholder hash, silently corrupting the chain under normal use.
  entry.hash = hashEntry(entry);

  log.push(entry);
  persist(log);

  const icon = { info: "•", warning: "⚠", critical: "✖", success: "✓" }[entry.severity];
  // eslint-disable-next-line no-console
  console.log(`${icon} [AUDIT] ${entry.category.toUpperCase()} ${entry.action} — ${entry.entity} (${entry.actor})`);

  emit(entry);

  if (channel) {
    try {
      channel.postMessage(entry);
    } catch {
      /* broadcast is best-effort */
    }
  }
}

/**
 * Recompute the chain and report the first entry that fails.
 *
 * A head that no longer starts at genesis means the retention window rolled over,
 * which is expected operation rather than tampering — it is reported via
 * `truncated` so the UI does not raise a false alarm, and every retained entry is
 * still verified.
 */
export function verifyAuditIntegrity(): AuditIntegrityResult {
  const { head: expectedHeadPrev, entries: log } = readStored();

  for (let i = 0; i < log.length; i++) {
    const entry = log[i];

    // A malformed record is corruption. Report it rather than throwing, which
    // would drop the Security page into the global error boundary.
    if (!isEntry(entry)) return { valid: false, brokenAt: i, truncated: false };

    if (i > 0 && entry.prevHash !== log[i - 1].hash) {
      return { valid: false, brokenAt: i, truncated: false };
    }
    if (hashEntry(entry) !== entry.hash) {
      return { valid: false, brokenAt: i, truncated: false };
    }
  }

  // Checked only once the chain has verified, so `truncated` never appears
  // alongside a failure. The head must sit exactly where retention last left it;
  // anything else means entries were removed from the front by something other
  // than the retention cap.
  if (log.length > 0 && log[0].prevHash !== expectedHeadPrev) {
    return { valid: false, brokenAt: 0, truncated: false };
  }

  return { valid: true, brokenAt: null, truncated: expectedHeadPrev !== GENESIS_HASH };
}

/** Export log as CSV (SOC 2 evidence artifact). */
export function exportAuditCSV(): string {
  const log = getAuditLog();
  const headers = [
    "id", "timestamp", "actor", "actorId", "action", "category",
    "entity", "entityId", "severity", "details", "sessionId", "ipAddress", "hash", "prevHash",
  ];
  const rows = log.map((e) =>
    [
      e.id, e.timestamp, e.actor, e.actorId, e.action, e.category, e.entity,
      e.entityId, e.severity, e.details, e.sessionId, e.ipAddress, e.hash, e.prevHash,
    ]
      .map(csvCell)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

/**
 * Clear the audit log. Admin-only.
 *
 * The clear is not silent: the emptied log is re-seeded with a genesis entry
 * recording who cleared it, so the erasure itself remains auditable. The role
 * check is advisory in a browser-only build (see RISKS R-002).
 */
export function clearAuditLog(
  callerRole?: string,
  actor = "system",
  actorId = "unknown",
): { success: boolean; error?: string } {
  if (callerRole !== "admin") {
    return { success: false, error: "Unauthorized: only administrators may clear the audit log." };
  }

  const priorCount = getAuditLog().length;
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  } catch {
    /* fall through — the re-seed below is what matters */
  }

  logAudit({
    actor,
    actorId,
    action: "audit_log_cleared",
    category: "security",
    entity: "audit_log",
    severity: "critical",
    details: `Audit log cleared by ${actor}; ${priorCount} prior entries discarded.`,
  });

  return { success: true };
}
