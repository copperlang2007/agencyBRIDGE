import type { VercelRequest, VercelResponse } from "@vercel/node";
import { query, queryOne } from "../_lib/db.js";
import {
  clientIp,
  jsonBody,
  requireMethod,
  requireString,
  send,
  tooManyRequests,
  unauthorized,
  userAgent,
  withErrors,
} from "../_lib/http.js";
import { requireSameOrigin } from "../_lib/auth.js";
import { verifyPasswordOrDecoy } from "../_lib/password.js";
import { createSession, setSessionCookie } from "../_lib/session.js";
import { tryAppendAudit } from "../_lib/audit.js";
import type { RoleId } from "../../src/lib/permissions.js";

/** Throttle window and ceilings. Deliberately strict: this endpoint is public. */
const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_EMAIL = 8;
const MAX_FAILURES_PER_IP = 30;

interface UserRow {
  id: string;
  tenant_id: string;
  is_demo: boolean;
  email: string;
  name: string;
  role: RoleId;
  password_hash: string | null;
  agent_id: string | null;
}

async function assertNotThrottled(emailLower: string, ip: string): Promise<void> {
  const row = await queryOne<{ by_email: string; by_ip: string }>(
    `select
       count(*) filter (where email_lower = $1) as by_email,
       count(*) filter (where ip = $2)          as by_ip
     from login_attempts
     where succeeded = false
       and at > now() - make_interval(mins => $3::int)`,
    [emailLower, ip, WINDOW_MINUTES],
  );
  const byEmail = Number(row?.by_email ?? 0);
  const byIp = Number(row?.by_ip ?? 0);
  if (byEmail >= MAX_FAILURES_PER_EMAIL || byIp >= MAX_FAILURES_PER_IP) {
    throw tooManyRequests(
      `Too many failed sign-in attempts. Try again in ${WINDOW_MINUTES} minutes.`,
    );
  }
}

async function record(emailLower: string, ip: string, succeeded: boolean): Promise<void> {
  await query(`insert into login_attempts (email_lower, ip, succeeded) values ($1, $2, $3)`, [
    emailLower,
    ip,
    succeeded,
  ]);
}

export default withErrors(async (req: VercelRequest, res: VercelResponse) => {
  requireMethod(req, ["POST"]);
  requireSameOrigin(req);

  const body = jsonBody(req);
  const email = requireString(body, "email", 320);
  const password = requireString(body, "password", 1024);
  const emailLower = email.trim().toLowerCase();
  const ip = clientIp(req);
  const ua = userAgent(req);

  await assertNotThrottled(emailLower, ip);

  const user = await queryOne<UserRow>(
    `select u.id, u.tenant_id, t.is_demo, u.email, u.name, u.role, u.password_hash, u.agent_id
       from users u
       join tenants t on t.id = u.tenant_id
      where lower(u.email) = $1 and u.status = 'active'`,
    [emailLower],
  );

  // The same message and the same work for "no such account" and "wrong
  // password": distinguishing them turns this endpoint into an account
  // enumeration oracle, and returning early on an unknown address would leak
  // the same fact through response timing.
  const ok = await verifyPasswordOrDecoy(password, user?.password_hash ?? null);

  if (!user || !ok) {
    await record(emailLower, ip, false);
    throw unauthorized("Email or password is incorrect.");
  }

  await record(emailLower, ip, true);
  const { token } = await createSession(user.id, ip, ua);
  setSessionCookie(res, token);

  await tryAppendAudit(user.tenant_id, {
    actor: user.name,
    actorId: user.id,
    action: "LOGIN_SUCCESS",
    category: "auth",
    entity: "session",
    entityId: user.id,
    severity: "success",
    details: `${user.email} signed in as ${user.role}`,
    sessionId: user.id,
    ipAddress: ip,
    userAgent: ua,
  });

  send(res, 200, {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    demo: user.is_demo,
  });
});
