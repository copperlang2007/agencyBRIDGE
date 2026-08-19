import { describe, it, expect } from "vitest";
import {
  toCents,
  parseCurrency,
  classifyVariance,
  analyzeCommissions,
  buildShortPayCSV,
  type CommissionRowInput,
} from "@/lib/shortPayDetector";

const row = (o: Partial<CommissionRowInput> = {}): CommissionRowInput => ({
  carrier: "Humana",
  planType: "MAPD",
  expected: "450.00",
  paid: "450.00",
  ...o,
});

describe("parseCurrency", () => {
  it("reads plain and formatted amounts", () => {
    expect(parseCurrency("450").value).toBe(450);
    expect(parseCurrency("450.00").value).toBe(450);
    expect(parseCurrency("$1,234.56").value).toBe(1234.56);
    expect(parseCurrency("  $450.00  ").value).toBe(450);
  });

  it("G1: preserves a leading minus — a chargeback is not a payment", () => {
    expect(parseCurrency("-450.00").value).toBe(-450);
    expect(parseCurrency("-$450.00").value).toBe(-450);
  });

  it("G1: reads accounting-style parentheses as negative", () => {
    expect(parseCurrency("(450.00)").value).toBe(-450);
    expect(parseCurrency("($1,200.50)").value).toBe(-1200.5);
  });

  it("G3: a blank field is a valid zero, not a missing row", () => {
    expect(parseCurrency("")).toEqual({ value: 0, valid: true });
    expect(parseCurrency("   ")).toEqual({ value: 0, valid: true });
  });

  // Raised in review: rounding a third decimal place erases a real difference,
  // and an astronomically large amount overflows the cent conversion.
  it("rejects amounts with more than two real decimal places", () => {
    for (const bad of ["450.004", "450.001", "1.234", "0.005"]) {
      expect(parseCurrency(bad).valid, bad).toBe(false);
    }
  });

  it("accepts trailing-zero padding beyond two decimals", () => {
    expect(parseCurrency("450.000")).toEqual({ value: 450, valid: true });
    expect(parseCurrency("450.5000").value).toBe(450.5);
  });

  it("rejects amounts too large for exact cent arithmetic", () => {
    expect(parseCurrency("1e308").valid).toBe(false); // not a currency literal anyway
    expect(parseCurrency("999999999999999999").valid).toBe(false);
    expect(parseCurrency("1000000.00").valid).toBe(true);
  });

  // Raised in review: a magnitude bound alone is not enough. At the top of the
  // safe-integer range Number("...409.90") and Number("...409.91") are the same
  // double, so two amounts a cent apart parsed identically.
  it("rejects amounts whose cents cannot survive the float conversion", () => {
    // ...409.90 and ...409.91 are the same double, so at most one of them can be
    // accepted — otherwise two amounts a cent apart would compare equal.
    const a = parseCurrency("90071992547409.90");
    const b = parseCurrency("90071992547409.91");
    expect(a.valid && b.valid).toBe(false);

    // Whichever survives must carry its exact cents.
    for (const [raw, r] of [["90071992547409.90", a], ["90071992547409.91", b]] as const) {
      if (!r.valid) continue;
      const [w, f] = raw.split(".");
      expect(Math.round(r.value * 100), raw).toBe(Number(`${w}${f}`));
    }
  });

  it("no two accepted amounts a cent apart ever parse equal", () => {
    for (const base of ["0", "9", "999", "1234567", "90071992547409"]) {
      const a = parseCurrency(`${base}.00`);
      const b = parseCurrency(`${base}.01`);
      if (a.valid && b.valid) {
        expect(a.value, `${base} pair`).not.toBe(b.value);
        expect(Math.round(a.value * 100)).not.toBe(Math.round(b.value * 100));
      }
    }
  });

  it("every accepted amount round-trips to its exact cents", () => {
    const samples = [
      "0", "0.01", "0.99", "1", "1.005".slice(0, 4), "19.99", "450.00", "1234.56",
      "999999.99", "1000000.00", "12345678.90", "1000000000.01",
    ];
    for (const s of samples) {
      const r = parseCurrency(s);
      if (!r.valid) continue;
      const [w, f = ""] = s.replace(/,/g, "").split(".");
      const expected = Number(`${w || "0"}${f.slice(0, 2).padEnd(2, "0")}`);
      expect(Math.round(r.value * 100), s).toBe(expected);
    }
  });

  it("keeps a one-cent difference detectable at every accepted magnitude", () => {
    for (const base of ["1", "999", "19999", "1234567", "1000000000"]) {
      const a = parseCurrency(`${base}.00`);
      const b = parseCurrency(`${base}.01`);
      expect(a.valid && b.valid, base).toBe(true);
      expect(classifyVariance(b.value, a.value), base).toBe("short_pay");
    }
  });

  it("G2: unparseable input is reported invalid rather than silently zeroed", () => {
    for (const bad of ["abc", "4.5.6", "12-34", "$", ".", "1,2,3.4.5"]) {
      expect(parseCurrency(bad).valid, bad).toBe(false);
    }
  });
});

describe("classifyVariance", () => {
  it("classifies under/over/exact", () => {
    expect(classifyVariance(450, 400)).toBe("short_pay");
    expect(classifyVariance(450, 500)).toBe("over_pay");
    expect(classifyVariance(450, 450)).toBe("paid_on_time");
  });

  it("treats sub-cent float drift as paid on time", () => {
    expect(classifyVariance(0.1 + 0.2, 0.3)).toBe("paid_on_time");
  });

  // Raised in review: a float epsilon mis-sorts an exact one-cent shortfall,
  // because 449.99 - 450.00 is -0.009999999999990905, which is < 0.01.
  it("catches an exact one-cent short pay at magnitudes where floats drift", () => {
    for (const [expected, paid] of [
      [450.0, 449.99],
      [1000.01, 1000.0],
      [100.1, 100.09],
      [19.99, 19.98],
      [8.07, 8.06],
    ] as const) {
      expect(classifyVariance(expected, paid), `${expected}/${paid}`).toBe("short_pay");
    }
  });

  it("catches an exact one-cent overpayment just as reliably", () => {
    expect(classifyVariance(449.99, 450.0)).toBe("over_pay");
    expect(classifyVariance(1000.0, 1000.01)).toBe("over_pay");
  });
});

describe("analyzeCommissions", () => {
  it("ignores the empty rows the form starts with", () => {
    const r = analyzeCommissions([
      { carrier: "", planType: "MAPD", expected: "", paid: "" },
      { carrier: "", planType: "MAPD", expected: "", paid: "" },
    ]);
    expect(r.events).toHaveLength(0);
    expect(r.urgency).toBe("normal");
  });

  it("G3: a blank payment is analyzed as $0 received, not dropped", () => {
    const r = analyzeCommissions([row({ expected: "450.00", paid: "" })]);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].paid).toBe(0);
    expect(r.events[0].classification).toBe("short_pay");
    expect(r.variance).toBe(-450);
  });

  it("G1: a chargeback row is a short pay, not a clean payment", () => {
    const r = analyzeCommissions([row({ expected: "450.00", paid: "-450.00" })]);
    expect(r.events[0].paid).toBe(-450);
    expect(r.events[0].classification).toBe("short_pay");
    expect(r.events[0].variance).toBe(-900);
    expect(r.urgency).toBe("critical");
    expect(r.recommendations.join(" ")).toMatch(/chargeback or reversal/i);
  });

  it("G2: an unreadable amount is excluded and surfaced, not scored as zero", () => {
    const r = analyzeCommissions([row(), row({ expected: "four hundred", paid: "450" })]);
    expect(r.events).toHaveLength(1);
    expect(r.invalidRows).toEqual([2]);
    expect(r.recommendations.join(" ")).toMatch(/Row\(s\) 2 could not be read/);
  });

  it("totals and percentage variance across carriers", () => {
    const r = analyzeCommissions([
      row({ carrier: "Humana", expected: "1000", paid: "900" }),
      row({ carrier: "Aetna", expected: "1000", paid: "1000" }),
    ]);
    expect(r.totalExpected).toBe(2000);
    expect(r.totalPaid).toBe(1900);
    expect(r.variance).toBe(-100);
    expect(r.variancePct).toBeCloseTo(-5, 5);
  });

  it("does not divide by a zero expectation", () => {
    const r = analyzeCommissions([row({ expected: "0", paid: "100" })]);
    expect(Number.isFinite(r.variancePct)).toBe(true);
    expect(r.variancePct).toBe(0);
    expect(r.summary).not.toMatch(/NaN|Infinity/);
  });

  it("escalates urgency on underpayment, not on a large overpayment", () => {
    const under = analyzeCommissions([row({ expected: "1000", paid: "700" })]);
    expect(under.urgency).toBe("critical");
    const over = analyzeCommissions([row({ expected: "1000", paid: "1300" })]);
    expect(over.urgency).toBe("time-sensitive");
  });

  it("reports a clean book as needing no action", () => {
    const r = analyzeCommissions([row(), row({ carrier: "Aetna" })]);
    expect(r.urgency).toBe("normal");
    expect(r.recommendations).toEqual(["All commissions match expected amounts — no action needed."]);
  });

  it("renders a signed net variance without a doubled sign", () => {
    const r = analyzeCommissions([row({ expected: "1000", paid: "900" })]);
    expect(r.summary).toContain("-$100.00");
    expect(r.summary).not.toContain("--");
    expect(r.summary).not.toContain("+-");
  });
});

describe("toCents", () => {
  it("rounds to exact integer cents", () => {
    expect(toCents(450)).toBe(45000);
    expect(toCents(449.99)).toBe(44999);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(-450.5)).toBe(-45050);
  });
});

describe("buildShortPayCSV", () => {
  it("omits the variance percentage when there is no positive expectation", () => {
    const csv = buildShortPayCSV(analyzeCommissions([row({ expected: "0", paid: "100" })]));
    expect(csv).not.toMatch(/0\.0%/);
  });

  it("keeps the percentage when the expectation is positive", () => {
    const csv = buildShortPayCSV(analyzeCommissions([row({ expected: "1000", paid: "900" })]));
    expect(csv).toContain("-10.0%");
  });

  it("escapes quotes so a carrier name cannot forge a column", () => {
    const csv = buildShortPayCSV(analyzeCommissions([row({ carrier: 'Ace "Big" Co, Inc' })]));
    expect(csv).toContain('""Big""');
  });

  it("defuses spreadsheet formula injection from a carrier name", () => {
    const csv = buildShortPayCSV(analyzeCommissions([row({ carrier: "=HYPERLINK(\"http://evil\")" })]));
    expect(csv).not.toMatch(/^"=HYPERLINK/m);
    expect(csv).toContain("'=HYPERLINK");
  });
});
