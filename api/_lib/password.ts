import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing.
 *
 * scrypt from the Node standard library rather than argon2 or bcrypt: both of
 * those are native addons, and a serverless bundle that has to compile or ship
 * platform binaries is a deployment failure waiting for the first cold start on
 * a new runtime. scrypt is memory-hard and needs no build step.
 *
 * Cost is OWASP's recommended scrypt configuration (N=2^17, r=8, p=1), which
 * measures ~470ms per hash on the deploy target. That cost is the feature.
 */
const N = 131072; // 2^17
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;
// scrypt needs roughly 128 * N * r bytes; give it headroom or it throws.
const MAXMEM = 320 * 1024 * 1024;

const PREFIX = "scrypt";

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/** Produces a self-describing hash: `scrypt$N$r$p$salt$key`, both base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt);
  return [PREFIX, N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

/**
 * Verifies a password against a stored hash.
 *
 * Reads the cost parameters back out of the hash rather than assuming the
 * current constants, so raising the cost later does not lock out every
 * existing account.
 */
export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== PREFIX) return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (n < 2 || (n & (n - 1)) !== 0 || r < 1 || p < 1) return false;
  // Refuse absurd parameters from a tampered row rather than letting a
  // crafted hash turn a login into a memory bomb.
  if (128 * n * r * p > MAXMEM) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64url");
    expected = Buffer.from(parts[5], "base64url");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await new Promise<Buffer | null>((resolve) => {
    scrypt(password.normalize("NFKC"), salt, expected.length, { N: n, r, p, maxmem: MAXMEM }, (err, key) => {
      resolve(err ? null : key);
    });
  });
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * A syntactically valid hash that no password matches.
 *
 * Used to keep "no such account" as expensive as "wrong password". Without it,
 * an unknown address returns in microseconds while a known one costs ~470ms,
 * and that gap alone enumerates the user table.
 *
 * The key bytes are random rather than derived: deriving them would run scrypt
 * here as well, so the unknown-account path would cost *two* derivations to a
 * real account's one — measured at ~1130ms against ~665ms, a wider and more
 * reliable signal than the gap it was meant to close. Random bytes cost
 * nothing to produce and leave verification with exactly one derivation on
 * both paths, which is the property that matters.
 */
const DECOY_HASH = [
  PREFIX,
  N,
  R,
  P,
  randomBytes(SALT_BYTES).toString("base64url"),
  randomBytes(KEYLEN).toString("base64url"),
].join("$");

/**
 * Verifies against a stored hash, or burns the same work against a decoy when
 * there is no stored hash to check. Always returns false in the decoy case.
 */
export async function verifyPasswordOrDecoy(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (stored) return verifyPassword(password, stored);
  await verifyPassword(password, DECOY_HASH);
  return false;
}
