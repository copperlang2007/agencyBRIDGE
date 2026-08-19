import { describe, it, expect } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/sha256";

/**
 * Differential test against Node's own SHA-256.
 *
 * The audit chain's tamper-evidence is only as good as this primitive, and the
 * governance evidence (contract/evidence/EV-002) claims it matches a reference
 * implementation. That claim has to be reproducible from the repository, so the
 * comparison runs here rather than in a throwaway script.
 */
const nodeDigest = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");

describe("sha256Hex vs node:crypto", () => {
  const fixed = [
    "",
    "abc",
    "a".repeat(55), // one byte under the single-block padding boundary
    "a".repeat(56), // forces a second padding block
    "a".repeat(57),
    "a".repeat(63),
    "a".repeat(64), // exact block multiple
    "a".repeat(65),
    "The quick brown fox jumps over the lazy dog",
    "é",
    "日本語",
    "🌉 bridge",
    "x".repeat(1000),
  ];

  it.each(fixed)("matches for %j", (input) => {
    expect(sha256Hex(input)).toBe(nodeDigest(input));
  });

  it("matches across 500 random inputs of varying length", () => {
    const mismatches: string[] = [];
    for (let i = 0; i < 500; i++) {
      // Random bytes decoded as UTF-8 exercises multi-byte and lone-surrogate paths.
      const input = randomBytes(1 + (i % 300)).toString("utf8");
      if (sha256Hex(input) !== nodeDigest(input)) mismatches.push(input);
    }
    expect(mismatches).toEqual([]);
  });

  it("matches for every length from 0 to 200 bytes", () => {
    for (let n = 0; n <= 200; n++) {
      const input = "a".repeat(n);
      expect(sha256Hex(input), `length ${n}`).toBe(nodeDigest(input));
    }
  });
});
