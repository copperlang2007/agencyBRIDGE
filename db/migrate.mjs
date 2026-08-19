/**
 * Applies db/schema.sql then db/constraints.sql.
 *
 *   DATABASE_URL=... node db/migrate.mjs
 *
 * Both files are written to be re-runnable: the schema uses `if not exists`,
 * and a constraint that is already present is reported and skipped rather than
 * failing the run. Anything else stops the migration — a genuine error should
 * not be swallowed by the same tolerance that makes re-running safe.
 */
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

/** Splits on statement-terminating semicolons and drops comment-only chunks. */
function statements(text) {
  return text
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !s.split("\n").every((line) => line.trim() === "" || line.trim().startsWith("--")));
}

/** Postgres error codes that mean "this was already applied". */
const ALREADY_APPLIED = new Set([
  "42710", // duplicate_object — constraint/index already exists
  "42P07", // duplicate_table
  "42701", // duplicate_column
]);

let applied = 0;
let skipped = 0;

for (const file of ["db/schema.sql", "db/constraints.sql"]) {
  const text = await readFile(file, "utf8");
  for (const statement of statements(text)) {
    try {
      await sql(statement);
      applied += 1;
    } catch (err) {
      const code = err?.code ?? err?.sourceError?.code;
      if (ALREADY_APPLIED.has(code)) {
        skipped += 1;
        continue;
      }
      console.error(`\nFailed on:\n${statement}\n`);
      throw err;
    }
  }
  console.log(`${file}: done`);
}

console.log(`${applied} statement(s) applied, ${skipped} already in place`);
