// Asserts vercel.json actually routes deep links to the SPA shell.
//
// A missing or too-narrow rewrite is a production-only failure: the build is
// green, the homepage works, and every shared link 404s. Checking only that some
// rewrite points at /index.html is not enough — a rule whose source matches
// nothing would satisfy that while deep links still break. So the source pattern
// is exercised against real paths.

import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const rewrite = (config.rewrites ?? []).find((r) => r.destination === "/index.html");

if (!rewrite) {
  console.error("FAIL: vercel.json has no rewrite whose destination is /index.html");
  process.exit(1);
}

let pattern;
try {
  pattern = new RegExp(`^${rewrite.source}$`);
} catch (err) {
  console.error(`FAIL: rewrite source is not a usable pattern: ${rewrite.source}\n${err.message}`);
  process.exit(1);
}

// Deep links must fall through to the shell.
const mustMatch = ["/login", "/clients", "/reconciliation", "/agents/agt-1", "/a/b/c"];
// Nothing under /assets/ may: a missing asset should 404, not return HTML that
// the browser then rejects on MIME type. Lazy route chunks and non-JS assets are
// listed explicitly, so a rule narrowed to just the entry bundle fails here.
// API routes must not fall through either: Vercel serves api/*.ts as functions,
// and a rewrite that swallowed them would return the HTML shell to every fetch.
// The app would then fail at runtime with a JSON parse error on "<!doctype", in
// production only, with a green build behind it.
const mustNotMatch = [
  "/api/auth/login",
  "/api/auth/me",
  "/api/book/clients",
  "/api/audit/verify",
  "/assets/index-abc123.js",
  "/assets/Dashboard-9f8e7d.js",        // lazy route chunk
  "/assets/ReconciliationPage-0a1b2c.js",
  "/assets/style-def456.css",
  "/assets/logo-112233.svg",
  "/assets/font-445566.woff2",
  "/assets/nested/deep-778899.js",
];

const failures = [
  ...mustMatch.filter((p) => !pattern.test(p)).map((p) => `should rewrite but does not: ${p}`),
  ...mustNotMatch.filter((p) => pattern.test(p)).map((p) => `should NOT rewrite but does: ${p}`),
];

if (failures.length) {
  console.error(`FAIL: rewrite source ${rewrite.source}\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}

console.log(`SPA rewrite OK: ${rewrite.source} -> ${rewrite.destination}`);
console.log(`  rewrites: ${mustMatch.join(", ")}`);
console.log(`  passes through: ${mustNotMatch.join(", ")}`);
