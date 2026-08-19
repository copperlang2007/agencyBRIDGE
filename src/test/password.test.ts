import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, verifyPasswordOrDecoy } from "../../api/_lib/password";

/**
 * Password hashing.
 *
 * Slow by design: each case below runs scrypt at the deployed cost (~0.5s), so
 * this file is deliberately small and covers only properties that would be
 * security defects if they broke.
 */
describe("hashPassword / verifyPassword", () => {
  it("accepts the correct password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery stapl", hash)).resolves.toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const [a, b] = await Promise.all([hashPassword("same-password"), hashPassword("same-password")]);
    expect(a).not.toBe(b);
    // Both must still verify — a salt that broke verification would be worse
    // than no salt.
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("records its cost parameters in the hash", async () => {
    const hash = await hashPassword("x");
    const [scheme, n, r, p] = hash.split("$");
    expect(scheme).toBe("scrypt");
    // OWASP's recommended scrypt configuration.
    expect(Number(n)).toBe(131072);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
  });

  it("verifies against the parameters in the hash, not the current constants", async () => {
    // Raising the cost later must not lock out existing accounts, so a hash
    // written at a lower cost still has to verify.
    const hash = await hashPassword("legacy-password");
    const [, , r, p, salt, key] = hash.split("$");
    const cheaper = ["scrypt", 16384, r, p, salt, key].join("$");
    // The key no longer matches at the lower cost, but the point is that it is
    // read and used rather than ignored: verification must return false, not
    // throw, and must not silently succeed.
    await expect(verifyPassword("legacy-password", cheaper)).resolves.toBe(false);
  });

  it("rejects a null or absent hash", async () => {
    await expect(verifyPassword("anything", null)).resolves.toBe(false);
    await expect(verifyPassword("anything", undefined)).resolves.toBe(false);
    await expect(verifyPassword("anything", "")).resolves.toBe(false);
  });

  it("rejects a malformed hash instead of throwing", async () => {
    for (const bad of ["nonsense", "scrypt$$$$", "bcrypt$1$2$3$4$5", "scrypt$a$b$c$d$e", "scrypt$16384$8$1$only-five"]) {
      await expect(verifyPassword("anything", bad), bad).resolves.toBe(false);
    }
  });

  it("refuses parameters that would exhaust memory", async () => {
    // A tampered row must not turn a login into a memory bomb.
    const hash = await hashPassword("x");
    const [, , r, p, salt, key] = hash.split("$");
    const absurd = ["scrypt", 2 ** 30, r, p, salt, key].join("$");
    await expect(verifyPassword("x", absurd)).resolves.toBe(false);
  });

  it("normalises unicode so the same typed password verifies", async () => {
    // "é" composed vs decomposed: the same characters to the person typing.
    const composed = "café-password";
    const decomposed = "café-password";
    const hash = await hashPassword(composed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });
});

describe("verifyPasswordOrDecoy", () => {
  it("returns false when there is no stored hash", async () => {
    await expect(verifyPasswordOrDecoy("anything", null)).resolves.toBe(false);
  });

  it("still verifies a real hash correctly", async () => {
    const hash = await hashPassword("real-password");
    await expect(verifyPasswordOrDecoy("real-password", hash)).resolves.toBe(true);
    await expect(verifyPasswordOrDecoy("wrong-password", hash)).resolves.toBe(false);
  });

  it("does one derivation on the decoy path, like the real one", async () => {
    // The property that keeps "no such account" from being distinguishable by
    // timing. Measured as a ratio rather than an absolute, because absolute
    // timings vary far too much between machines to assert on.
    const hash = await hashPassword("real-password");

    const t0 = performance.now();
    await verifyPasswordOrDecoy("wrong-password", hash);
    const known = performance.now() - t0;

    const t1 = performance.now();
    await verifyPasswordOrDecoy("wrong-password", null);
    const unknown = performance.now() - t1;

    // A decoy built by hashing would cost two derivations and fail this. The
    // bound is loose because CI machines are noisy; the defect it catches is a
    // 2x difference, not a 20% one.
    expect(unknown).toBeLessThan(known * 1.75);
    expect(unknown).toBeGreaterThan(known * 0.4);
  });
});
