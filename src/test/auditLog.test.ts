import { describe, it, expect, beforeEach } from "vitest";
import {
  logAudit,
  GENESIS_HASH,
  getAuditLog,
  verifyAuditIntegrity,
  exportAuditCSV,
  clearAuditLog,
  AUDIT_STORAGE_KEY,
} from "@/lib/auditLog";

// ── Regression suite for the tamper-evident audit chain ──────────────
// SecurityPage renders "Possible tampering detected" directly from
// verifyAuditIntegrity(), so both a false alarm and a missed tamper are
// user-visible compliance defects. Each test below pins one of them.

const entry = (n: number) => ({
  actor: `user${n}`,
  actorId: `u${n}`,
  action: `action_${n}`,
  category: "security" as const,
  entity: "entity",
  entityId: `e${n}`,
  details: `detail ${n}`,
});

beforeEach(() => {
  localStorage.clear();
});

describe("audit chain — integrity under normal use", () => {
  it("F1: consecutive writes produce a chain that verifies (no async hash race)", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    expect(verifyAuditIntegrity()).toEqual({ valid: true, brokenAt: null, truncated: false });
  });

  it("F1: chain still verifies after promise microtasks flush", async () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(verifyAuditIntegrity().valid).toBe(true);
  });

  it("each entry links to its predecessor", () => {
    logAudit(entry(0));
    logAudit(entry(1));
    const log = getAuditLog();
    expect(log[1].prevHash).toBe(log[0].hash);
  });
});

describe("audit chain — tamper detection", () => {
  it("F2: mutating `details` is detected", () => {
    logAudit(entry(0));
    logAudit(entry(1));
    const log = getAuditLog();
    log[0].details = "rewritten by an attacker";
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity()).toMatchObject({ valid: false, brokenAt: 0 });
  });

  it("F2: mutating `actor` is detected", () => {
    logAudit(entry(0));
    const log = getAuditLog();
    log[0].actor = "someone_else";
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity().valid).toBe(false);
  });

  it("F2: mutating `actorId` is detected", () => {
    logAudit(entry(0));
    const log = getAuditLog();
    log[0].actorId = "escalated";
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity().valid).toBe(false);
  });

  it("F2: mutating `timestamp` is detected", () => {
    logAudit(entry(0));
    const log = getAuditLog();
    log[0].timestamp = new Date(0).toISOString();
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity().valid).toBe(false);
  });

  it("deleting a middle entry breaks linkage", () => {
    for (let i = 0; i < 4; i++) logAudit(entry(i));
    const log = getAuditLog();
    log.splice(2, 1);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity().valid).toBe(false);
  });

  it("reordering entries breaks linkage", () => {
    for (let i = 0; i < 3; i++) logAudit(entry(i));
    const log = getAuditLog();
    [log[1], log[2]] = [log[2], log[1]];
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity().valid).toBe(false);
  });
});

// Retention rollover is normal; head deletion is not. The two look identical in
// the array, so they are told apart by whether retention actually trimmed.
const simulateRetentionTrim = (dropped: number) => {
  const kept = getAuditLog().slice(dropped);
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(kept));
  localStorage.setItem(`${AUDIT_STORAGE_KEY}_head`, kept[0].prevHash);
  return kept;
};

describe("audit chain — truncation is not tampering", () => {
  it("F6: a genuinely trimmed log reports truncated, not broken", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    simulateRetentionTrim(2);
    expect(verifyAuditIntegrity()).toEqual({ valid: true, brokenAt: null, truncated: true });
  });

  it("a trimmed log still detects tampering inside the retained window", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    const kept = simulateRetentionTrim(2);
    kept[1].details = "tampered";
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(kept));
    expect(verifyAuditIntegrity().valid).toBe(false);
  });

  // Raised in review: deleting the head produced the same state as a rollover,
  // so an attacker could drop the genesis entry and have it read as benign.
  it("deleting the head without any retention trim is reported as tampering", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(getAuditLog().slice(1)));
    expect(verifyAuditIntegrity()).toMatchObject({ valid: false, brokenAt: 0, truncated: false });
  });

  // Raised in review: a trim *counter* only closed the never-trimmed case. Once
  // retention had rolled over even once, any later head deletion looked like more
  // of the same rollover.
  it("deleting the head AFTER a legitimate rollover is still tampering", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    simulateRetentionTrim(1);
    expect(verifyAuditIntegrity()).toMatchObject({ valid: true, truncated: true });

    // attacker removes the current retained head
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(getAuditLog().slice(1)));
    expect(verifyAuditIntegrity()).toMatchObject({ valid: false, brokenAt: 0 });
  });

  it("real retention trimming keeps the chain verifying across repeated rollovers", () => {
    for (let i = 0; i < 6; i++) logAudit(entry(i));
    simulateRetentionTrim(1);
    simulateRetentionTrim(2);
    expect(verifyAuditIntegrity()).toMatchObject({ valid: true, truncated: true });
  });

  it("never reports truncated alongside a failure", () => {
    for (let i = 0; i < 3; i++) logAudit(entry(i));
    const log = getAuditLog();
    log[0].prevHash = "f".repeat(64);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    const r = verifyAuditIntegrity();
    expect(r.valid).toBe(false);
    expect(r.truncated).toBe(false);
  });
});

describe("audit chain — malformed storage", () => {
  it("reports a malformed entry instead of throwing", () => {
    logAudit(entry(0));
    const log: unknown[] = getAuditLog();
    log.push(null);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(() => verifyAuditIntegrity()).not.toThrow();
    expect(verifyAuditIntegrity()).toMatchObject({ valid: false, brokenAt: 1 });
  });

  it("reports an entry missing its hash fields", () => {
    logAudit(entry(0));
    const log: unknown[] = getAuditLog();
    log.push({ id: "x", actor: "y" });
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity()).toMatchObject({ valid: false, brokenAt: 1 });
  });

  // Raised in review: the guard checked only hash/prevHash, so a record missing a
  // hashed field reached the digest and failed for the wrong reason.
  it.each(["actor", "timestamp", "details", "userAgent", "severity"])(
    "reports a record whose %s is not a string",
    (field) => {
      logAudit(entry(0));
      logAudit(entry(1));
      const log = getAuditLog() as unknown as Record<string, unknown>[];
      delete log[1][field];
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
      expect(verifyAuditIntegrity()).toMatchObject({ valid: false, brokenAt: 1 });
    },
  );

  it("survives a non-array payload", () => {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify({ not: "an array" }));
    expect(verifyAuditIntegrity()).toEqual({ valid: true, brokenAt: null, truncated: false });
  });
});

describe("audit log — administrative controls", () => {
  it("F4: a non-admin cannot clear the log", () => {
    logAudit(entry(0));
    const r = clearAuditLog("agent");
    expect(r.success).toBe(false);
    expect(getAuditLog()).toHaveLength(1);
  });

  it("F4: clearing is itself recorded, so the erasure is not silent", () => {
    logAudit(entry(0));
    expect(clearAuditLog("admin").success).toBe(true);
    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].action).toBe("audit_log_cleared");
    expect(verifyAuditIntegrity().valid).toBe(true);
  });
});

describe("audit log — CSV export", () => {
  it("escapes embedded quotes and commas so rows cannot be forged", () => {
    logAudit({ ...entry(0), details: 'has "quotes", and a comma' });
    const csv = exportAuditCSV();
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('""quotes""');
  });

  it("neutralizes spreadsheet formula injection in exported fields", () => {
    logAudit({ ...entry(0), actor: "=cmd|'/c calc'!A1" });
    const csv = exportAuditCSV();
    expect(csv).not.toMatch(/,"=cmd/);
  });
});

describe("audit chain — truncation cannot be forged", () => {
  // Raised in review: truncation is inferred from log[0].prevHash !== GENESIS,
  // so does corrupting the head's prevHash get waved through as a benign
  // retention rollover? prevHash is part of the hashed payload, so it should not.
  it("corrupting the head entry's prevHash is tampering, not truncation", () => {
    for (let i = 0; i < 3; i++) logAudit(entry(i));
    const log = getAuditLog();
    log[0].prevHash = "f".repeat(64);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity()).toMatchObject({ valid: false, brokenAt: 0 });
  });

  it("a plausible-looking genesis substitute is still tampering", () => {
    for (let i = 0; i < 3; i++) logAudit(entry(i));
    const log = getAuditLog();
    log[0].prevHash = "0".repeat(63) + "1"; // near-genesis, one nibble off
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity().valid).toBe(false);
  });

  it("a genuine rollover with an intact head verifies as truncated", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    const kept = getAuditLog().slice(2);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(kept));
    localStorage.setItem(`${AUDIT_STORAGE_KEY}_head`, kept[0].prevHash);
    expect(verifyAuditIntegrity()).toMatchObject({ valid: true, truncated: true });
  });
});
