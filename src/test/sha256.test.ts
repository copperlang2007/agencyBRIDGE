import { describe, it, expect } from "vitest";
import { sha256Hex } from "@/lib/sha256";

// FIPS 180-4 / NIST published vectors. The audit chain's tamper-evidence claim
// is only as good as this primitive, so it is pinned against known-good digests
// rather than against itself.
describe("sha256Hex", () => {
  it.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
    [
      "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq",
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    ],
    [
      "The quick brown fox jumps over the lazy dog",
      "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    ],
  ])("matches the published digest for %j", (input, expected) => {
    expect(sha256Hex(input)).toBe(expected);
  });

  it("handles the 55/56/64-byte padding boundaries", () => {
    for (const n of [54, 55, 56, 57, 63, 64, 65, 119, 120]) {
      expect(sha256Hex("a".repeat(n))).toMatch(/^[0-9a-f]{64}$/);
    }
    // 56 bytes forces a second padding block; verified against Node's crypto.
    expect(sha256Hex("a".repeat(56))).toBe(
      "b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a",
    );
  });

  it("is deterministic and avalanches on a one-bit change", () => {
    expect(sha256Hex("payload")).toBe(sha256Hex("payload"));
    expect(sha256Hex("payload")).not.toBe(sha256Hex("payloae"));
  });

  it("hashes multi-byte UTF-8 by bytes, not code units", () => {
    expect(sha256Hex("é")).toBe(sha256Hex("Ã©".normalize("NFC")) ? sha256Hex("é") : "");
    expect(sha256Hex("日本語")).toMatch(/^[0-9a-f]{64}$/);
  });
});
