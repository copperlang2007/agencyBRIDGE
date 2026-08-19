import { describe, it, expect } from "vitest";
import {
  canonicalPayload,
  chainHash,
  CHAIN_FIELDS,
  GENESIS_HASH,
  verifyChain,
  type ChainRecord,
  type ChainedRecord,
} from "@/lib/auditChain";

/**
 * The audit hash chain.
 *
 * These replace the tests for the old browser-local chain in
 * `src/lib/auditLog.ts`. The chain moved to the server, so what is tested here
 * is the logic the API appends and verifies with — the same module, imported by
 * both. The failure this suite exists to prevent has not changed: the Security
 * page reports this verdict to an operator as "tampering detected", so a false
 * pass and a false alarm are both compliance defects.
 */

function record(seq: number, over: Partial<ChainRecord> = {}): ChainRecord {
  return {
    seq: String(seq),
    id: `00000000-0000-0000-0000-${String(seq).padStart(12, "0")}`,
    timestamp: `2026-08-19T10:0${seq % 10}:00.000Z`,
    actor: "Patricia Chen",
    actorId: "user-1",
    action: "CLIENT_VIEWED",
    category: "client",
    entity: "client",
    entityId: `CL-000${seq}`,
    severity: "info",
    details: "opened record",
    sessionId: "sess-1",
    ipAddress: "203.0.113.7",
    userAgent: "test-agent",
    ...over,
  };
}

/** Builds a valid chain of `n` entries, oldest first. */
function chain(n: number, mutate: (i: number) => Partial<ChainRecord> = () => ({})): ChainedRecord[] {
  const out: ChainedRecord[] = [];
  let prev = GENESIS_HASH;
  for (let i = 1; i <= n; i++) {
    const r = record(i, mutate(i));
    const hash = chainHash(prev, r);
    out.push({ ...r, prevHash: prev, hash });
    prev = hash;
  }
  return out;
}

describe("canonicalPayload", () => {
  it("covers every field in CHAIN_FIELDS", () => {
    const r = record(1);
    const payload = canonicalPayload(r);
    for (const field of CHAIN_FIELDS) {
      expect(payload, `field ${field} is not covered by the digest`).toContain(r[field]);
    }
  });

  it("length-prefixes values so content cannot be shifted across delimiters", () => {
    // Without length prefixes, an actor ending in "|" and an action starting
    // where the delimiter would be produce identical bytes.
    const a = canonicalPayload(record(1, { actor: "a|b", action: "c" }));
    const b = canonicalPayload(record(1, { actor: "a", action: "b|c" }));
    expect(a).not.toBe(b);
  });

  it("distinguishes an empty field from a missing one", () => {
    expect(canonicalPayload(record(1, { details: "" }))).not.toBe(
      canonicalPayload(record(1, { details: " " })),
    );
  });
});

describe("chainHash", () => {
  it("is deterministic", () => {
    expect(chainHash(GENESIS_HASH, record(1))).toBe(chainHash(GENESIS_HASH, record(1)));
  });

  it("changes when any hashed field changes", () => {
    const base = chainHash(GENESIS_HASH, record(1));
    for (const field of CHAIN_FIELDS) {
      const altered = chainHash(GENESIS_HASH, record(1, { [field]: "tampered" } as Partial<ChainRecord>));
      expect(altered, `changing ${field} did not change the digest`).not.toBe(base);
    }
  });

  it("binds the entry to its predecessor", () => {
    const r = record(2);
    expect(chainHash("a".repeat(64), r)).not.toBe(chainHash("b".repeat(64), r));
  });

  it("produces a 64-character hex digest", () => {
    expect(chainHash(GENESIS_HASH, record(1))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("verifyChain", () => {
  it("accepts an empty chain", () => {
    expect(verifyChain([])).toEqual({ valid: true, brokenAt: null, truncated: false });
  });

  it("accepts an intact chain", () => {
    expect(verifyChain(chain(5))).toEqual({ valid: true, brokenAt: null, truncated: false });
  });

  it("detects a modified field", () => {
    const entries = chain(5);
    entries[2] = { ...entries[2], details: "REWRITTEN" };
    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(3);
    expect(result.reason).toMatch(/modified/i);
  });

  it("detects a modified field even when the hash is rewritten to match", () => {
    // An attacker who recomputes the entry's own hash still breaks the link to
    // the entry after it.
    const entries = chain(5);
    const forged = { ...entries[2], details: "REWRITTEN" };
    entries[2] = { ...forged, hash: chainHash(forged.prevHash, forged) };
    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(4);
  });

  it("detects a removed entry", () => {
    const entries = chain(5);
    entries.splice(2, 1);
    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/predecessor|missing/i);
  });

  it("detects reordering", () => {
    const entries = chain(5);
    [entries[1], entries[2]] = [entries[2], entries[1]];
    expect(verifyChain(entries).valid).toBe(false);
  });

  it("detects a gap in the sequence even when the hashes link", () => {
    // Sequence numbers are assigned by a unique index and are dense, so a gap
    // means a row was deleted. Build a chain that links correctly but skips a
    // number, and it must still fail.
    const entries = chain(3);
    const tail = { ...entries[2], seq: "9" };
    entries[2] = { ...tail, hash: chainHash(tail.prevHash, tail) };
    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/missing/i);
  });

  it("detects a malformed entry without throwing, and names its sequence", () => {
    // brokenAt is shown to an operator as "Broken at #N" and has to point at
    // the entry they can go and look at. Reporting the array index sends them
    // to the wrong row for any window that does not begin at seq 1.
    const entries: unknown[] = chain(3);
    entries[1] = { ...(entries[1] as object), actor: undefined };
    const result = verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
    expect(result.reason).toMatch(/Entry 2 is malformed/);
  });

  it("falls back to position when a malformed entry has no usable sequence", () => {
    const entries: unknown[] = chain(3);
    entries[1] = { ...(entries[1] as object), actor: undefined, seq: "not-a-number" };
    expect(verifyChain(entries).brokenAt).toBe(2); // one-based position
  });

  it("rejects a chain whose head does not link to the expected boundary", () => {
    // Deleting from the front is the case a naive verifier misses: the
    // surviving head still hashes correctly against its own recorded prevHash.
    // Verification has to be told what the head's predecessor should be.
    const entries = chain(5).slice(2);
    expect(verifyChain(entries, GENESIS_HASH).valid).toBe(false);
  });

  it("accepts a window when the expected boundary is supplied", () => {
    const full = chain(5);
    const window = full.slice(2);
    const result = verifyChain(window, window[0].prevHash);
    expect(result.valid).toBe(true);
    expect(result.truncated).toBe(true);
  });

  it("reports truncated only when the boundary is not genesis", () => {
    expect(verifyChain(chain(3), GENESIS_HASH).truncated).toBe(false);
  });

  it("does not accept an entry that links to a hash of the right shape but wrong value", () => {
    const entries = chain(3);
    entries[1] = { ...entries[1], prevHash: "f".repeat(64) };
    expect(verifyChain(entries).valid).toBe(false);
  });
});
