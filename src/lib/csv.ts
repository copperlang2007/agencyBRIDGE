// CSV serialization for exported evidence.
//
// Both the audit log and the short-pay report are downloaded and opened in a
// spreadsheet, and both carry user-controlled fields (carrier names, actor names,
// free-text details). This is the single definition of how a cell is made safe —
// duplicating it per exporter is how the two defenses drift apart.

/**
 * Quote a CSV cell and defuse anything a spreadsheet would evaluate.
 *
 * Excel, Sheets, and LibreOffice treat a leading `=`, `+`, `-`, `@`, tab, or CR as
 * the start of a formula, so a field like `=HYPERLINK("http://evil")` becomes live
 * content in the reader's spreadsheet. Prefixing an apostrophe forces the cell to
 * be read as text; the apostrophe is not displayed.
 */
export function csvCell(value: unknown): string {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Join a grid of values into a CSV document with every cell escaped. */
export function csvRows(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n");
}
