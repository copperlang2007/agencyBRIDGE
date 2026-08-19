import { csvRows } from "./csv";

// Commission short-pay detection.
//
// Powers the public Short-Pay Detector on the landing page. Its output drives
// "open N dispute(s)" guidance, so a wrong classification has real downstream
// cost for an agent. Extracted from the page component so the arithmetic is
// testable independently of React.

export type VarianceClassification = "paid_on_time" | "short_pay" | "over_pay";

export interface CommissionRowInput {
  carrier: string;
  planType: string;
  expected: string;
  paid: string;
}

export interface CommissionEvent {
  carrier: string;
  planType: string;
  expected: number;
  paid: number;
  variance: number;
  classification: VarianceClassification;
}

export interface ShortPayResult {
  totalExpected: number;
  totalPaid: number;
  variance: number;
  variancePct: number;
  events: CommissionEvent[];
  /** 1-based row numbers whose amounts could not be parsed; excluded from totals. */
  invalidRows: number[];
  summary: string;
  urgency: "normal" | "time-sensitive" | "critical";
  recommendations: string[];
}

/** Amounts under a cent apart are the same payment. */
const CENT = 0.01;

/**
 * Parse a currency string entered by a human.
 *
 * Accepts `$1,234.56`, plain `1234.56`, a leading minus, and accounting-style
 * parentheses for negatives. A blank field is a valid zero — an agent who
 * received nothing leaves it empty, and that is the most severe short pay there
 * is, so it must not be discarded. Anything else is reported invalid rather than
 * silently coerced to zero.
 */
export function parseCurrency(raw: string): { value: number; valid: boolean } {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return { value: 0, valid: true };

  const parenthesised = /^\((.*)\)$/.exec(trimmed);
  const body = parenthesised ? parenthesised[1] : trimmed;

  // One optional sign, digits with at most one decimal point, commas as separators.
  const m = /^([+-]?)\s*\$?\s*((?:\d{1,3}(?:,\d{3})*|\d*)(?:\.\d+)?)$/.exec(body.trim());
  if (!m || m[2] === "" || m[2] === ".") return { value: 0, valid: false };

  const magnitude = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(magnitude)) return { value: 0, valid: false };

  const negative = m[1] === "-" || Boolean(parenthesised);
  return { value: negative ? -magnitude : magnitude, valid: true };
}

export function classifyVariance(expected: number, paid: number): VarianceClassification {
  const variance = paid - expected;
  if (Math.abs(variance) < CENT) return "paid_on_time";
  return variance < 0 ? "short_pay" : "over_pay";
}

/** A row is in scope once it names a carrier and carries at least one amount. */
function isPopulated(r: CommissionRowInput): boolean {
  return Boolean(r.carrier?.trim()) && (r.expected?.trim() !== "" || r.paid?.trim() !== "");
}

export function analyzeCommissions(rows: CommissionRowInput[]): ShortPayResult {
  const events: CommissionEvent[] = [];
  const invalidRows: number[] = [];

  rows.forEach((r, i) => {
    if (!isPopulated(r)) return;

    const expected = parseCurrency(r.expected);
    const paid = parseCurrency(r.paid);
    if (!expected.valid || !paid.valid) {
      invalidRows.push(i + 1);
      return;
    }

    events.push({
      carrier: r.carrier.trim(),
      planType: r.planType,
      expected: expected.value,
      paid: paid.value,
      variance: paid.value - expected.value,
      classification: classifyVariance(expected.value, paid.value),
    });
  });

  const totalExpected = events.reduce((s, e) => s + e.expected, 0);
  const totalPaid = events.reduce((s, e) => s + e.paid, 0);
  const variance = totalPaid - totalExpected;
  // Percentages are meaningless against a zero or negative expectation.
  const variancePct = totalExpected > 0 ? (variance / totalExpected) * 100 : 0;

  const shortPays = events.filter((e) => e.classification === "short_pay").length;
  const overPays = events.filter((e) => e.classification === "over_pay").length;
  const reversals = events.filter((e) => e.paid < 0).length;

  let urgency: ShortPayResult["urgency"] = "normal";
  if (variancePct < -15 || shortPays >= 3 || reversals > 0) urgency = "critical";
  else if (variancePct < -5 || shortPays >= 1) urgency = "time-sensitive";
  else if (Math.abs(variancePct) > 15 || overPays >= 3) urgency = "time-sensitive";

  const carriers = new Set(events.map((e) => e.carrier)).size;
  const summary =
    events.length === 0
      ? "Enter your commission data to detect short pays, overpayments, and chargebacks instantly."
      : `Analyzed ${events.length} commission event(s) across ${carriers} carrier(s). Found ${shortPays} short pay(s) and ${overPays} overpayment(s). Net variance: ${variance >= 0 ? "+" : "-"}$${Math.abs(variance).toFixed(2)}${totalExpected > 0 ? ` (${variancePct.toFixed(1)}%)` : ""}.`;

  const recommendations: string[] = [];
  if (invalidRows.length > 0) {
    recommendations.push(
      `Row(s) ${invalidRows.join(", ")} could not be read as an amount and were excluded — re-enter them as numbers (for example 450.00 or -450.00).`,
    );
  }
  if (reversals > 0) {
    recommendations.push(
      `${reversals} row(s) show a negative payment (chargeback or reversal). Confirm the disenrollment date and whether the reversal falls inside the carrier's chargeback window.`,
    );
  }
  if (shortPays > 0) {
    recommendations.push(
      `Open ${shortPays} dispute(s) for short-paid commissions — include the expected vs. paid amounts and CMS FMV citation.`,
    );
  }
  if (overPays > 0) {
    recommendations.push("Flag overpayments for reserve — carriers may issue chargebacks in future statements.");
  }
  if (variancePct < -10) {
    recommendations.push("Variance exceeds 10% — escalate to agency principal and request carrier statement audit.");
  }
  if (recommendations.length === 0 && events.length > 0) {
    recommendations.push("All commissions match expected amounts — no action needed.");
  }

  return {
    totalExpected, totalPaid, variance, variancePct,
    events, invalidRows, summary, urgency, recommendations,
  };
}

/** Render the analysis as a CSV report. */
export function buildShortPayCSV(result: ShortPayResult): string {
  const headers = ["Carrier", "Plan Type", "Expected ($)", "Paid ($)", "Variance ($)", "Classification"];
  const rows = result.events.map((e) => [
    e.carrier, e.planType, e.expected.toFixed(2), e.paid.toFixed(2), e.variance.toFixed(2), e.classification,
  ]);
  const summaryRows: string[][] = [
    [],
    ["SUMMARY"],
    ["Total Expected", "", "", result.totalExpected.toFixed(2)],
    ["Total Paid", "", "", result.totalPaid.toFixed(2)],
    ["Variance", "", "", `${result.variance.toFixed(2)} (${result.variancePct.toFixed(1)}%)`],
    ["Urgency", "", "", result.urgency],
    [],
    ["RECOMMENDATIONS"],
    ...result.recommendations.map((r, i) => [`${i + 1}. ${r}`]),
  ];
  return csvRows([headers, ...rows, ...summaryRows]);
}
