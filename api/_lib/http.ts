import type { VercelRequest, VercelResponse } from "@vercel/node";

export const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

/**
 * An error carrying the status the client should see. Handlers throw these and
 * the wrapper turns them into a response, so no handler has to remember to
 * `return` after writing an error.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg: string) => new HttpError(400, "bad_request", msg);
export const unauthorized = (msg = "Sign in to continue.") => new HttpError(401, "unauthorized", msg);
export const forbidden = (msg = "Your role does not permit that.") => new HttpError(403, "forbidden", msg);
export const notFound = (msg = "Not found.") => new HttpError(404, "not_found", msg);
export const tooManyRequests = (msg: string) => new HttpError(429, "too_many_requests", msg);

export function send(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).setHeader("Content-Type", JSON_HEADERS["Content-Type"]);
  // Responses are per-session; a shared cache must never serve one user's rows
  // to another.
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void>;

/**
 * Wraps a handler so thrown HttpErrors become JSON responses and anything else
 * becomes a 500 without leaking a stack trace to the client.
 */
export function withErrors(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        send(res, err.status, { error: err.code, message: err.message });
        return;
      }
      console.error("unhandled API error", err);
      send(res, 500, { error: "internal_error", message: "Something went wrong on our end." });
    }
  };
}

/** Rejects any method not in `allowed`, so a GET-only route cannot be POSTed. */
export function requireMethod(req: VercelRequest, allowed: string[]): string {
  const method = (req.method ?? "GET").toUpperCase();
  if (!allowed.includes(method)) {
    throw new HttpError(405, "method_not_allowed", `${method} is not allowed here.`);
  }
  return method;
}

/** Reads a JSON body defensively: Vercel may hand back a string or an object. */
export function jsonBody(req: VercelRequest): Record<string, unknown> {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) return raw as Record<string, unknown>;
  const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
  if (text.trim() === "") return {};
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}

/** Reads a required, non-empty string field from a body. */
export function requireString(body: Record<string, unknown>, field: string, max = 512): string {
  const value = body[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw badRequest(`"${field}" is required.`);
  }
  if (value.length > max) {
    throw badRequest(`"${field}" is too long.`);
  }
  return value;
}

/**
 * The caller's IP, taken from the proxy header Vercel sets.
 *
 * `x-forwarded-for` accumulates hops, and only the last entry is written by
 * infrastructure we control — earlier entries are attacker-supplied. Since
 * this value feeds login throttling, taking the first entry would let a caller
 * spoof a fresh identity per request and never be throttled.
 */
export function clientIp(req: VercelRequest): string {
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim() !== "") return real.trim();

  const fwd = req.headers["x-forwarded-for"];
  const list = Array.isArray(fwd) ? fwd.join(",") : fwd;
  if (typeof list === "string" && list.trim() !== "") {
    const hops = list.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export function userAgent(req: VercelRequest): string {
  const ua = req.headers["user-agent"];
  return (typeof ua === "string" ? ua : "").slice(0, 400) || "unknown";
}
