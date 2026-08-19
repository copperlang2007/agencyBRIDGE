/**
 * Runs the /api functions locally.
 *
 * Vercel executes each file under api/ as its own function; `vite dev` serves
 * only static assets and knows nothing about them. Without this, the API could
 * be exercised for the first time in production, which is not a place to
 * discover that a handler throws. It bundles the same TypeScript sources
 * Vercel deploys and dispatches to them with a request/response pair shaped
 * like the one the platform passes.
 *
 *   DATABASE_URL=... node scripts/dev-api.mjs
 */
import { context } from "esbuild";
import { createServer } from "node:http";
import { readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const PORT = Number(process.env.API_PORT || 3101);
const OUT = ".dev-api";

async function entryPoints(dir) {
  const found = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    // `_lib` holds shared modules, not routes; Vercel applies the same rule.
    if (item.isDirectory()) {
      if (item.name.startsWith("_")) continue;
      found.push(...(await entryPoints(full)));
    } else if (item.name.endsWith(".ts") && !item.name.startsWith("_")) {
      found.push(full);
    }
  }
  return found;
}

await rm(OUT, { recursive: true, force: true });
let entries = await entryPoints("api");

let ctx = await context({
  entryPoints: entries,
  outdir: OUT,
  outbase: "api",
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "external",
  sourcemap: "inline",
  logLevel: "error",
});
await ctx.rebuild();

/** Cache-busting import: a rebuilt file must not be served from the module cache. */
let generation = 0;

function routeFor(pathname) {
  const rel = pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const base = rel === "" ? "index" : rel;
  // `/api/audit` resolves to api/audit/index.ts, `/api/auth/login` to the file.
  return [join(OUT, `${base}.js`), join(OUT, base, "index.js")];
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (!url.pathname.startsWith("/api")) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  // Rebuild on every request: this is a dev host, and a stale handler is a
  // worse cost than a few milliseconds. Re-scan too, so a newly added route
  // file is picked up without a restart — an esbuild context has a fixed entry
  // list, and only rebuilding it would silently 404 every new handler.
  const current = await entryPoints("api");
  if (current.length !== entries.length || current.some((e, i) => e !== entries[i])) {
    await ctx.dispose();
    entries = current;
    ctx = await context({
      entryPoints: entries,
      outdir: OUT,
      outbase: "api",
      bundle: true,
      format: "esm",
      platform: "node",
      packages: "external",
      sourcemap: "inline",
      logLevel: "error",
    });
  }
  await ctx.rebuild();
  generation += 1;

  let mod = null;
  for (const candidate of routeFor(url.pathname)) {
    try {
      mod = await import(`${pathToFileURL(candidate).href}?v=${generation}`);
      break;
    } catch (err) {
      if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
    }
  }
  if (!mod?.default) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found", message: `No handler for ${url.pathname}` }));
    return;
  }

  const raw = await readBody(req);
  req.query = Object.fromEntries(url.searchParams.entries());
  req.body = raw.length === 0 ? undefined : raw.toString("utf8");

  // The platform's `res` adds these on top of ServerResponse.
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (value) => {
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(value));
    return res;
  };

  try {
    await mod.default(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "internal_error" }));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`api dev host on http://127.0.0.1:${PORT} (${entries.length} routes)`);
  for (const e of entries) console.log(`  /api/${relative("api", e).replace(/\.ts$/, "").replace(/\/index$/, "")}`);
});
