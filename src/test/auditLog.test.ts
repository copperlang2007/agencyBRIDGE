import { describe, it, expect, beforeEach } from "vitest";
import {
  logAudit,
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

describe("audit chain — truncation is not tampering", () => {
  it("F6: a trimmed log reports truncated, not broken", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    const log = getAuditLog().slice(2); // simulate the retention cap dropping the head
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    const r = verifyAuditIntegrity();
    expect(r.valid).toBe(true);
    expect(r.truncated).toBe(true);
  });

  it("a trimmed log still detects tampering inside the retained window", () => {
    for (let i = 0; i < 5; i++) logAudit(entry(i));
    const log = getAuditLog().slice(2);
    log[1].details = "tampered";
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(log));
    expect(verifyAuditIntegrity().valid).toBe(false);
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
