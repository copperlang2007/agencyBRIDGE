import { describe, it, expect } from "vitest";
import { detailsWithSuffix, prepareClientEntries } from "../../api/_lib/audit.js";

/**
 * Server-side validation of client-submitted audit entries.
 *
 * These two are the pure part of `appendClientEntries`, split out so they can
 * be tested without a database — the handler layer around them still cannot be
 * (R-005). Both defects below were real: one silently dropped the record of who
 * was actually acting, the other committed half a batch and reported failure.
 */

describe("detailsWithSuffix", () => {
  const suffix = " (acting as Daniel Reyes, agent)";

  it("keeps the impersonation suffix when details fill the field", () => {
    // The regression: details and suffix were concatenated and then clamped to
    // 500, so a caller supplying 500 characters pushed the suffix off the end.
    // The entry then read as though the impersonated user had acted alone,
    // which is the one fact the suffix exists to prevent losing.
    const result = detailsWithSuffix("x".repeat(500), suffix);
    expect(result.endsWith(suffix)).toBe(true);
  });

  it("never exceeds the column width", () => {
    expect(detailsWithSuffix("x".repeat(5000), suffix)).toHaveLength(500);
  });

  it("leaves short details untouched", () => {
    expect(detailsWithSuffix("opened record", suffix)).toBe("opened record" + suffix);
  });

  it("keeps the suffix even when it alone would overflow", () => {
    const huge = " (acting as " + "y".repeat(600) + ")";
    expect(detailsWithSuffix("details", huge)).toHaveLength(500);
  });
});

describe("prepareClientEntries", () => {
  const ok = { action: "A", category: "client", entity: "e", entityId: "1", severity: "info", details: "d" };

  it("accepts a valid batch", () => {
    const prepared = prepareClientEntries([ok, ok], "");
    expect(prepared).toHaveLength(2);
    expect(prepared[0].category).toBe("client");
  });

  it("rejects the batch before anything is written when a later entry is invalid", () => {
    // Validation and insertion were interleaved, so entry 1 committed and entry
    // 2 answered 400 — and the client drops a 400 batch, so the rest were lost.
    // Preparing the whole batch first is what makes that impossible: this
    // throws before `appendClientEntries` reaches its append loop at all.
    expect(() => prepareClientEntries([ok, { ...ok, category: "not-a-category" }], "")).toThrow(
      /Unknown audit category/,
    );
  });

  it("rejects an unknown severity", () => {
    expect(() => prepareClientEntries([{ ...ok, severity: "catastrophic" }], "")).toThrow(
      /Unknown audit severity/,
    );
  });

  it("rejects a non-object entry", () => {
    expect(() => prepareClientEntries(["not an object"], "")).toThrow(/must be an object/);
  });

  it("rejects a batch over the ceiling", () => {
    expect(() => prepareClientEntries(Array(26).fill(ok), "")).toThrow(/At most 25/);
  });

  it("applies defaults rather than rejecting missing optional fields", () => {
    const [entry] = prepareClientEntries([{ category: "client", entity: "e" }], "");
    expect(entry.action).toBe("UNKNOWN");
    expect(entry.entityId).toBe("-");
    expect(entry.severity).toBe("info");
  });

  it("appends the suffix to every entry's details", () => {
    const prepared = prepareClientEntries([ok, ok], " (acting as X, agent)");
    for (const e of prepared) expect(e.details).toBe("d (acting as X, agent)");
  });
});
