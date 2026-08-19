import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query, queryOne } from "./db.js";
import type { RoleId } from "../../src/lib/permissions.js";

export const SESSION_COOKIE = "ab_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * The caller as the server sees them.
 *
 * `role`, `name`, `email` and `agentId` are the *effective* identity — the
 * impersonated user when impersonating, the account holder otherwise — because
 * every authorization and scoping decision must key on who the session is
 * acting as. The `real*` fields keep the account holder available for the audit
 * trail and the "you are impersonating" banner, so the two can never be
 * confused for one another.
 */
export interface SessionUser {
  userId: string;
  sessionId: string;
  tenantId: string;
  tenantSlug: string;
  isDemo: boolean;
  email: string;
  name: string;
  role: RoleId;
  agentId: string | null;
  realUserId: string;
  realName: string;
  realRole: RoleId;
  isImpersonating: boolean;
}

/**
 * Only the digest of a session token is stored. A dump of `sessions` therefore
 * yields no usable cookie — the same reason password hashes are not reversible.
 */
function digest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(
  userId: string,
  ip: string,
  ua: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await query(
    `insert into sessions (user_id, token_hash, expires_at, ip, user_agent)
     values ($1, $2, $3, $4, $5)`,
    [userId, digest(token), expiresAt.toISOString(), ip, ua],
  );
  return { token, expiresAt };
}

export async function revokeSession(token: string): Promise<void> {
  await query(`update sessions set revoked_at = now() where token_hash = $1 and revoked_at is null`, [
    digest(token),
  ]);
}

export function readCookie(req: VercelRequest, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function cookieAttributes(maxAgeSeconds: number): string {
  const attrs = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  // Secure would make the cookie unusable over plain-HTTP localhost, so it is
  // set everywhere except local development.
  if (process.env.NODE_ENV !== "development") attrs.push("Secure");
  return attrs.join("; ");
}

export function setSessionCookie(res: VercelResponse, token: string): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieAttributes(Math.floor(SESSION_TTL_MS / 1000))}`,
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; ${cookieAttributes(0)}`);
}

interface SessionRow {
  session_id: string;
  user_id: string;
  tenant_id: string;
  tenant_slug: string;
  is_demo: boolean;
  email: string;
  name: string;
  role: RoleId;
  agent_id: string | null;
  token_hash: string;
  imp_user_id: string | null;
  imp_email: string | null;
  imp_name: string | null;
  imp_role: RoleId | null;
  imp_agent_id: string | null;
}

/**
 * Resolves the caller from their cookie, or null when there is no live session.
 * Expiry and revocation are filtered in SQL so a stale row can never authorise.
 */
export async function currentSession(req: VercelRequest): Promise<SessionUser | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;

  const expected = digest(token);
  const row = await queryOne<SessionRow>(
    `select s.id  as session_id,
            s.token_hash,
            u.id   as user_id,
            u.tenant_id,
            t.slug as tenant_slug,
            t.is_demo,
            u.email, u.name, u.role, u.agent_id,
            imp.id       as imp_user_id,
            imp.email    as imp_email,
            imp.name     as imp_name,
            imp.role     as imp_role,
            imp.agent_id as imp_agent_id
       from sessions s
       join users   u on u.id = s.user_id
       join tenants t on t.id = u.tenant_id
       -- Joined on the tenant as well as the id: an impersonation row that
       -- somehow pointed at another tenant's user must not resolve, or
       -- impersonation would become a cross-tenant read.
       left join users imp on imp.id = s.impersonated_user_id
                          and imp.tenant_id = u.tenant_id
                          and imp.status = 'active'
      where s.token_hash = $1
        and s.revoked_at is null
        and s.expires_at > now()
        and u.status = 'active'`,
    [expected],
  );
  if (!row) return null;

  // The lookup already matched on the digest; comparing again in constant time
  // keeps the token comparison itself free of a timing signal.
  const a = Buffer.from(row.token_hash, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const impersonating = row.imp_user_id !== null && row.imp_role !== null;

  return {
    userId: impersonating ? row.imp_user_id! : row.user_id,
    sessionId: row.session_id,
    tenantId: row.tenant_id,
    tenantSlug: row.tenant_slug,
    isDemo: row.is_demo,
    email: impersonating ? row.imp_email! : row.email,
    name: impersonating ? row.imp_name! : row.name,
    role: impersonating ? row.imp_role! : row.role,
    agentId: impersonating ? row.imp_agent_id : row.agent_id,
    realUserId: row.user_id,
    realName: row.name,
    realRole: row.role,
    isImpersonating: impersonating,
  };
}

/** Points a live session at another user in the same tenant, or clears it. */
export async function setImpersonation(sessionId: string, targetUserId: string | null): Promise<void> {
  await query(`update sessions set impersonated_user_id = $2 where id = $1`, [sessionId, targetUserId]);
}
