import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Copy } from "lucide-react";
import {
  ShieldCheck, Phone, Mail, ArrowRight, Check, X, Star, Zap, Lock,
  TrendingUp, Users, FileCheck, Headphones, Brain, Calendar,
  DollarSign, AlertCircle, ChevronDown, Sparkles, BarChart3,
  Workflow, MessageSquare, Building2, Award, Clock
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Free Commission Short-Pay Detector (Agent Tool) ────────────────
interface ShortPayResult {
  totalExpected: number;
  totalPaid: number;
  variance: number;
  variancePct: number;
  events: { carrier: string; planType: string; expected: number; paid: number; variance: number; classification: string }[];
  summary: string;
  urgency: "normal" | "time-sensitive" | "critical";
  recommendations: string[];
}

function classifyVariance(expected: number, paid: number): string {
  const variance = paid - expected;
  if (Math.abs(variance) < 0.01) return "paid_on_time";
  if (variance < 0) return "short_pay";
  if (variance > 0) return "over_pay";
  return "paid_on_time";
}

function analyzeCommissions(
  rows: { carrier: string; planType: string; expected: string; paid: string }[]
): ShortPayResult {
  const events = rows
    .filter((r) => r.carrier && r.expected && r.paid)
    .map((r) => {
      const expected = parseFloat(r.expected.replace(/[^0-9.]/g, "")) || 0;
      const paid = parseFloat(r.paid.replace(/[^0-9.]/g, "")) || 0;
      const variance = paid - expected;
      return {
        carrier: r.carrier,
        planType: r.planType,
        expected,
        paid,
        variance,
        classification: classifyVariance(expected, paid),
      };
    });

  const totalExpected = events.reduce((s, e) => s + e.expected, 0);
  const totalPaid = events.reduce((s, e) => s + e.paid, 0);
  const variance = totalPaid - totalExpected;
  const variancePct = totalExpected > 0 ? (variance / totalExpected) * 100 : 0;
  const shortPays = events.filter((e) => e.classification === "short_pay").length;

  let urgency: ShortPayResult["urgency"] = "normal";
  if (Math.abs(variancePct) > 15 || shortPays >= 3) urgency = "critical";
  else if (Math.abs(variancePct) > 5 || shortPays >= 1) urgency = "time-sensitive";

  const summary =
    events.length === 0
      ? "Enter your commission data to detect short pays, overpayments, and chargebacks instantly."
      : `Analyzed ${events.length} commission events across ${new Set(events.map((e) => e.carrier)).size} carrier(s). Found ${shortPays} short pay(s) and ${events.filter((e) => e.classification === "over_pay").length} overpayment(s). Net variance: ${variance >= 0 ? "+" : ""}$${variance.toFixed(2)} (${variancePct.toFixed(1)}%).`;

  const recommendations: string[] = [];
  if (shortPays > 0) {
    recommendations.push(`Open ${shortPays} dispute(s) for short-paid commissions — include the expected vs. paid amounts and CMS FMV citation.`);
  }
  if (events.some((e) => e.classification === "over_pay")) {
    recommendations.push("Flag overpayments for reserve — carriers may issue chargebacks in future statements.");
  }
  if (variancePct < -10) {
    recommendations.push("Variance exceeds 10% — escalate to agency principal and request carrier statement audit.");
  }
  if (recommendations.length === 0 && events.length > 0) {
    recommendations.push("All commissions match expected amounts — no action needed.");
  }

  return { totalExpected, totalPaid, variance, variancePct, events, summary, urgency, recommendations };
}

function downloadCSV(result: ShortPayResult) {
  const headers = ["Carrier", "Plan Type", "Expected ($)", "Paid ($)", "Variance ($)", "Classification"];
  const rows = result.events.map((e) => [
    e.carrier,
    e.planType,
    e.expected.toFixed(2),
    e.paid.toFixed(2),
    e.variance.toFixed(2),
    e.classification,
  ]);
  const summaryRows = [
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
  const csv = [headers, ...rows, ...summaryRows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `commission-shortpay-report-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function CommissionShortPayDetector() {
  const { toast } = useToast();
  const [rows, setRows] = useState([
    { carrier: "", planType: "MAPD", expected: "", paid: "" },
    { carrier: "", planType: "MAPD", expected: "", paid: "" },
    { carrier: "", planType: "MAPD", expected: "", paid: "" },
  ]);
  const [result, setResult] = useState<ShortPayResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const updateRow = (i: number, field: keyof (typeof rows)[0], value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { carrier: "", planType: "MAPD", expected: "", paid: "" }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const handleAnalyze = (e: FormEvent) => {
    e.preventDefault();
    const res = analyzeCommissions(rows);
    setResult(res);
    setShowResult(true);
  };

  return (
    <div id="shortpay-detector" className="scroll-mt-20">
      <Card className="border-2 border-primary/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center gap-2 mx-auto mb-2">
            <div className="rounded-full bg-success/10 p-2">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl font-display">Free Commission Short-Pay Detector</CardTitle>
          <CardDescription className="text-base">
            Paste your carrier commission data and instantly find short pays, overpayments, and chargebacks. No signup required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showResult ? (
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                  <div className="col-span-4">Carrier</div>
                  <div className="col-span-3">Plan Type</div>
                  <div className="col-span-2">Expected ($)</div>
                  <div className="col-span-2">Paid ($)</div>
                  <div className="col-span-1"></div>
                </div>
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      className="col-span-4 min-w-0"
                      placeholder="e.g. Humana"
                      value={row.carrier}
                      onChange={(e) => updateRow(i, "carrier", e.target.value)}
                    />
                    <Select value={row.planType} onValueChange={(v) => updateRow(i, "planType", v)}>
                      <SelectTrigger className="col-span-3 min-w-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MA">MA</SelectItem>
                        <SelectItem value="MAPD">MAPD</SelectItem>
                        <SelectItem value="CSNP">CSNP</SelectItem>
                        <SelectItem value="DSNP">DSNP</SelectItem>
                        <SelectItem value="MED SUPP">Med Supp</SelectItem>
                        <SelectItem value="PART D">Part D</SelectItem>
                        <SelectItem value="HOSPITAL INDEMNITY">Hospital Indemnity</SelectItem>
                        <SelectItem value="FINAL EXPENSE">Final Expense</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-2 min-w-0"
                      placeholder="450.00"
                      value={row.expected}
                      onChange={(e) => updateRow(i, "expected", e.target.value)}
                    />
                    <Input
                      className="col-span-2 min-w-0"
                      placeholder="420.00"
                      value={row.paid}
                      onChange={(e) => updateRow(i, "paid", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="col-span-1 min-w-0 px-0"
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="w-full">
                  + Add Row
                </Button>
              </div>
              <Button type="submit" className="w-full" size="lg">
                Detect Short Pays <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" /> Data stays in your browser. Nothing is uploaded or stored.
              </p>
            </form>
          ) : result ? (
            <div className="space-y-5">
              {/* Summary banner */}
              <div className={`rounded-lg p-4 border ${
                result.urgency === "critical" ? "bg-destructive/10 border-destructive/30" :
                result.urgency === "time-sensitive" ? "bg-warning/10 border-warning/30" :
                "bg-success/10 border-success/30"
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${
                    result.urgency === "critical" ? "text-destructive" :
                    result.urgency === "time-sensitive" ? "text-warning" :
                    "text-success"
                  }`} />
                  <div>
                    <p className="font-semibold text-sm">Analysis Complete</p>
                    <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="text-lg font-display font-bold">${result.totalExpected.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-lg font-display font-bold">${result.totalPaid.toFixed(2)}</p>
                </div>
                <div className={`rounded-lg border p-3 text-center ${
                  result.variance < 0 ? "border-destructive/30 bg-destructive/5" : "border-success/30 bg-success/5"
                }`}>
                  <p className="text-xs text-muted-foreground">Variance</p>
                  <p className={`text-lg font-display font-bold ${result.variance < 0 ? "text-destructive" : "text-success"}`}>
                    {result.variance >= 0 ? "+" : ""}${result.variance.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Event breakdown */}
              {result.events.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-accent" /> Event Breakdown
                  </h4>
                  <div className="space-y-2">
                    {result.events.map((e, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="shrink-0 text-xs">{e.planType}</Badge>
                          <span className="truncate font-medium">{e.carrier}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-muted-foreground text-xs">Exp ${e.expected.toFixed(2)} · Paid ${e.paid.toFixed(2)}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            e.classification === "short_pay" ? "bg-destructive/10 text-destructive" :
                            e.classification === "over_pay" ? "bg-warning/10 text-warning" :
                            "bg-success/10 text-success"
                          }`}>
                            {e.classification === "short_pay" ? "SHORT PAY" :
                             e.classification === "over_pay" ? "OVER PAY" : "OK"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-accent" /> Recommended Actions
                </h4>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/10 text-accent text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="pt-3 border-t space-y-3">
                <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">CMS Reference:</strong> Broker compensation is governed by 42 CFR §422.2274 (MA) and §423.2274 (Part D). Disputes should cite the applicable FMV schedule and carrier contract clause.
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button className="flex-1" onClick={() => setShowResult(false)}>
                    Analyze Again
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => result && downloadCSV(result)}
                  >
                    <Download className="mr-2 h-4 w-4" /> Download CSV
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={async () => {
                      if (!result) return;
                      const text = [
                        "COMMISSION SHORT-PAY DETECTOR — RESULTS",
                        `Generated: ${new Date().toLocaleString()}`,
                        "",
                        result.summary,
                        "",
                        `Total Expected: $${result.totalExpected.toFixed(2)}`,
                        `Total Paid: $${result.totalPaid.toFixed(2)}`,
                        `Variance: ${result.variance >= 0 ? "+" : ""}$${result.variance.toFixed(2)} (${result.variancePct.toFixed(1)}%)`,
                        `Urgency: ${result.urgency.toUpperCase()}`,
                        "",
                        "EVENT BREAKDOWN:",
                        ...result.events.map((e, i) =>
                          `${i + 1}. ${e.carrier} (${e.planType}) — Expected $${e.expected.toFixed(2)}, Paid $${e.paid.toFixed(2)}, Variance $${e.variance.toFixed(2)} [${e.classification.toUpperCase()}]`
                        ),
                        "",
                        "RECOMMENDED ACTIONS:",
                        ...result.recommendations.map((r, i) => `${i + 1}. ${r}`),
                        "",
                        "CMS Reference: Broker compensation is governed by 42 CFR §422.2274 (MA) and §423.2274 (Part D). Disputes should cite the applicable FMV schedule and carrier contract clause.",
                      ].join("\n");
                      try {
                        await navigator.clipboard.writeText(text);
                        toast({ title: "Copied to clipboard", description: "Results ready to paste into an email or dispute ticket." });
                      } catch {
                        toast({ title: "Copy failed", description: "Please copy manually.", variant: "destructive" });
                      }
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Copy Results
                  </Button>
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Get Full Reconciliation Engine <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Feature data ────────────────────────────────────────────────────
const features = [
  {
    icon: Users,
    title: "Client CRM with Communication Timeline",
    description: "Track every client with Medicare-specific fields: plan type, carrier, enrollment dates, AEP status. Two-way SMS and email timeline with template quick-replies and do-not-contact controls.",
  },
  {
    icon: DollarSign,
    title: "Commission Reconciliation Engine",
    description: "Upload carrier statements, auto-extract events, classify variances (short pay, overpay, chargeback), generate dispute packets, and export treasury feeds to QuickBooks or Sage.",
  },
  {
    icon: ShieldCheck,
    title: "TPMO Compliance Center",
    description: "Built-in SOA tracking, PEWC consent management, CMS-required disclaimers on every deliverable, and audit logging meeting 42 CFR §422.2260 requirements.",
  },
  {
    icon: TrendingUp,
    title: "MA Retention Analytics",
    description: "Churn prediction with color-coded risk scores, non-renewal notice tracking with auto-generated SEP workflows, and AEP campaign scheduling for at-risk clients.",
  },
  {
    icon: Headphones,
    title: "Softphone Dialer with AI Transcription",
    description: "Inbound/outbound dialing, live voice transcription, call recording with waveform playback, voicemail drops, warm transfers, and call dispositions saved to client records.",
  },
  {
    icon: Brain,
    title: "AI Agent Assist with RAG Knowledge Base",
    description: "Draggable floating assistant with Medicare knowledge base covering LIS, MSP, enrollment periods, carrier plan details, and compliance rules. Voice input and context-aware suggestions.",
  },
  {
    icon: BarChart3,
    title: "Supervisor Live Monitoring",
    description: "Real-time agent dashboard with live transcripts, sentiment analysis, whisper coaching, prompt injection, deal prediction scoring, and intervention queue for at-risk calls.",
  },
  {
    icon: Building2,
    title: "Agent Backoffice & Compliance",
    description: "One-click access to AHIP, carrier portals, and certifications. Readiness dashboard with open tasks, compliance scores, and document tracking for W-9s and tax info.",
  },
  {
    icon: Workflow,
    title: "Automated Workflows & Drip Campaigns",
    description: "Trigger email/SMS sequences on enrollment, renewal, or lapse. A/B test subject lines, drag-and-drop email builder, and omnichannel campaign management with open/click tracking.",
  },
];

const stats = [
  { value: "6+", label: "Tools Replaced" },
  { value: "37", label: "SOC 2 Controls" },
  { value: "9", label: "Plan Types Tracked" },
  { value: "$0", label: "Free Tool Access" },
];

// ── Comparison data ─────────────────────────────────────────────────
type CellValue = true | false | "partial";
type ComparisonCategory = "CRM" | "Commissions" | "Compliance" | "Retention" | "Dialer" | "AI" | "Security" | "Marketing" | "Pricing";
const comparisonRows: { feature: string; tooltip: string; category: ComparisonCategory; agencyBRIDGE: CellValue; genericCrm: CellValue; enterpriseCrm: CellValue; spreadsheets: CellValue }[] = [
  { feature: "Medicare-specific CRM (plan type, carrier, enrollment dates)", tooltip: "A contact system designed for Medicare that tracks each client's plan type, insurance carrier, and enrollment dates.", category: "CRM", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: "partial" },
  { feature: "9 Medicare plan types tracked (MA, MAPD, DSNP, +)", tooltip: "Supports all major Medicare plan categories including Advantage, Supplement, Part D, and specialty plans.", category: "CRM", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: "partial" },
  { feature: "Client portal with secure messaging", tooltip: "A private website where clients can view their information and message you securely.", category: "CRM", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: false },
  { feature: "Bulk CSV import/export for data migration", tooltip: "Move large amounts of client or policy data in and out of the system using spreadsheet files.", category: "CRM", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: true, spreadsheets: "partial" },
  { feature: "Commission reconciliation & dispute management", tooltip: "Automatically compares what carriers paid you against what they owe, and helps you file disputes when payments are wrong.", category: "Commissions", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: "partial" },
  { feature: "Carrier statement parsing (CSV/PDF)", tooltip: "Upload commission statements from insurance carriers and the system reads them automatically — no manual data entry.", category: "Commissions", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "1099 annual reconciliation", tooltip: "At tax time, verifies that the total commissions on your 1099 match what you actually received throughout the year.", category: "Commissions", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: "partial" },
  { feature: "Treasury feed export (QuickBooks/Sage)", tooltip: "Exports your commission data in a format your accounting software can import directly.", category: "Commissions", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: false },
  { feature: "TPMO compliance (SOA, PEWC, CMS disclaimers)", tooltip: "Tracks required Medicare sales compliance steps: scope of appointment forms, written consent, and mandatory disclaimers.", category: "Compliance", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: "partial" },
  { feature: "42 CFR §422.2260 compliance built-in", tooltip: "Follows the federal regulation that governs how Medicare plans can be marketed and sold to beneficiaries.", category: "Compliance", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "AHIP & carrier certification tracking", tooltip: "Tracks which agents have completed required annual training and certifications for each insurance carrier.", category: "Compliance", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: "partial" },
  { feature: "One-click carrier portal access (UHC, Aetna, +)", tooltip: "Quick links to log into each insurance carrier's agent portal without searching for URLs.", category: "Compliance", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "MA retention analytics & churn prediction", tooltip: "Identifies which Medicare Advantage clients are likely to leave so you can reach out before they switch.", category: "Retention", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: false },
  { feature: "Non-renewal notice tracking with SEP workflows", tooltip: "Flags clients whose plan is being discontinued and automatically creates a timeline to move them to a new plan.", category: "Retention", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "AEP campaign scheduler (Oct 15–Dec 7)", tooltip: "Plans and schedules client outreach during the Annual Election Period when Medicare beneficiaries can switch plans.", category: "Retention", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: "partial", spreadsheets: false },
  { feature: "Plan comparison tool (side-by-side MA)", tooltip: "Compare multiple Medicare Advantage plans next to each other to help clients choose the right one.", category: "Retention", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: "partial" },
  { feature: "Softphone dialer with voice transcription", tooltip: "Make and receive calls from your computer, with live text transcription of the conversation.", category: "Dialer", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: false },
  { feature: "Call recording with waveform playback", tooltip: "Recorded calls with a visual audio player so you can jump to specific moments in the conversation.", category: "Dialer", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "Voicemail drop templates", tooltip: "Pre-recorded messages you can leave with one click when a client doesn't answer.", category: "Dialer", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "Warm transfer & conference", tooltip: "Transfer a call to another agent with a brief handoff conversation, or bring a third person into the call.", category: "Dialer", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "Supervisor live monitoring & whisper coaching", tooltip: "Managers can listen to active calls and coach agents privately without the client hearing.", category: "Dialer", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: false },
  { feature: "Real-time sentiment analysis on calls", tooltip: "Shows whether the caller's tone is positive, neutral, or negative as the conversation happens.", category: "Dialer", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "Deal prediction scoring", tooltip: "Estimates the likelihood that a call will result in a sale, based on conversation patterns.", category: "Dialer", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "AI Agent Assist with Medicare RAG knowledge base", tooltip: "An AI assistant that answers Medicare questions using a built-in knowledge base of rules, plans, and compliance requirements.", category: "AI", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: false, spreadsheets: false },
  { feature: "Role-based access (5 roles, 30+ permissions)", tooltip: "Controls what each user can see and do based on their job — agents, supervisors, and admins have different access levels.", category: "Security", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: true, spreadsheets: false },
  { feature: "Audit logging with hash chaining", tooltip: "Every action is recorded in a tamper-evident log that can be verified for compliance audits.", category: "Security", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: true, spreadsheets: false },
  { feature: "SOC 2 evidence tracking (37 controls)", tooltip: "Gathers and organizes the documentation needed to pass a SOC 2 security audit.", category: "Security", agencyBRIDGE: true, genericCrm: false, enterpriseCrm: "partial", spreadsheets: false },
  { feature: "Email & SMS omnichannel campaigns", tooltip: "Send marketing outreach via email and text message from the same platform with unified tracking.", category: "Marketing", agencyBRIDGE: true, genericCrm: true, enterpriseCrm: true, spreadsheets: false },
  { feature: "Automated drip sequences (enrollment, renewal, lapse)", tooltip: "Sends a series of pre-written messages automatically when a client enrolls, renews, or lets a policy lapse.", category: "Marketing", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: true, spreadsheets: false },
  { feature: "A/B subject line testing", tooltip: "Tests different email subject lines on a small group, then automatically sends the winner to everyone else.", category: "Marketing", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: true, spreadsheets: false },
  { feature: "Drag-and-drop visual email builder", tooltip: "Design emails by dragging content blocks into place — no coding or HTML knowledge needed.", category: "Marketing", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: true, spreadsheets: false },
  { feature: "Pricing from $0 (free short-pay detector)", tooltip: "Includes a free commission short-pay detector tool with no cost, so you can try the platform before paying.", category: "Pricing", agencyBRIDGE: true, genericCrm: "partial", enterpriseCrm: false, spreadsheets: true },
];

const filterCategories: { label: string; value: ComparisonCategory | "All" }[] = [
  { label: "All Features", value: "All" },
  { label: "CRM", value: "CRM" },
  { label: "Commissions", value: "Commissions" },
  { label: "Compliance", value: "Compliance" },
  { label: "Retention", value: "Retention" },
  { label: "Dialer", value: "Dialer" },
  { label: "AI", value: "AI" },
  { label: "Security", value: "Security" },
  { label: "Marketing", value: "Marketing" },
  { label: "Pricing", value: "Pricing" },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Commission Short-Pay Detector for Medicare agents",
    features: [
      "Free Commission Short-Pay Detector tool",
      "No account required",
      "Variance classification (short pay, over pay, on time)",
      "Net variance and percentage calculation",
      "CMS regulatory citation references",
      "Recommended actions based on severity",
      "All 9 plan types supported",
    ],
    cta: "Use Free Tool",
    ctaLink: "#shortpay-detector",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$149",
    period: "/agent/month",
    description: "Full platform for Medicare agencies and brokers",
    features: [
      "Everything in Free, plus:",
      "Client CRM with communication timeline",
      "Commission reconciliation & disputes",
      "Softphone dialer with AI transcription",
      "TPMO compliance center (SOA, PEWC)",
      "MA retention analytics & churn prediction",
      "AI Agent Assist with knowledge base",
      "Email & SMS campaign builder",
      "Supervisor live monitoring",
      "Agent backoffice & compliance tracking",
      "Role-based access control (5 roles)",
      "Audit logging with hash chaining",
      "Up to 25 agents",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$399",
    period: "/agent/month",
    description: "Advanced compliance, integrations, and security for large agencies",
    features: [
      "Everything in Professional, plus:",
      "SOC 2 evidence tracking (37 controls)",
      "Carrier portal integrations (UHC, Aetna, Humana, +)",
      "CMS data ingester pipeline",
      "1099 annual reconciliation",
      "Treasury feed export (QuickBooks, Sage)",
      "Anomaly detection (Z-score, carrier drops)",
      "Custom workflow builder",
      "Client portal with secure messaging",
      "Bulk CSV import/export tools",
      "Advanced reporting & analytics",
      "SSO & MFA enforcement",
      "Unlimited agents",
      "Dedicated onboarding & support",
    ],
    cta: "Contact Sales",
    ctaLink: "/login",
    highlighted: false,
  },
];

const testimonials = [
  {
    quote: "We built agencyBRIDGE after years of watching Medicare agencies juggle six+ disconnected tools. Every feature here solves a real problem we encountered — commission short pays, missed compliance deadlines, churned clients nobody flagged.",
    author: "The agencyBRIDGE Team",
    role: "Built by Medicare industry veterans",
    rating: 0,
  },
];

const faqs = [
  {
    q: "What is agencyBRIDGE?",
    a: "agencyBRIDGE is an all-in-one Medicare agency management platform that replaces fragmented tools — CRMs, commission trackers, compliance spreadsheets, and dialers — with a single, integrated system built specifically for Medicare agencies.",
  },
  {
    q: "Is the Commission Short-Pay Detector really free?",
    a: "Yes. The Short-Pay Detector is a free tool that helps Medicare agents instantly find short pays, overpayments, and chargebacks in their carrier commission data. No account is required and data never leaves your browser.",
  },
  {
    q: "How much does agencyBRIDGE cost?",
    a: "agencyBRIDGE offers three plans: Free (commission short-pay detector tool), Professional at $149/agent/month (full platform access), and Enterprise at $399/agent/month (advanced compliance, SOC 2 reporting, and carrier integrations).",
  },
  {
    q: "Does agencyBRIDGE support TPMO compliance?",
    a: "Yes. agencyBRIDGE includes built-in TPMO compliance features including Scope of Appointment (SOA) tracking, Prior Express Written Consent (PEWC) management, CMS-required disclaimers on every deliverable, and audit logging meeting CMS 42 CFR §422.2260 requirements.",
  },
  {
    q: "Can I track Medicare commissions and disputes?",
    a: "Yes. The commission reconciliation engine parses carrier statements, classifies variances (short pay, overpay, chargeback), generates dispute packets with CMS citations, and produces 1099 reconciliation reports and treasury feeds for QuickBooks and Sage import.",
  },
  {
    q: "What plan types does agencyBRIDGE support?",
    a: "All nine standard plan types: MA, MAPD, CSNP, DSNP, Med Supp, Part D, Hospital Indemnity, Final Expense, and Other. Each client record tracks plan type, carrier, enrollment dates, and renewal status.",
  },
  {
    q: "Is my data secure?",
    a: "agencyBRIDGE implements SHA-256 hashed credentials, role-based access control with 5 roles and 30+ action-level permissions, audit logging with cryptographic hash chaining, and SOC 2 evidence tracking across 37 controls. PHI is never stored in raw form in audit logs. SOC 2 Type II certification is a planned roadmap item, not a current certification.",
  },
  {
    q: "Can I try it before buying?",
    a: "Yes. The Professional plan includes a free trial. You can also use the free Commission Short-Pay Detector without any account to experience the platform's reconciliation capabilities.",
  },
];

// ── Animation variants ─────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// ── Landing Page ────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showMobileBar, setShowMobileBar] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ComparisonCategory | "All">("All");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { exportCodeAsZip } = await import("@/lib/codeExport");
      const count = await exportCodeAsZip();
      if (count === 0) {
        alert("No files found to export. Please try again.");
      }
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setExporting(false);
    }
  };

  const filteredRows = activeFilter === "All" ? comparisonRows : comparisonRows.filter((r) => r.category === activeFilter);

  useEffect(() => {
    const handler = () => {
      setShowMobileBar(window.scrollY > 600);
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold text-lg">
                aB
              </div>
              <span className="text-xl font-display font-bold tracking-tight">agencyBRIDGE</span>
            </div>
            <div className="hidden lg:flex items-center gap-6">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#comparison" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Compare</a>
              <a href="#shortpay-detector" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Free Tool</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/login")}>
                Sign In
              </Button>
              <Button variant="outline" size="sm" className="hidden lg:inline-flex" onClick={handleExport} disabled={exporting}>
                {exporting ? "Packaging..." : "Export Code"}
              </Button>
              <Button size="sm" onClick={() => navigate("/login")}>
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-navy-gradient">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <Badge className="mb-4 bg-white/10 text-white border-white/20 hover:bg-white/15">
                  <Sparkles className="h-3 w-3 mr-1" /> Built for Medicare Agencies
                </Badge>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-white tracking-tight text-balance leading-tight">
                  Replace 6+ tools with one{" "}
                  <span className="text-blue-300">Medicare agency platform</span>
                </h1>
                <p className="mt-6 text-lg text-blue-100/80 text-balance max-w-xl mx-auto lg:mx-0">
                  CRM, commission reconciliation, compliance tracking, retention analytics,
                  softphone dialer, and AI agent assist — all in one system built specifically for
                  Medicare agencies. TPMO-compliant. Audit-logged.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
              >
                <Button size="lg" onClick={() => navigate("/login")} className="bg-white text-primary hover:bg-blue-50">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <a href="#shortpay-detector">
                  <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto">
                    <DollarSign className="mr-2 h-4 w-4" /> Try Free Short-Pay Detector
                  </Button>
                </a>
              </motion.div>
              <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start">
                <div className="flex items-center gap-1.5 text-sm text-blue-100/70">
                  <ShieldCheck className="h-4 w-4" /> CMS TPMO-Compliant
                </div>
                <div className="flex items-center gap-1.5 text-sm text-blue-100/70">
                  <Lock className="h-4 w-4" /> Audit-Logged
                </div>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-2 shadow-2xl">
                <img
                  src="https://vibe.filesafe.space/1786042236933712854/assets/9d734894-8329-4f41-9b59-99c3ebd81a7a.png"
                  alt="agencyBRIDGE Medicare agency management platform dashboard showing CRM, commissions, compliance, and retention analytics"
                  className="rounded-xl w-full"
                  loading="eager"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 rounded-xl bg-success px-4 py-2 shadow-lg hidden sm:block">
                <p className="text-xs font-semibold text-success-foreground">AEP Ready 2026</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={fadeUp} className="text-center">
                <p className="text-3xl lg:text-4xl font-display font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Free Tool Section ────────────────────────────────────── */}
      {/* overflow-x-clip contains the ±30px entrance offsets below so they can't
          widen the page before they animate in. `clip` rather than `hidden` so the
          sticky left column keeps working. */}
      <section className="py-20 bg-muted/30 overflow-x-clip">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="lg:sticky lg:top-24"
            >
              <Badge className="mb-4 bg-success/10 text-success border-success/20">
                <Zap className="h-3 w-3 mr-1" /> Free Tool — No Signup
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-balance">
                Free Commission Short-Pay Detector
              </h2>
              <p className="mt-4 text-lg text-muted-foreground text-balance">
                Paste your carrier commission data and instantly find short pays, overpayments, and
                chargebacks. Built with CMS FMV variance classification — no account required, data
                never leaves your browser.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Classifies each event: paid on time, short pay, over pay",
                  "Calculates net variance and percentage across all carriers",
                  "Flags disputes requiring action with CMS regulatory citations",
                  "Supports all 9 plan types (MA, MAPD, DSNP, Med Supp, +)",
                  "Recommends next steps based on variance severity",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-lg bg-accent/5 border border-accent/20">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">For agents:</strong> Stop manually reconciling
                  carrier statements. The full platform auto-parses CSV/PDF statements, generates
                  dispute packets, and tracks 1099 reconciliation — this free tool shows you how it works.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <CommissionShortPayDetector />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────────────── */}
      <section id="features" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              <Award className="h-3 w-3 mr-1" /> Platform Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-balance">
              Everything your Medicare agency needs in one platform
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-balance">
              From first contact to renewal retention, agencyBRIDGE covers the entire Medicare
              client lifecycle — with compliance built into every step.
            </p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeUp} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <Card className="hover:shadow-lg transition-shadow border-border/60 h-full">
                  <CardContent className="pt-6">
                    <div className="rounded-lg bg-accent/10 p-3 w-fit mb-4">
                      <f.icon className="h-6 w-6 text-accent" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Comparison Table ────────────────────────────────────── */}
      <section id="comparison" className="py-20 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              <Award className="h-3 w-3 mr-1" /> Platform Comparison
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-balance">
              Why agencies switch to agencyBRIDGE
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-balance">
              See how agencyBRIDGE compares to generic CRMs and manual spreadsheets for Medicare agency operations.
            </p>
          </motion.div>

          {/* Filter toggles */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap justify-center gap-2 mb-6"
          >
            {filterCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveFilter(cat.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeFilter === cat.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {cat.label}
                {cat.value !== "All" && (
                  <span className={`ml-1.5 ${activeFilter === cat.value ? "text-primary-foreground/70" : "text-muted-foreground/50"}`}>
                    {comparisonRows.filter((r) => r.category === cat.value).length}
                  </span>
                )}
              </button>
            ))}
          </motion.div>

          {/* Desktop table — hidden on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:block overflow-auto rounded-lg border border-border/60"
            style={{ maxHeight: "70vh" }}
          >
            <table className="w-full border-collapse min-w-[760px]">
              <thead className="sticky top-0 z-20">
                <tr className="border-b-2 border-border bg-background/95 backdrop-blur-sm shadow-sm">
                  <th className="text-left py-4 px-4 font-display font-semibold text-sm text-muted-foreground w-[34%] bg-background/95 backdrop-blur-sm">
                    Feature
                  </th>
                  <th className="text-center py-4 px-4 font-display font-bold text-sm bg-primary/5 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-primary">agencyBRIDGE</span>
                      <Badge className="bg-accent/10 text-accent border-accent/20 text-[10px]">Medicare-Built</Badge>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4 font-display font-semibold text-sm text-muted-foreground bg-background/95 backdrop-blur-sm">
                    Generic CRM
                  </th>
                  <th className="text-center py-4 px-4 font-display font-semibold text-sm text-muted-foreground bg-background/95 backdrop-blur-sm">
                    Enterprise CRM
                  </th>
                  <th className="text-center py-4 px-4 font-display font-semibold text-sm text-muted-foreground bg-background/95 backdrop-blur-sm">
                    Spreadsheets
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-border/60 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "bg-muted/10" : ""}`}
                  >
                    <td className="py-3.5 px-4 text-sm font-medium">
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground transition-colors">
                            {row.feature}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                          {row.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="py-3.5 px-4 text-center bg-primary/5">
                      {row.agencyBRIDGE === true ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : row.agencyBRIDGE === "partial" ? (
                        <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Partial</span>
                      ) : (
                        <X className="h-5 w-5 text-destructive/60 mx-auto" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.genericCrm === true ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : row.genericCrm === "partial" ? (
                        <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Partial</span>
                      ) : (
                        <X className="h-5 w-5 text-destructive/40 mx-auto" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.enterpriseCrm === true ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : row.enterpriseCrm === "partial" ? (
                        <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Partial</span>
                      ) : (
                        <X className="h-5 w-5 text-destructive/40 mx-auto" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.spreadsheets === true ? (
                        <Check className="h-5 w-5 text-success mx-auto" />
                      ) : row.spreadsheets === "partial" ? (
                        <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Partial</span>
                      ) : (
                        <X className="h-5 w-5 text-destructive/40 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          {/* Mobile card layout — stacked vertically */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden space-y-3"
          >
            {filteredRows.map((row) => {
              const competitors = [
                { name: "agencyBRIDGE", value: row.agencyBRIDGE, highlight: true },
                { name: "Generic CRM", value: row.genericCrm, highlight: false },
                { name: "Enterprise CRM", value: row.enterpriseCrm, highlight: false },
                { name: "Spreadsheets", value: row.spreadsheets, highlight: false },
              ];
              return (
                <div key={row.feature} className="rounded-lg border border-border/60 bg-card overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30 border-b border-border/60">
                    <p className="text-sm font-semibold leading-snug">{row.feature}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{row.tooltip}</p>
                  </div>
                  <div className="divide-y divide-border/40">
                    {competitors.map((c) => (
                      <div
                        key={c.name}
                        className={`flex items-center justify-between px-4 py-2.5 ${c.highlight ? "bg-primary/5" : ""}`}
                      >
                        <span className={`text-sm ${c.highlight ? "font-bold text-primary" : "text-muted-foreground"}`}>
                          {c.name}
                        </span>
                        {c.value === true ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : c.value === "partial" ? (
                          <span className="text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full">Partial</span>
                        ) : (
                          <X className="h-4 w-4 text-destructive/40" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <p className="text-sm text-muted-foreground text-center sm:text-left">
              Built specifically for Medicare agencies — not retrofitted from a generic CRM.
            </p>
            <Button onClick={() => navigate("/login")} className="shrink-0">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-muted/30 scroll-mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <DollarSign className="h-3 w-3 mr-1" /> Simple Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-balance">
              Pricing that scales with your agency
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-balance">
              Start free with the Eligibility Checker. Upgrade when you're ready for the full platform.
              No setup fees. Cancel anytime.
            </p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
          >
            {pricingPlans.map((plan) => (
              <motion.div key={plan.name} variants={plan.highlighted ? scaleIn : fadeUp} whileHover={{ y: -6 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <Card
                  className={`relative ${
                    plan.highlighted
                      ? "border-2 border-accent shadow-xl lg:scale-105"
                      : "border-border/60"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground shadow-md">
                        <Star className="h-3 w-3 mr-1 fill-current" /> Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl font-display">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-display font-bold">{plan.price}</span>
                      <span className="text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className={`h-4 w-4 shrink-0 mt-0.5 ${
                            feat === "Everything in Free, plus:" || feat === "Everything in Professional, plus:"
                              ? "text-transparent"
                              : "text-success"
                          }`} />
                          <span className={feat === "Everything in Free, plus:" || feat === "Everything in Professional, plus:" ? "font-semibold text-foreground" : ""}>
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {plan.ctaLink.startsWith("#") ? (
                      <a href={plan.ctaLink} className="block">
                        <Button className="w-full" variant={plan.highlighted ? "default" : "outline"}>
                          {plan.cta}
                        </Button>
                      </a>
                    ) : (
                      <Button
                        className="w-full"
                        variant={plan.highlighted ? "default" : "outline"}
                        onClick={() => navigate(plan.ctaLink)}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          <p className="text-center text-sm text-muted-foreground mt-8">
            All plans include TPMO-compliant disclaimers and CMS-aligned compliance features.
            Enterprise plans include dedicated onboarding and custom carrier integrations.
          </p>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-balance">
              Built for Medicare agencies, by Medicare veterans
            </h2>
                <p className="mt-4 text-lg text-muted-foreground text-balance">
                  Built by Medicare industry veterans who lived through the pain of fragmented tools,
                  missed compliance deadlines, and unflagged at-risk clients.
                </p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {testimonials.map((t) => (
              <motion.div key={t.author} variants={fadeUp}>
                <Card className="border-border/60 h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-accent/10 text-accent border-accent/20">From the builders</Badge>
                    </div>
                    <p className="text-sm leading-relaxed mb-4">"{t.quote}"</p>
                    <div>
                      <p className="font-semibold text-sm">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-muted/30 scroll-mt-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20">
              <MessageSquare className="h-3 w-3 mr-1" /> FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
              Frequently asked questions
            </h2>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="space-y-3"
          >
            {faqs.map((faq, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="border-border/60">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full text-left p-4 flex items-center justify-between gap-4"
                  >
                    <span className="font-semibold text-sm">{faq.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-navy-gradient">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight text-balance">
            Ready to replace your fragmented tools?
          </h2>
          <p className="mt-4 text-lg text-blue-100/80 text-balance">
            Start your free trial today. Get full platform access for 14 days — no credit card required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={() => navigate("/login")} className="bg-white text-primary hover:bg-blue-50">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <a href="#shortpay-detector">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white w-full sm:w-auto">
                Try Free Short-Pay Detector
              </Button>
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-blue-100/60">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> 14-day trial</span>
            <span className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> No credit card</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> TPMO-compliant</span>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display font-bold">
                  aB
                </div>
                <span className="font-display font-bold">agencyBRIDGE</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                The all-in-one Medicare agency management platform. Built by agents, for agents.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#shortpay-detector" className="hover:text-foreground transition-colors">Free Short-Pay Detector</a></li>
                <li><button onClick={() => navigate("/login")} className="hover:text-foreground transition-colors">Sign In</button></li>
                <li><button onClick={handleExport} className="hover:text-foreground transition-colors">{exporting ? "Packaging..." : "Export Source Code"}</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Compliance</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>TPMO Compliance (42 CFR §422.2260)</li>
                <li>SOA Tracking & PEWC Consent</li>
                <li>SOC 2 Evidence Tracking</li>
                <li>Audit Logging</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
                <li>Medicare.gov</li>
                <li>SHIP (shiphelp.org)</li>
                <li>1-800-MEDICARE</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>CMS Disclaimer:</strong> We do not offer every plan available in your area. Any
              information we provide is limited to those plans we do offer in your area. Please
              contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Language Assistance:</strong> If you speak a language other than English,
              language assistance services are available to you free of charge. Call 1-800-MEDICARE
              (1-800-633-4227). TTY users can call 1-877-486-2048.
            </p>
            <p className="text-xs text-muted-foreground">
              © 2026 agencyBRIDGE. All rights reserved. Not affiliated with or endorsed by CMS, Medicare, or any carrier.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Sticky Mobile CTA Bar ──────────────────────────────────── */}
      <AnimatePresence>
        {showMobileBar && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
          >
            <div className="bg-navy-900/95 backdrop-blur-md border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">Start your free trial</p>
                  <p className="text-xs text-blue-200/70 truncate">14 days · No credit card required</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate("/login")}
                  className="bg-white text-navy-900 hover:bg-blue-50 shrink-0"
                >
                  Start Free Trial <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
