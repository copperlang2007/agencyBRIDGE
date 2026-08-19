import type { VercelRequest } from "@vercel/node";
import { forbidden, unauthorized, HttpError } from "./http.js";
import { currentSession, type SessionUser } from "./session.js";
import { roleCan, roleHasRoute } from "../../src/lib/permissions.js";

/** Resolves the caller or rejects with 401. */
export async function requireUser(req: VercelRequest): Promise<SessionUser> {
  const session = await currentSession(req);
  if (!session) throw unauthorized();
  return session;
}

/** Resolves the caller and checks one action against the server's tables. */
export async function requireAction(req: VercelRequest, action: string): Promise<SessionUser> {
  const session = await requireUser(req);
  if (!roleCan(session.role, action)) {
    throw forbidden(`Your role (${session.role}) may not perform "${action}".`);
  }
  return session;
}

/** Resolves the caller and checks route access. */
export async function requireRoute(req: VercelRequest, route: string): Promise<SessionUser> {
  const session = await requireUser(req);
  if (!roleHasRoute(session.role, route)) {
    throw forbidden(`Your role (${session.role}) may not view ${route}.`);
  }
  return session;
}

/**
 * Refuses a write on a demo tenant.
 *
 * The public deployment runs against the demo tenant, so this is what makes
 * "read-only demo" a property of the server rather than a promise made by the
 * UI. Every mutating handler calls it before touching a row.
 */
export function requireWritable(session: SessionUser): void {
  if (session.isDemo) {
    throw new HttpError(
      403,
      "demo_read_only",
      "This is the read-only demo. Changes are disabled here so the sample book stays consistent for everyone.",
    );
  }
}

/**
 * Rejects cross-site mutations.
 *
 * SameSite=Lax already stops the browser attaching the session cookie to a
 * cross-site POST, so this is defence in depth for clients or future cookie
 * settings where that guarantee does not hold.
 */
export function requireSameOrigin(req: VercelRequest): void {
  const method = (req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = req.headers.origin;
  if (typeof origin !== "string" || origin === "") {
    // Same-origin fetch from a browser always sets Origin on a mutation; a
    // missing header means a non-browser client, which has no cookie to abuse.
    return;
  }
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  const hostname = Array.isArray(host) ? host[0] : host;
  if (!hostname) return;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Request origin is not valid.");
  }
  if (originHost !== hostname) {
    throw forbidden("Cross-site requests are not accepted.");
  }
}
