import { describe, it, expect } from "vitest";
import { csvCell, csvRows } from "@/lib/csv";

// Shared by the audit-log and short-pay exporters. Both carry user-controlled
// fields into a file that opens in a spreadsheet, so this is the one place the
// injection defense is specified.
describe("csvCell", () => {
  it("quotes every cell and doubles embedded quotes", () => {
    expect(csvCell("plain")).toBe('"plain"');
    expect(csvCell('Ace "Big" Co')).toBe('"Ace ""Big"" Co"');
  });

  it("keeps commas and newlines inside the quoted cell", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it.each(["=cmd|'/c calc'!A1", "+1+1", "-2+3", "@SUM(A1)", "\tlead", "\rlead", "\nlead"])(
    "neutralizes a leading formula trigger: %j",
    (payload) => {
      const out = csvCell(payload);
      expect(out.startsWith(`"'`)).toBe(true);
    },
  );

  it("does not prefix values that merely contain a trigger character", () => {
    expect(csvCell("Blue=Green")).toBe('"Blue=Green"');
    expect(csvCell("A-1")).toBe('"A-1"');
  });

  it("renders null and undefined as an empty cell", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("stringifies non-string values", () => {
    expect(csvCell(42)).toBe('"42"');
    expect(csvCell(false)).toBe('"false"');
  });
});

describe("csvRows", () => {
  it("escapes every cell of the grid", () => {
    expect(csvRows([["a", "b"], ["=evil", 'q"q']])).toBe('"a","b"\n"\'=evil","q""q"');
  });

  it("emits an empty line for an empty row", () => {
    expect(csvRows([["a"], [], ["b"]])).toBe('"a"\n\n"b"');
  });
});
