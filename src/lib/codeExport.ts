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
      "npm run dev",
      "```",
      "",
      "## Stack",
      "",
      "React + Vite + TypeScript + Tailwind CSS + shadcn/ui",
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
