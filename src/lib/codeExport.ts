import JSZip from "jszip";

/**
 * Bundles the application source into a zip and hands it to the browser as a
 * download. Returns the number of source files added so the caller can tell the
 * difference between "exported" and "nothing to export".
 */
export async function exportCodeAsZip(): Promise<number> {
  const zip = new JSZip();

  const globs: Record<string, () => Promise<unknown>>[] = [
    import.meta.glob("/src/**/*.{ts,tsx,css,html}", { query: "?raw", import: "default" }) as Record<string, () => Promise<unknown>>,
    import.meta.glob("/public/**/*", { query: "?raw", import: "default" }) as Record<string, () => Promise<unknown>>,
    // package-lock.json is generated, not source — excluding it keeps ~236 kB of
    // raw text out of the client bundle.
    import.meta.glob(["/*.{ts,js,json,html,css,md}", "!/package-lock.json"], { query: "?raw", import: "default" }) as Record<string, () => Promise<unknown>>,
    // The serverless API and the database scripts. Without these the export is
    // a client with nothing to talk to — it would not run, which makes the zip
    // worse than no zip. db/seed-data.json is excluded on the same grounds as
    // package-lock.json: 52 kB of generated sample rows, regenerable with
    // `npm run db:extract`.
    import.meta.glob("/api/**/*.ts", { query: "?raw", import: "default" }) as Record<string, () => Promise<unknown>>,
    import.meta.glob("/db/*.{sql,mjs}", { query: "?raw", import: "default" }) as Record<string, () => Promise<unknown>>,
    import.meta.glob("/scripts/*.mjs", { query: "?raw", import: "default" }) as Record<string, () => Promise<unknown>>,
  ];

  let fileCount = 0;

  for (const glob of globs) {
    for (const [path, loader] of Object.entries(glob)) {
      try {
        const content = await (loader as () => Promise<string>)();
        const cleanPath = path.replace(/^\//, "");
        zip.file(cleanPath, content);
        fileCount += 1;
      } catch {
        // skip files that can't be loaded
      }
    }
  }

  if (fileCount === 0) return 0;

  zip.file(
    "EXPORT-README.md",
    [
      "# agencyBRIDGE — Source Code Export",
      "",
      `Exported: ${new Date().toISOString()}`,
      "",
      `Contains ${fileCount} files.`,
      "",
      "## Setup",
      "",
      "```bash",
      "npm install",
      "export DATABASE_URL='postgresql://...-pooler.../neondb?sslmode=require'",
      "npm run db:migrate",
      "npm run db:seed",
      "npm run dev:api   # /api functions",
      "npm run dev       # app on :8080",
      "```",
      "",
      "The app needs a Postgres database: authentication, the book of business",
      "and the audit trail are server-side. See README.md for details.",
      "",
      "db/seed-data.json is not included — it is generated. Recreate it with",
      "`npm run db:extract` before seeding.",
      "",
      "## Stack",
      "",
      "React + Vite + TypeScript + Tailwind CSS + shadcn/ui, with Vercel",
      "Serverless Functions and Neon Postgres.",
    ].join("\n")
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agencybridge-source.zip";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return fileCount;
}
