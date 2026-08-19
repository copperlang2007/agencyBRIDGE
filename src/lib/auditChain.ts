/**
 * The audit hash chain — one definition, shared by the API that writes it and
 * by the tests that prove it.
 *
 * Pure and dependency-free on purpose: the server imports it to append and
 * verify, and the browser never computes a chain hash at all. That asymmetry is
 * the point. A chain the writer can recompute is a chain the writer can forge,
 * so entries are hashed where the client cannot reach them.
 */

// The ".js" extension is required, not stylistic: this module is imported by
// the serverless functions, which run as real Node ESM where an extensionless
// relative specifier does not resolve. Without it the API builds cleanly and
// then every function that reaches the audit chain dies at import with
// FUNCTION_INVOCATION_FAILED — a production-only failure that the bundler used
// in dev and in tests papers over. Vite and tsc map ".js" back to ".ts".
import { sha256Hex } from "./sha256.js";

/**
 * The audit vocabulary.
 *
 * One definition, because there are three consumers that must agree: the API
 * validates an incoming entry against these, the database constrains the stored
 * severity to them, and the UI types and CSV export read them back. Held
 * separately they drift silently — a category the UI knows and the server
 * rejects, or worse, one the server accepts and the UI has no arm for.
 */
export const AUDIT_CATEGORIES = [
  "auth", "client", "policy", "commission", "compliance", "agent", "communication",
  "call", "supervisor", "retention", "knowledge_base", "security", "campaign", "system",
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

export const AUDIT_SEVERITIES = ["info", "warning", "critical", "success"] as const;

export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export function isAuditCategory(value: unknown): value is AuditCategory {
  return typeof value === "string" && (AUDIT_CATEGORIES as readonly string[]).includes(value);
}

export function isAuditSeverity(value: unknown): value is AuditSeverity {
  return typeof value === "string" && (AUDIT_SEVERITIES as readonly string[]).includes(value);
}

/** Predecessor hash of the first entry in an untruncated chain. */
export const GENESIS_HASH = "0".repeat(64);

/** Every field covered by the digest, in the order it is hashed. */
export const CHAIN_FIELDS = [
  "seq",
  "id",
  "timestamp",
  "actor",
  "actorId",
  "action",
  "category",
  "entity",
  "entityId",
  "severity",
  "details",
  "sessionId",
  "ipAddress",
  "userAgent",
] as const;

export type ChainField = (typeof CHAIN_FIELDS)[number];

/** The material an auditor relies on. `seq` pins position, so reordering breaks the chain twice over. */
export type ChainRecord = Record<ChainField, string>;

export interface ChainedRecord extends ChainRecord {
  prevHash: string;
  hash: string;
}

export interface ChainIntegrityResult {
  /** False only when a retained entry was mutated, removed, or reordered. */
  valid: boolean;
  /** Sequence number of the first entry that failed verification. */
  brokenAt: number | null;
  /** True when the head of the chain has aged out of the retained window. */
  truncated: boolean;
  /** Human-readable reason, present only when `valid` is false. */
  reason?: string;
}

/**
 * Canonical byte-string for one entry.
 *
 * Values are length-prefixed so content cannot be shifted across delimiters to
 * forge a colliding payload — an actor named `a|b` and an actor `a` followed by
 * an action starting `b` must not produce the same bytes.
 */
export function canonicalPayload(record: ChainRecord): string {
  return CHAIN_FIELDS.map((f) => {
    const v = record[f] ?? "";
    return `${v.length}:${v}`;
  }).join("|");
}

/** Digest of one entry, bound to its predecessor. */
export function chainHash(prevHash: string, record: ChainRecord): string {
  return sha256Hex(`${prevHash}|${canonicalPayload(record)}`);
}

function isChainRecord(value: unknown): value is ChainedRecord {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  if (typeof c.hash !== "string" || typeof c.prevHash !== "string") return false;
  return CHAIN_FIELDS.every((f) => typeof c[f] === "string");
}

/**
 * Verifies a contiguous slice of a chain, oldest first.
 *
 * `expectedHeadPrev` is the `prevHash` the first retained entry must carry. For
 * a complete chain that is the genesis hash; for a window that has rolled past
 * retention it is the hash of the last entry dropped. Without it, deleting the
 * head is indistinguishable from ordinary retention — which is exactly the hole
 * an attacker would use.
 */
export function verifyChain(
  entries: readonly unknown[],
  expectedHeadPrev: string = GENESIS_HASH,
): ChainIntegrityResult {
  const truncated = expectedHeadPrev !== GENESIS_HASH;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!isChainRecord(entry)) {
      return { valid: false, brokenAt: i, truncated, reason: `Entry ${i} is malformed.` };
    }
    const expectedPrev = i === 0 ? expectedHeadPrev : (entries[i - 1] as ChainedRecord).hash;
    if (entry.prevHash !== expectedPrev) {
      return {
        valid: false,
        brokenAt: Number(entry.seq) || i,
        truncated,
        reason: `Entry ${entry.seq} does not link to its predecessor.`,
      };
    }
    if (chainHash(entry.prevHash, entry) !== entry.hash) {
      return {
        valid: false,
        brokenAt: Number(entry.seq) || i,
        truncated,
        reason: `Entry ${entry.seq} has been modified since it was written.`,
      };
    }
  }

  // A dense sequence is required: `seq` is assigned by a unique index, so a gap
  // means a row was deleted outright rather than aged out of the window.
  for (let i = 1; i < entries.length; i++) {
    const prev = Number((entries[i - 1] as ChainedRecord).seq);
    const cur = Number((entries[i] as ChainedRecord).seq);
    if (cur !== prev + 1) {
      return { valid: false, brokenAt: cur, truncated, reason: `Entries between ${prev} and ${cur} are missing.` };
    }
  }

  return { valid: true, brokenAt: null, truncated };
}
