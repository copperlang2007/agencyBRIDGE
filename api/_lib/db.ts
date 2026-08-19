import { neon } from "@neondatabase/serverless";
import { HttpError } from "./http.js";

/**
 * Neon HTTP client.
 *
 * The pooler endpoint is required here: serverless invocations are numerous and
 * short-lived, and a direct endpoint would exhaust Postgres connections.
 */
let cached: ReturnType<typeof neon> | null = null;

export function db() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    // A deployment missing its database credential is a configuration problem,
    // not a bug, and it should say so. Left as a generic 500 the app looks
    // broken and the cause is only visible in the platform logs.
    throw new HttpError(
      503,
      "not_configured",
      "This deployment has no database configured. Set DATABASE_URL in the project's environment variables.",
    );
  }
  if (!url.includes("-pooler.")) {
    // A direct endpoint works fine in development and exhausts Postgres
    // connections under real serverless traffic — which is the worst possible
    // moment to find out. A warning nobody reads is not a control, so this is
    // refused outside local development, where a non-pooler URL is ordinary.
    if (process.env.NODE_ENV === "production") {
      throw new HttpError(
        503,
        "not_configured",
        "DATABASE_URL must point at the Neon pooler endpoint. A direct endpoint exhausts connections under serverless traffic.",
      );
    }
    console.warn("DATABASE_URL is not a pooler endpoint; acceptable locally, refused in production");
  }
  cached = neon(url);
  return cached;
}

/** Runs a parameterised query. Values are always bound, never interpolated. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const sql = db();
  return (await sql(text, params as never[])) as T[];
}

/** Runs a query expected to return at most one row. */
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
