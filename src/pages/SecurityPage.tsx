import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck, ShieldAlert, FileCheck2, Lock, Download, Search,
  Activity, Database, KeyRound, Eye, AlertTriangle, CheckCircle2,
  Server, GitBranch, Network, Bug, FileText, Users, Clock,
  Radio, Pause, Play, MessageSquare, ChevronRight, Copy,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  getAuditLog, verifyAuditIntegrity, exportAuditCSV, clearAuditLog,
  type AuditIntegrityResult,
  subscribeAuditLog,
  type AuditEntry, type AuditSeverity, type AuditCategory,
} from "@/lib/auditLog";
import { logAudit } from "@/lib/auditLog";
import { actionPermissions, useRole } from "@/lib/roleContext";

// ── SOC 2 TSC control map (visual dashboard) ───────────────────────

interface ControlRow {
  id: string;
  name: string;
  category: string;
  status: "compliant" | "partial" | "missing" | "inherited";
  evidence: string;
  icon: typeof ShieldCheck;
}

const initialSoc2Controls: ControlRow[] = [
  // CC1 — Control Environment
  { id: "CC1.1", name: "Integrity & Ethics", category: "Control Environment", status: "compliant", evidence: "Code of conduct, board-adopted, signed by all employees", icon: FileText },
  { id: "CC1.2", name: "Board Oversight", category: "Control Environment", status: "compliant", evidence: "Board meeting minutes referencing security", icon: Users },
  { id: "CC1.3", name: "Org Structure", category: "Control Environment", status: "compliant", evidence: "Org chart with security responsibilities marked", icon: Users },
  { id: "CC1.4", name: "Competence", category: "Control Environment", status: "partial", evidence: "Job descriptions + onboarding checklist (in progress)", icon: FileText },
  { id: "CC1.5", name: "Accountability", category: "Control Environment", status: "compliant", evidence: "Performance reviews referencing security responsibilities", icon: CheckCircle2 },
  // CC2 — Communication & Information
  { id: "CC2.1", name: "Internal Policy Library", category: "Communication", status: "compliant", evidence: "Policy library with version history", icon: FileText },
  { id: "CC2.2", name: "Security Awareness Training", category: "Communication", status: "partial", evidence: "Per-employee training records (75% complete)", icon: Users },
  { id: "CC2.3", name: "External Communication", category: "Communication", status: "compliant", evidence: "Status page + customer notification logs", icon: Activity },
  // CC3 — Risk Assessment
  { id: "CC3.1", name: "Annual Risk Assessment", category: "Risk Assessment", status: "compliant", evidence: "Annual risk assessment document", icon: AlertTriangle },
  { id: "CC3.2", name: "Fraud Risk", category: "Risk Assessment", status: "partial", evidence: "Fraud risk in risk register (needs update)", icon: AlertTriangle },
  { id: "CC3.3", name: "Risk Register", category: "Risk Assessment", status: "compliant", evidence: "Risk register entries with treatment status", icon: FileText },
  { id: "CC3.4", name: "Change-Impact Risk Reviews", category: "Risk Assessment", status: "compliant", evidence: "PR description template includes risk section", icon: GitBranch },
  // CC4 — Monitoring
  { id: "CC4.1", name: "System Monitoring", category: "Monitoring", status: "compliant", evidence: "Audit log + CloudTrail + Security Hub findings", icon: Activity },
  { id: "CC4.2", name: "Internal Control Review", category: "Monitoring", status: "partial", evidence: "Quarterly review meeting minutes (Q2 pending)", icon: FileText },
  // CC5 — Control Activities
  { id: "CC5.1", name: "Defined Controls List", category: "Control Activities", status: "compliant", evidence: "This document, extended", icon: FileCheck2 },
  { id: "CC5.2", name: "Tech Controls Inventory", category: "Control Activities", status: "compliant", evidence: "CDK templates, IAM policies, SCPs", icon: Server },
  { id: "CC5.3", name: "Policy Documents", category: "Control Activities", status: "compliant", evidence: "Policy documents per control", icon: FileText },
  // CC6 — Logical & Physical Access
  { id: "CC6.1", name: "IAM Policies & SCPs", category: "Logical Access", status: "compliant", evidence: "IAM policies, SCPs, IdP config exports", icon: KeyRound },
  { id: "CC6.2", name: "Access Request Trail", category: "Logical Access", status: "compliant", evidence: "Access request → approval → grant trail", icon: Eye },
  { id: "CC6.3", name: "Role Definitions", category: "Logical Access", status: "compliant", evidence: "Role definitions, separation of duties matrix", icon: Users },
  { id: "CC6.4", name: "Physical Access", category: "Logical Access", status: "inherited", evidence: "AWS SOC reports (cloud-only, inherited)", icon: Server },
  { id: "CC6.5", name: "Asset Disposal", category: "Logical Access", status: "inherited", evidence: "AWS handles — inheritance documented", icon: Server },
  { id: "CC6.6", name: "Boundary Protection", category: "Logical Access", status: "compliant", evidence: "VPC config, security groups, WAF rules, PrivateLink", icon: Network },
  { id: "CC6.7", name: "Data Transmission", category: "Logical Access", status: "compliant", evidence: "TLS config tests, mTLS service mesh config", icon: Lock },
  { id: "CC6.8", name: "Malware Prevention", category: "Logical Access", status: "missing", evidence: "EDR rollout TBD — vendor selection in progress", icon: Bug },
  // CC7 — System Operations
  { id: "CC7.1", name: "Vulnerability Management", category: "System Operations", status: "compliant", evidence: "Dependabot/Snyk reports, weekly container scans", icon: Bug },
  { id: "CC7.2", name: "Anomaly Detection", category: "System Operations", status: "compliant", evidence: "Audit log + GuardDuty + Security Hub findings", icon: Activity },
  { id: "CC7.3", name: "Incident Response", category: "System Operations", status: "partial", evidence: "IR runbook ready, post-incident template empty", icon: AlertTriangle },
  { id: "CC7.4", name: "Incident Communication", category: "System Operations", status: "compliant", evidence: "Customer notification template", icon: FileText },
  { id: "CC7.5", name: "Recovery Testing", category: "System Operations", status: "partial", evidence: "Semi-annual DR test (last test 4 months ago)", icon: Server },
  // CC8 — Change Management
  { id: "CC8.1", name: "Change Management", category: "Change Management", status: "compliant", evidence: "Branch protection, required reviewers, CI checks, deployment logs", icon: GitBranch },
  // CC9 — Risk Mitigation
  { id: "CC9.1", name: "BCP/DR Plan", category: "Risk Mitigation", status: "compliant", evidence: "BCP/DR plan documented", icon: FileText },
  { id: "CC9.2", name: "Vendor Management", category: "Risk Mitigation", status: "partial", evidence: "Vendor inventory + BAA register (annual review pending)", icon: Users },
  // A1 — Availability
  { id: "A1.1", name: "Capacity Monitoring", category: "Availability", status: "compliant", evidence: "Datadog dashboards, alerts configured", icon: Activity },
  { id: "A1.2", name: "Environmental Protection", category: "Availability", status: "inherited", evidence: "AWS inheritance", icon: Server },
  { id: "A1.3", name: "Recovery Testing", category: "Availability", status: "partial", evidence: "Semi-annual DR drill records (last 4 months ago)", icon: Clock },
  // C1 — Confidentiality (Type II prep)
  { id: "C1.1", name: "Data Classification", category: "Confidentiality", status: "partial", evidence: "Classification policy drafted, tagging pending", icon: Lock },
  { id: "C1.2", name: "Data Disposal", category: "Confidentiality", status: "compliant", evidence: "S3 lifecycle policies, RDS deletion logs", icon: Database },
];

// ── Remediation actions for non-compliant controls ───────────────────
interface RemediationAction {
  controlIds: string[];
  title: string;
  description: string;
  owner: string;
  targetDate: string;
  steps: string[];
}

const remediationActions: RemediationAction[] = [
  {
    controlIds: ["CC1.4"],
    title: "Complete Competence Documentation",
    description: "Finalize job descriptions for all roles and complete the onboarding checklist for recent hires.",
    owner: "Megan Hutton (COO)",
    targetDate: "2026-09-15",
    steps: [
      "Draft job descriptions for Agent, Supervisor, and Admin roles",
      "Review with department heads for accuracy",
      "Complete onboarding checklist for 3 recent hires",
      "Upload signed documents to policy library",
    ],
  },
  {
    controlIds: ["CC2.2"],
    title: "Finish Security Awareness Training",
    description: "Complete the remaining 25% of per-employee security awareness training records.",
    owner: "Megan Hutton (COO)",
    targetDate: "2026-08-30",
    steps: [
      "Identify employees with incomplete training records",
      "Assign remaining modules in LMS",
      "Track completion to 100%",
      "Export completion certificates to evidence binder",
    ],
  },
  {
    controlIds: ["CC3.2"],
    title: "Update Fraud Risk Register",
    description: "Refresh the fraud risk consideration in the risk register with current threat landscape.",
    owner: "Lang (CTO)",
    targetDate: "2026-09-01",
    steps: [
      "Review current fraud risk entries",
      "Add CMS TPMO fraud scenarios (kickback, steering)",
      "Add commission fraud scenarios (split manipulation)",
      "Document treatment plans for new entries",
    ],
  },
  {
    controlIds: ["CC4.2"],
    title: "Complete Q2 Internal Control Review",
    description: "Hold the Q2 quarterly internal control review meeting and document minutes.",
    owner: "Ryan (DevOps Lead)",
    targetDate: "2026-08-20",
    steps: [
      "Schedule Q2 review meeting with control owners",
      "Prepare control status summary from this dashboard",
      "Conduct review and document minutes",
      "Upload minutes to evidence binder",
    ],
  },
  {
    controlIds: ["CC6.8"],
    title: "Deploy EDR Solution",
    description: "Select and deploy an Endpoint Detection and Response (EDR) solution across all endpoints.",
    owner: "Ryan (DevOps Lead)",
    targetDate: "2026-10-01",
    steps: [
      "Evaluate EDR vendors (CrowdStrike, SentinelOne, Defender for Endpoint)",
      "Select vendor and complete procurement",
      "Deploy agent to all endpoints",
      "Configure policies and generate compliance reports",
    ],
  },
  {
    controlIds: ["CC7.3"],
    title: "Complete Incident Response Post-Mortem Template",
    description: "Finalize the post-incident review template and conduct a tabletop exercise.",
    owner: "Ryan (DevOps Lead)",
    targetDate: "2026-09-10",
    steps: [
      "Draft post-incident review template (timeline, root cause, action items)",
      "Conduct tabletop IR exercise with team",
      "Document exercise results as evidence",
      "Update IR runbook based on exercise findings",
    ],
  },
  {
    controlIds: ["CC7.5", "A1.3"],
    title: "Conduct Semi-Annual DR Test",
    description: "Run the semi-annual disaster recovery test and document results for both CC7.5 and A1.3.",
    owner: "Ryan (DevOps Lead)",
    targetDate: "2026-08-25",
    steps: [
      "Define DR test scope and success criteria",
      "Execute failover to DR environment",
      "Verify data integrity and application availability",
      "Document results and update DR plan",
    ],
  },
  {
    controlIds: ["CC9.2"],
    title: "Complete Annual Vendor Risk Reviews",
    description: "Complete annual vendor risk reviews for all vendors in the inventory, including BAA verification.",
    owner: "Lang (CTO)",
    targetDate: "2026-09-30",
    steps: [
      "Pull vendor inventory and BAA register",
      "Send risk assessment questionnaires to top 10 vendors",
      "Review responses and update risk ratings",
      "Document review completion in vendor management file",
    ],
  },
  {
    controlIds: ["C1.1"],
    title: "Implement Data Classification Tagging",
    description: "Finalize data classification policy and implement tagging across S3, RDS, and API payloads.",
    owner: "Lang (CTO)",
    targetDate: "2026-10-15",
    steps: [
      "Finalize 4-tier classification policy (Public, Internal, Confidential, PHI)",
      "Apply S3 bucket tags per classification",
      "Add classification headers to API responses",
      "Document tagging schema in policy library",
    ],
  },
];

const statusConfig: Record<ControlRow["status"], { label: string; color: string; bg: string; dot: string }> = {
  compliant: { label: "Compliant", color: "text-success", bg: "bg-success/10", dot: "bg-success" },
  partial: { label: "Partial", color: "text-warning", bg: "bg-warning/10", dot: "bg-warning" },
  missing: { label: "Missing", color: "text-destructive", bg: "bg-destructive/10", dot: "bg-destructive" },
  inherited: { label: "Inherited", color: "text-muted-foreground", bg: "bg-muted", dot: "bg-muted-foreground" },
};

const severityConfig: Record<AuditSeverity, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  info: { label: "INFO", variant: "secondary" },
  warning: { label: "WARN", variant: "outline" },
  critical: { label: "CRIT", variant: "destructive" },
  success: { label: "OK", variant: "default" },
};

const categoryColors: Record<AuditCategory, string> = {
  auth: "text-blue-600",
  client: "text-navy-600",
  policy: "text-indigo-600",
  commission: "text-success-600",
  compliance: "text-purple-600",
  agent: "text-teal-600",
  communication: "text-cyan-600",
  call: "text-orange-600",
  supervisor: "text-rose-600",
  retention: "text-green-600",
  knowledge_base: "text-amber-600",
  security: "text-red-600",
  system: "text-slate-600",
  campaign: "text-blue-500",
};

// ── User Access Management data ────────────────────────────────────
const appModules = [
  { id: "dashboard", name: "Dashboard" },
  { id: "clients", name: "Clients & Leads" },
  { id: "pipeline", name: "Sales Pipeline" },
  { id: "calendar", name: "Calendar" },
  { id: "policies", name: "Policies & Commissions" },
  { id: "reconciliation", name: "Reconciliation" },
  { id: "dialer", name: "Softphone" },
  { id: "supervisor", name: "Supervisor" },
  { id: "quoting", name: "Quoting Engine" },
  { id: "documents", name: "Documents" },
  { id: "workflows", name: "Workflow Automation" },
  { id: "data-tools", name: "Import / Export" },
  { id: "email-campaigns", name: "Email Campaigns" },
  { id: "client-portal", name: "Client Portal" },
  { id: "reporting", name: "Reporting" },
  { id: "agents", name: "Agents" },
  { id: "backoffice", name: "Agent Backoffice" },
  { id: "admin", name: "Admin" },
  { id: "retention", name: "Retention" },
  { id: "compliance", name: "Compliance" },
  { id: "compliance-center", name: "Compliance Center" },
  { id: "security", name: "Security" },
  { id: "knowledge-base", name: "Knowledge Base" },
] as const;

type RoleId = "admin" | "supervisor" | "agent" | "retention" | "readonly";

const roleConfig: Record<RoleId, { label: string; color: string; bg: string }> = {
  admin: { label: "Administrator", color: "text-navy-700", bg: "bg-navy-100" },
  supervisor: { label: "Supervisor", color: "text-purple-700", bg: "bg-purple-100" },
  agent: { label: "Agent", color: "text-teal-700", bg: "bg-teal-100" },
  retention: { label: "Retention Specialist", color: "text-amber-700", bg: "bg-amber-100" },
  readonly: { label: "Read-Only / Auditor", color: "text-muted-foreground", bg: "bg-muted" },
};

interface UserAccess {
  id: string;
  name: string;
  email: string;
  role: RoleId;
  active: boolean;
  lastActive: string;
  permissions: Record<string, boolean>;
}

const allTrue = Object.fromEntries(appModules.map((m) => [m.id, true])) as Record<string, boolean>;
const agentPerms = Object.fromEntries(
  appModules.map((m) => [m.id, ["dashboard", "clients", "calendar", "policies", "dialer", "knowledge-base"].includes(m.id)]),
) as Record<string, boolean>;
const supPerms = Object.fromEntries(
  appModules.map((m) => [m.id, m.id !== "admin"]),
) as Record<string, boolean>;
const readonlyPerms = Object.fromEntries(
  appModules.map((m) => [m.id, ["dashboard", "compliance", "security"].includes(m.id)]),
) as Record<string, boolean>;

const initialUsers: UserAccess[] = [
  { id: "u1", name: "Lang (CTO)", email: "lang@agencybridge.com", role: "admin", active: true, lastActive: "2 min ago", permissions: { ...allTrue } },
  { id: "u2", name: "Megan Hutton", email: "megan@agencybridge.com", role: "admin", active: true, lastActive: "1 hr ago", permissions: { ...allTrue } },
  { id: "u3", name: "Ryan Mitchell", email: "ryan@agencybridge.com", role: "supervisor", active: true, lastActive: "5 min ago", permissions: { ...supPerms } },
  { id: "u4", name: "Miguel Torres", email: "miguel@agencybridge.com", role: "supervisor", active: true, lastActive: "30 min ago", permissions: { ...supPerms } },
  { id: "u5", name: "Sarah Chen", email: "sarah@agencybridge.com", role: "agent", active: true, lastActive: "12 min ago", permissions: { ...agentPerms } },
  { id: "u6", name: "Marcus Johnson", email: "marcus@agencybridge.com", role: "agent", active: true, lastActive: "3 hr ago", permissions: { ...agentPerms } },
  { id: "u7", name: "Diana Reyes", email: "diana@agencybridge.com", role: "agent", active: false, lastActive: "2 days ago", permissions: { ...agentPerms } },
  { id: "u8", name: "External Auditor", email: "auditor@firm.com", role: "readonly", active: true, lastActive: "1 week ago", permissions: { ...readonlyPerms } },
];

export default function SecurityPage() {
  const { user, role } = useRole();
  const [soc2Controls, setSoc2Controls] = useState<ControlRow[]>(initialSoc2Controls);
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [integrity, setIntegrity] = useState<AuditIntegrityResult>({ valid: true, brokenAt: null, truncated: false });

  // ── Live event stream state ──────────────────────────────────────
  const [liveStream, setLiveStream] = useState<AuditEntry[]>([]);
  const [streamPaused, setStreamPaused] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const maxStreamItems = 50;

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_security_dashboard", category: "security", entity: "Security Page", severity: "info" });
    setLog(getAuditLog());
    setIntegrity(verifyAuditIntegrity());
  }, []);

  // Subscribe to real-time audit events (same-tab + cross-tab via BroadcastChannel)
  useEffect(() => {
    const unsub = subscribeAuditLog((entry) => {
      setLog((prev) => {
        // Avoid duplicates from cross-tab broadcast + storage sync
        if (prev.some((e) => e.id === entry.id)) return prev;
        return [...prev, entry];
      });
      setLiveStream((prev) => {
        if (prev.some((e) => e.id === entry.id)) return prev;
        if (streamPausedRef.current) return prev;
        return [...prev, entry].slice(-maxStreamItems);
      });
    });
    return unsub;
  }, []);

  // Keep a ref of pause state so the subscription closure always reads current value
  // without needing to re-subscribe on every toggle
  const streamPausedRef = useRef(false);
  useEffect(() => { streamPausedRef.current = streamPaused; }, [streamPaused]);

  // Auto-scroll stream to bottom on new entries
  useEffect(() => {
    if (streamRef.current && !streamPaused) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [liveStream, streamPaused]);

  const filteredLog = useMemo(() => {
    return log
      .filter((e) => categoryFilter === "all" || e.category === categoryFilter)
      .filter((e) => severityFilter === "all" || e.severity === severityFilter)
      .filter((e) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          e.action.toLowerCase().includes(s) ||
          e.actor.toLowerCase().includes(s) ||
          e.entity.toLowerCase().includes(s) ||
          e.details.toLowerCase().includes(s)
        );
      })
      .reverse();
  }, [log, search, categoryFilter, severityFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = log.length;
    const bySeverity = {
      info: log.filter((e) => e.severity === "info").length,
      warning: log.filter((e) => e.severity === "warning").length,
      critical: log.filter((e) => e.severity === "critical").length,
      success: log.filter((e) => e.severity === "success").length,
    };
    const today = new Date().toISOString().split("T")[0];
    const todayCount = log.filter((e) => e.timestamp.startsWith(today)).length;
    return { total, bySeverity, todayCount };
  }, [log]);

  // SOC 2 coverage stats
  const soc2Stats = useMemo(() => {
    const total = soc2Controls.length;
    const compliant = soc2Controls.filter((c) => c.status === "compliant").length;
    const partial = soc2Controls.filter((c) => c.status === "partial").length;
    const missing = soc2Controls.filter((c) => c.status === "missing").length;
    const inherited = soc2Controls.filter((c) => c.status === "inherited").length;
    const coveragePct = Math.round(((compliant + inherited) / total) * 100);
    return { total, compliant, partial, missing, inherited, coveragePct };
  }, [soc2Controls]);

  const groupedControls = useMemo(() => {
    const groups: Record<string, ControlRow[]> = {};
    soc2Controls.forEach((c) => {
      if (!groups[c.category]) groups[c.category] = [];
      groups[c.category].push(c);
    });
    return groups;
  }, [soc2Controls]);

  // ── Gap analysis: per-category stoplight ──────────────────────────
  const gapAnalysis = useMemo(() => {
    return Object.entries(groupedControls).map(([category, controls]) => {
      const total = controls.length;
      const compliant = controls.filter((c) => c.status === "compliant").length;
      const inherited = controls.filter((c) => c.status === "inherited").length;
      const partial = controls.filter((c) => c.status === "partial").length;
      const missing = controls.filter((c) => c.status === "missing").length;
      const coveragePct = Math.round(((compliant + inherited) / total) * 100);
      // Stoplight: green ≥80%, yellow 50-79%, red <50%
      const stoplight: "green" | "yellow" | "red" =
        missing > 0 && coveragePct < 50 ? "red" :
        coveragePct >= 80 ? "green" : "yellow";
      // Audit-readiness: missing items are critical, partial are gaps
      const criticalGaps = controls.filter((c) => c.status === "missing").map((c) => `${c.id}: ${c.evidence}`);
      const partialGaps = controls.filter((c) => c.status === "partial").map((c) => `${c.id}: ${c.evidence}`);
      return { category, total, compliant, inherited, partial, missing, coveragePct, stoplight, criticalGaps, partialGaps };
    });
  }, [groupedControls]);

  const stoplightConfig = {
    green: { label: "On Track", color: "text-success", bg: "bg-success/10", border: "border-success/30", bar: "bg-success", icon: CheckCircle2 },
    yellow: { label: "At Risk", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", bar: "bg-warning", icon: AlertTriangle },
    red: { label: "Critical Gap", color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", bar: "bg-destructive", icon: ShieldAlert },
  };

  // ── Auditor walkthrough narrative generator ─────────────────────────
  // Mode 3 of the SOC 2 evidence collector skill: generates a 5–10 sentence
  // narrative answering "walk me through how you do X" in auditor style:
  // who, what, when, what evidence, what happens on exception.

  function generateWalkthrough(control: ControlRow): string {
    const ownerMap: Record<string, string> = {
      "Control Environment": "Megan Hutton (COO) and Lang (CTO)",
      "Communication": "Megan Hutton (COO)",
      "Risk Assessment": "Lang (CTO)",
      "Monitoring": "Ryan (DevOps Lead)",
      "Control Activities": "Lang (CTO)",
      "Logical Access": "Ryan (DevOps Lead)",
      "System Operations": "Ryan (DevOps Lead)",
      "Change Management": "Miguel (Engineering Lead)",
      "Risk Mitigation": "Lang (CTO)",
      "Availability": "Ryan (DevOps Lead)",
      "Confidentiality": "Lang (CTO)",
    };
    const owner = ownerMap[control.category] || "Lang (CTO)";
    const who = control.id.startsWith("CC6") || control.id.startsWith("CC7")
      ? "Ryan (DevOps Lead) is the primary owner"
      : control.id.startsWith("CC8")
        ? "Miguel (Engineering Lead) is the primary owner"
        : control.id.startsWith("CC1") || control.id.startsWith("CC2")
          ? "Megan Hutton (COO) is the primary owner"
          : "Lang (CTO) is the primary owner";

    const statusNarrative: Record<ControlRow["status"], string> = {
      compliant: `The evidence artifact for this control is present and current. Specifically, ${control.evidence.toLowerCase()}. This artifact is stored in our policy library and version-controlled via Git, so any changes are traceable to a specific commit and reviewer. The control owner (${owner}) reviews it on a quarterly basis as part of our internal control review cycle. During the audit window, the auditor can be provided with the raw artifact — a config export, log extract, or signed document — rather than a screenshot. No exceptions or findings have been identified for this control in the most recent internal review.`,
      partial: `This control has partial evidence coverage. We have ${control.evidence.toLowerCase()}, but the evidence is not yet complete enough to fully satisfy the control criteria. The control owner (${owner}) is actively working to close the remaining gap. The current evidence is available for auditor review, and a remediation timeline has been documented in our risk register. On exception — if an auditor identifies a deficiency — we would classify it as a control deficiency and document a remediation plan with a target completion date. We expect this control to reach full compliance before the Type I audit window closes.`,
      missing: `This control currently has no evidence artifact in place. ${control.evidence} The control owner (${owner}) has been notified and a remediation task has been created in our project tracking system. We would disclose this as a known gap to the auditor rather than attempting to retroactively document it. If this control is in scope for Type I, we would request that the auditor treat it as a design deficiency with a documented remediation plan. No compensating control is currently in place, though we are evaluating whether the AWS inherited controls partially address the underlying risk.`,
      inherited: `This control is inherited from our cloud infrastructure provider (AWS). ${control.evidence} We rely on AWS's own SOC 2 Type II report as the evidence artifact, which we obtain annually via AWS Artifact. The inheritance is documented in our vendor management register, and we review the AWS SOC report each year as part of our vendor risk review process (CC9.2). We do not duplicate the underlying AWS controls — instead, we document the mapping between our control criteria and the corresponding AWS control in the report. If the auditor requires additional evidence beyond the AWS SOC report, we can provide the relevant sections of the report or request a bridge letter from AWS.`,
    };

    const exceptionFlow = `If an exception is detected — for example, a failed access review or a missed vulnerability scan — the control owner documents it in our risk register within 48 hours, assigns a severity level, and creates a remediation task with a target completion date. Critical exceptions are escalated to Lang (CTO) and Megan Hutton (COO) within 24 hours. The exception and its resolution are reviewed in the next quarterly internal control review meeting (CC4.2).`;

    return `${who}. ${control.name} (${control.id}) is performed as part of our SOC 2 control framework under the ${control.category} Trust Services Criterion. ${statusNarrative[control.status]} ${exceptionFlow} The evidence for this control is tied to a named owner (${owner}) and can be provided to the auditor as a raw artifact — a log export, config-as-code commit hash, or signed document — rather than a screenshot, per our evidence quality standards. The control is reviewed at least quarterly as part of our internal control review cycle (CC4.2), and any changes to the control design are documented through our change management process (CC8.1).`;
  }

  // ── Walkthrough rehearsal state ────────────────────────────────────
  const [walkthroughControlId, setWalkthroughControlId] = useState<string>("");
  const [walkthroughText, setWalkthroughText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const walkthroughControl = useMemo(
    () => soc2Controls.find((c) => c.id === walkthroughControlId) || null,
    [walkthroughControlId],
  );

  const handleGenerateWalkthrough = () => {
    if (!walkthroughControl) return;
    const narrative = generateWalkthrough(walkthroughControl);
    setWalkthroughText(narrative);
    setCopied(false);
    logAudit({
      actor: "admin", actorId: "admin-001",
      action: "generated_walkthrough_narrative",
      category: "security", entity: walkthroughControl.id,
      entityId: walkthroughControl.id,
      severity: "info",
      details: `Auditor walkthrough rehearsal generated for ${walkthroughControl.id} — ${walkthroughControl.name}`,
    });
  };

  const handleCopyWalkthrough = () => {
    if (!walkthroughText) return;
    navigator.clipboard.writeText(walkthroughText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportWalkthrough = () => {
    if (!walkthroughText || !walkthroughControl) return;
    const md = `# Auditor Walkthrough — ${walkthroughControl.id}: ${walkthroughControl.name}\n\n**Category:** ${walkthroughControl.category}\n**Status:** ${walkthroughControl.status}\n**Evidence:** ${walkthroughControl.evidence}\n\n---\n\n${walkthroughText}\n`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `walkthrough-${walkthroughControl.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    logAudit({
      actor: "admin", actorId: "admin-001",
      action: "exported_walkthrough_narrative",
      category: "security", entity: walkthroughControl.id,
      entityId: walkthroughControl.id,
      severity: "info",
      details: `Walkthrough narrative exported as markdown for ${walkthroughControl.id}`,
    });
  };

  // ── User Access Management state & handlers ────────────────────────
  const [users, setUsers] = useState<UserAccess[]>(initialUsers);

  const handleTogglePermission = (userId: string, moduleId: string) => {
    const user = users.find((u) => u.id === userId);
    const mod = appModules.find((m) => m.id === moduleId);
    const newValue = !(user?.permissions[moduleId]);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, permissions: { ...u.permissions, [moduleId]: newValue } } : u,
      ),
    );
    logAudit({
      actor: "admin", actorId: "admin-001",
      action: newValue ? "granted_module_access" : "revoked_module_access",
      category: "security",
      entity: mod?.name || moduleId,
      entityId: userId,
      severity: newValue ? "info" : "warning",
      details: `${newValue ? "Granted" : "Revoked"} ${mod?.name} access for ${user?.name}`,
    });
  };

  const handleRoleChange = (userId: string, newRole: RoleId) => {
    const user = users.find((u) => u.id === userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    logAudit({
      actor: "admin", actorId: "admin-001",
      action: "changed_user_role",
      category: "security",
      entity: user?.name || userId,
      entityId: userId,
      severity: "warning",
      details: `Changed ${user?.name} role from ${roleConfig[user!.role].label} to ${roleConfig[newRole].label}`,
    });
  };

  const handleToggleActive = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, active: !u.active } : u)));
    logAudit({
      actor: "admin", actorId: "admin-001",
      action: user?.active ? "deactivated_user" : "activated_user",
      category: "security",
      entity: user?.name || userId,
      entityId: userId,
      severity: "critical",
      details: `${user?.active ? "Deactivated" : "Activated"} user ${user?.name}`,
    });
  };

  const handleExport = () => {
    logAudit({ actor: "admin", actorId: "admin-001", action: "exported_audit_log", category: "security", entity: "Audit Log", severity: "warning", details: "CSV export of full audit trail" });
    const csv = exportAuditCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLog(getAuditLog());
  };

  const handleVerify = () => {
    const result = verifyAuditIntegrity();
    setIntegrity(result);
    logAudit({
      actor: "admin", actorId: "admin-001",
      action: result.valid ? "audit_integrity_verified" : "audit_integrity_broken",
      category: "security", entity: "Audit Log",
      severity: result.valid ? "success" : "critical",
      details: result.valid ? "Hash chain verified — no tampering detected" : `Tampering detected at entry ${result.brokenAt}`,
    });
    setLog(getAuditLog());
  };

  const handleClear = () => {
    // clearAuditLog re-seeds the emptied chain with a genesis entry recording who
    // cleared it, so the erasure stays auditable — read the log back rather than
    // assuming it is empty.
    const result = clearAuditLog(role ?? undefined, user?.name ?? "unknown", user?.id ?? "unknown");
    if (!result.success) return;
    setLog(getAuditLog());
    setLiveStream([]);
    setIntegrity(verifyAuditIntegrity());
  };

  // ── Remediation: mark control as resolved ──────────────────────────
  const [resolvedActions, setResolvedActions] = useState<Set<string>>(new Set());
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const handleResolveAction = (action: RemediationAction) => {
    const key = action.controlIds.join(",");
    const isResolved = resolvedActions.has(key);
    setResolvedActions((prev) => {
      const next = new Set(prev);
      if (isResolved) next.delete(key);
      else next.add(key);
      return next;
    });

    // Update control statuses to compliant
    setSoc2Controls((prev) =>
      prev.map((c) =>
        action.controlIds.includes(c.id)
          ? { ...c, status: "compliant" as const, evidence: `${c.evidence} — remediated ${new Date().toISOString().split("T")[0]}` }
          : c,
      ),
    );

    logAudit({
      actor: "admin", actorId: "admin-001",
      action: isResolved ? "reopened_remediation" : "resolved_remediation",
      category: "security",
      entity: action.title,
      entityId: action.controlIds.join(", "),
      severity: isResolved ? "warning" : "success",
      details: `${isResolved ? "Reopened" : "Resolved"} remediation for ${action.controlIds.join(", ")} — ${action.title}`,
    });
  };

  const nonCompliantControls = useMemo(
    () => soc2Controls.filter((c) => c.status === "partial" || c.status === "missing"),
    [soc2Controls],
  );

  const openRemediationActions = useMemo(
    () => remediationActions.filter((a) => !resolvedActions.has(a.controlIds.join(","))),
    [resolvedActions],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & SOC 2 Compliance"
        description="Audit logging, access controls, and Trust Services Criteria evidence management"
      />

      {/* ── Security posture summary ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-navy-gradient text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">SOC 2 Coverage</p>
                <p className="text-3xl font-display font-bold mt-1">{soc2Stats.coveragePct}%</p>
                <p className="text-xs text-white/50 mt-1">{soc2Stats.compliant + soc2Stats.inherited} of {soc2Stats.total} controls</p>
              </div>
              <ShieldCheck className="h-10 w-10 text-white/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Audit Events</p>
                <p className="text-3xl font-display font-bold mt-1 text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.todayCount} today</p>
              </div>
              <Activity className="h-10 w-10 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chain Integrity</p>
                <p className={`text-2xl font-display font-bold mt-1 ${integrity.valid ? "text-success" : "text-destructive"}`}>
                  {integrity.valid ? "Verified" : "Broken"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {!integrity.valid
                    ? `Broken at #${integrity.brokenAt}`
                    : integrity.truncated
                      ? "No tampering detected in retained window"
                      : "No tampering detected"}
                </p>
              </div>
              {integrity.valid ? <Lock className="h-10 w-10 text-success/30" /> : <ShieldAlert className="h-10 w-10 text-destructive/30" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Events</p>
                <p className="text-3xl font-display font-bold mt-1 text-destructive">{stats.bySeverity.critical}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.bySeverity.warning} warnings</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── SOC 2 Controls Visual Grid ─────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-navy-600" />
              SOC 2 Trust Services Criteria — Evidence Map
            </CardTitle>
            <Badge variant="default" className="bg-navy-700 text-white">
              {soc2Stats.compliant} Compliant · {soc2Stats.partial} Partial · {soc2Stats.missing} Missing · {soc2Stats.inherited} Inherited
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {Object.entries(groupedControls).map(([category, controls]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span className="inline-block w-1.5 h-4 bg-navy-500 rounded-full" />
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {controls.map((ctrl) => {
                    const sc = statusConfig[ctrl.status];
                    const Icon = ctrl.icon;
                    return (
                      <div
                        key={ctrl.id}
                        className={`rounded-lg border p-3 ${sc.bg} border-border/60 hover:border-navy-400 transition-colors`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-mono font-bold text-foreground">{ctrl.id}</p>
                              <p className="text-xs text-muted-foreground truncate">{ctrl.name}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${sc.color} shrink-0`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80 mt-2 leading-relaxed">{ctrl.evidence}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── SOC 2 Evidence Gap Analysis ─────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-navy-600" />
              SOC 2 Evidence Gap Analysis
              <Badge variant="secondary" className="font-mono">{gapAnalysis.length} criteria</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-success" /> On Track</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-warning" /> At Risk</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-destructive" /> Critical Gap</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary stoplight bar */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-center">
              <p className="text-2xl font-display font-bold text-success">{gapAnalysis.filter((g) => g.stoplight === "green").length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">On Track</p>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-center">
              <p className="text-2xl font-display font-bold text-warning">{gapAnalysis.filter((g) => g.stoplight === "yellow").length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">At Risk</p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center">
              <p className="text-2xl font-display font-bold text-destructive">{gapAnalysis.filter((g) => g.stoplight === "red").length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Critical Gap</p>
            </div>
          </div>

          {/* Per-category stoplight rows */}
          <div className="space-y-2.5">
            {gapAnalysis.map((gap) => {
              const sc = stoplightConfig[gap.stoplight];
              const StopIcon = sc.icon;
              return (
                <div key={gap.category} className={`rounded-lg border ${sc.border} ${sc.bg} p-3`}>
                  <div className="flex items-center gap-3">
                    <StopIcon className={`h-5 w-5 ${sc.color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{gap.category}</p>
                        <span className={`text-xs font-bold uppercase ${sc.color} shrink-0`}>{sc.label}</span>
                      </div>
                      {/* Coverage bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${sc.bar} transition-all duration-500`} style={{ width: `${gap.coveragePct}%` }} />
                        </div>
                        <span className="text-xs font-mono text-muted-foreground shrink-0 w-10 text-right">{gap.coveragePct}%</span>
                      </div>
                      {/* Detail chips */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/15 text-success">{gap.compliant} compliant</span>
                        {gap.inherited > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{gap.inherited} inherited</span>}
                        {gap.partial > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/15 text-warning">{gap.partial} partial</span>}
                        {gap.missing > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">{gap.missing} missing</span>}
                      </div>
                      {/* Gap details (expandable inline) */}
                      {(gap.criticalGaps.length > 0 || gap.partialGaps.length > 0) && (
                        <div className="mt-2 space-y-1">
                          {gap.criticalGaps.map((g, i) => (
                            <p key={`crit-${i}`} className="text-[11px] text-destructive/90 flex items-start gap-1.5">
                              <ShieldAlert className="h-3 w-3 mt-0.5 shrink-0" /> {g}
                            </p>
                          ))}
                          {gap.partialGaps.map((g, i) => (
                            <p key={`part-${i}`} className="text-[11px] text-warning/90 flex items-start gap-1.5">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {g}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Audit-readiness summary */}
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-navy-50 border border-navy-200 px-4 py-3">
            <FileCheck2 className="h-4 w-4 text-navy-600 shrink-0" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">Audit Readiness:</span>{" "}
              {gapAnalysis.filter((g) => g.stoplight === "green").length} of {gapAnalysis.length} criteria are on track for Type I.
              {gapAnalysis.filter((g) => g.stoplight === "red").length > 0 && (
                <span className="text-destructive font-medium"> {gapAnalysis.filter((g) => g.stoplight === "red").length} critical {gapAnalysis.filter((g) => g.stoplight === "red").length === 1 ? "gap" : "gaps"} require immediate evidence collection.</span>
              )}
              {gapAnalysis.filter((g) => g.stoplight === "red").length === 0 && gapAnalysis.filter((g) => g.stoplight === "yellow").length > 0 && (
                <span className="text-warning font-medium"> {gapAnalysis.filter((g) => g.stoplight === "yellow").length} {gapAnalysis.filter((g) => g.stoplight === "yellow").length === 1 ? "criterion needs" : "criteria need"} attention before audit window.</span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Compliance Remediation Center ─────────────────────────── */}
      <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Compliance Remediation Center
              <Badge variant="destructive" className="font-mono">
                {openRemediationActions.length} open
              </Badge>
              {resolvedActions.size > 0 && (
                <Badge variant="default" className="font-mono bg-success text-success-foreground">
                  {resolvedActions.size} resolved
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {nonCompliantControls.length} non-compliant controls require action
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {openRemediationActions.length === 0 && resolvedActions.size === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-success/30 mb-3" />
              <p className="text-sm text-muted-foreground">All SOC 2 controls are compliant. No remediation actions needed.</p>
            </div>
          )}

          {openRemediationActions.length === 0 && resolvedActions.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 px-4 py-3 mb-4">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <p className="text-sm text-success font-medium">
                All remediation actions resolved. {nonCompliantControls.length} controls remaining non-compliant.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {openRemediationActions.map((action) => {
              const isExpanded = expandedAction === action.controlIds.join(",");
              const controls = action.controlIds.map((id) => soc2Controls.find((c) => c.id === id)).filter(Boolean) as ControlRow[];
              const hasMissing = controls.some((c) => c.status === "missing");
              return (
                <div
                  key={action.controlIds.join(",")}
                  className={`rounded-lg border ${hasMissing ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"} overflow-hidden`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {action.controlIds.map((id) => {
                            const ctrl = soc2Controls.find((c) => c.id === id);
                            const sc = ctrl ? statusConfig[ctrl.status] : null;
                            return (
                              <span key={id} className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${sc?.bg} ${sc?.color}`}>
                                {id}
                              </span>
                            );
                          })}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${hasMissing ? "text-destructive" : "text-warning"}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${hasMissing ? "bg-destructive" : "bg-warning"}`} />
                            {hasMissing ? "Missing" : "Partial"}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {action.owner}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due {action.targetDate}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedAction(isExpanded ? null : action.controlIds.join(","))}
                        >
                          {isExpanded ? "Hide Steps" : "View Steps"}
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-success hover:bg-success/90 text-success-foreground"
                          onClick={() => handleResolveAction(action)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Resolved
                        </Button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Remediation Steps</p>
                        <ol className="space-y-1.5">
                          {action.steps.map((step, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-navy-100 text-navy-700 text-[10px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-navy-50 border border-navy-200 px-3 py-2">
                          <FileText className="h-3.5 w-3.5 text-navy-600 shrink-0" />
                          <p className="text-[11px] text-foreground">
                            <span className="font-semibold">Evidence required:</span> {controls.map((c) => c.evidence).join("; ")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Resolved actions */}
            {resolvedActions.size > 0 && (
              <div className="pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resolved Actions</p>
                {remediationActions.filter((a) => resolvedActions.has(a.controlIds.join(","))).map((action) => (
                  <div key={action.controlIds.join(",")} className="rounded-lg border border-success/20 bg-success/5 p-3 mb-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          {action.controlIds.map((id) => (
                            <span key={id} className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-success/15 text-success">
                              {id}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm font-medium text-foreground line-through opacity-70">{action.title}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => handleResolveAction(action)}
                      >
                        Reopen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Auditor Walkthrough Rehearsal ─────────────────────────── */}
      <Card className="border-navy-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-navy-600" />
              Auditor Walkthrough Rehearsal
              <Badge variant="secondary" className="font-mono">{soc2Controls.length} controls</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Mode 3 — generates a narrative answer for "walk me through how you do X"
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Control selector */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Select a control
                </label>
                <Select value={walkthroughControlId} onValueChange={setWalkthroughControlId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a SOC 2 control to rehearse..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {Object.entries(groupedControls).map(([category, controls]) => (
                      <div key={category}>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 py-1.5 sticky top-0 bg-popover z-10">
                          {category}
                        </p>
                        {controls.map((ctrl) => {
                          const sc = statusConfig[ctrl.status];
                          return (
                            <SelectItem key={ctrl.id} value={ctrl.id}>
                              <span className="flex items-center gap-2">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                <span className="font-mono text-xs">{ctrl.id}</span>
                                <span className="text-xs">{ctrl.name}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateWalkthrough}
                disabled={!walkthroughControl}
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4 mr-1.5" /> Generate Narrative
              </Button>
            </div>

            {/* Selected control info chip */}
            {walkthroughControl && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase ${statusConfig[walkthroughControl.status].color}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${statusConfig[walkthroughControl.status].dot}`} />
                  {statusConfig[walkthroughControl.status].label}
                </span>
                <span className="text-sm font-mono font-bold text-foreground">{walkthroughControl.id}</span>
                <span className="text-sm text-muted-foreground">{walkthroughControl.name}</span>
                <span className="text-xs text-muted-foreground/70 ml-auto truncate hidden md:block">{walkthroughControl.evidence}</span>
              </div>
            )}

            {/* Narrative output */}
            {walkthroughText && (
              <div className="rounded-lg border border-navy-200 bg-navy-50/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-navy-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Auditor Narrative
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" onClick={handleCopyWalkthrough} className="h-7 text-xs">
                      {copied ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-success" /> Copied</> : <><Copy className="h-3.5 w-3.5 mr-1" /> Copy</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleExportWalkthrough} className="h-7 text-xs">
                      <Download className="h-3.5 w-3.5 mr-1" /> Export .md
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {walkthroughText}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!walkthroughText && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a control above and click "Generate Narrative" to rehearse an auditor walkthrough.
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Each narrative covers who owns the control, what evidence exists, when it's reviewed, and what happens on exception.
                </p>
              </div>
            )}

            {/* Tip */}
            <div className="flex items-start gap-2 rounded-lg bg-navy-50 border border-navy-200 px-3 py-2.5">
              <FileCheck2 className="h-4 w-4 text-navy-600 shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                <span className="font-semibold">Tip:</span> Use this mode to rehearse before your audit. Generate narratives for every control the auditor will sample, then review them with the named control owner to confirm accuracy. Narratives for partial and missing controls include honest gap disclosure — never invent evidence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── User Access Management ─────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-navy-600" />
              User Access Management
              <Badge variant="secondary" className="font-mono">{users.length} users</Badge>
            </CardTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> {users.filter((u) => u.active).length} Active</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground" /> {users.filter((u) => !u.active).length} Inactive</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Role-based routing notice */}
          <div className="flex items-start gap-2 rounded-lg bg-navy-50 border border-navy-200 px-4 py-3 mb-4">
            <KeyRound className="h-4 w-4 text-navy-600 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">Role-Based Access Control (RBAC):</span> Each role is scoped to specific routes.
              Admins access all modules. Supervisors see everything except Admin and Security. Agents see Dashboard, Clients, Calendar, Policies, Dialer, Backoffice, and Knowledge Base.
              Read-Only/Auditor users see Dashboard, Compliance, and Security only. Switch roles via the user menu in the top bar to test scope enforcement.
            </p>
          </div>
          {/* Role legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(Object.entries(roleConfig) as [RoleId, typeof roleConfig[RoleId]][]).map(([id, rc]) => (
              <span key={id} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${rc.bg} ${rc.color}`}>
                <span className="inline-block w-2 h-2 rounded-full bg-current opacity-60" />
                {rc.label} ({users.filter((u) => u.role === id).length})
              </span>
            ))}
          </div>

          {/* Permission matrix */}
          <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                <tr className="text-left">
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider sticky left-0 bg-muted/80 backdrop-blur z-20 min-w-[180px]">User</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider min-w-[130px]">Role</th>
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider min-w-[90px]">Status</th>
                  {appModules.map((m) => (
                    <th key={m.id} className="px-2 py-2.5 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider text-center min-w-[64px]" title={m.name}>
                      {m.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => {
                  const rc = roleConfig[user.role];
                  return (
                    <tr key={user.id} className={`hover:bg-muted/40 transition-colors ${!user.active ? "opacity-50" : ""}`}>
                      <td className="px-3 py-2.5 sticky left-0 bg-background z-10">
                        <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <p className="text-[10px] text-muted-foreground/60">Active {user.lastActive}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v as RoleId)}>
                          <SelectTrigger className="h-8 w-full min-w-[110px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(roleConfig) as [RoleId, typeof roleConfig[RoleId]][]).map(([id, r]) => (
                              <SelectItem key={id} value={id} className="text-xs">{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Switch checked={user.active} onCheckedChange={() => handleToggleActive(user.id)} />
                          <span className={`text-xs font-medium ${user.active ? "text-success" : "text-muted-foreground"}`}>
                            {user.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      {appModules.map((m) => (
                        <td key={m.id} className="px-2 py-2.5 text-center">
                          <Switch
                            checked={user.permissions[m.id]}
                            onCheckedChange={() => handleTogglePermission(user.id, m.id)}
                            className="scale-75 inline-flex"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Access summary */}
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-navy-50 border border-navy-200 px-4 py-3">
            <KeyRound className="h-4 w-4 text-navy-600 shrink-0" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">Access Summary:</span>{" "}
              {users.filter((u) => u.active).length} active users across {Object.keys(roleConfig).length} roles.
              Module-level toggles override role defaults — all changes are logged to the audit trail in real time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Live Event Stream ─────────────────────────────────── */}
      <Card className="border-navy-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Radio className={`h-5 w-5 ${streamPaused ? "text-muted-foreground" : "text-navy-600 animate-pulse"}`} />
              Real-Time Event Stream
              <Badge variant={liveStream.length > 0 ? "default" : "secondary"} className="font-mono">
                {streamPaused ? "Paused" : "Live"}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${typeof BroadcastChannel !== "undefined" ? "bg-green-500" : "bg-amber-500"}`} />
                {typeof BroadcastChannel !== "undefined" ? "Cross-tab" : "Same-tab"}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  logAudit({
                    actor: "supervisor", actorId: "sup-001",
                    action: `test_ping_${Math.floor(Math.random() * 1000)}`,
                    category: "security", entity: "Event Stream",
                    severity: "info", details: "Supervisor sent a test event to verify the live stream",
                  });
                }}
              >
                <Activity className="h-4 w-4 mr-1.5" /> Test Event
              </Button>
              <Button
                size="sm"
                variant={streamPaused ? "default" : "outline"}
                onClick={() => {
                  setStreamPaused((p) => !p);
                  logAudit({ actor: "admin", actorId: "admin-001", action: streamPaused ? "resumed_event_stream" : "paused_event_stream", category: "security", entity: "Live Stream", severity: "info" });
                }}
              >
                {streamPaused ? <><Play className="h-4 w-4 mr-1.5" /> Resume</> : <><Pause className="h-4 w-4 mr-1.5" /> Pause</>}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={streamRef}
            className="h-[280px] overflow-y-auto scrollbar-thin rounded-lg border border-border bg-navy-950/40 p-3 space-y-1.5 font-mono"
          >
            {liveStream.length === 0 && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <Radio className="h-4 w-4 mr-2 animate-pulse" />
                Waiting for live events... navigate the app to generate audit actions
              </div>
            )}
            {liveStream.map((entry, idx) => {
              const sevColor = {
                info: "text-blue-400",
                warning: "text-amber-400",
                critical: "text-red-400",
                success: "text-green-400",
              }[entry.severity];
              const sevBg = {
                info: "bg-blue-500/10",
                warning: "bg-amber-500/10",
                critical: "bg-red-500/10",
                success: "bg-green-500/10",
              }[entry.severity];
              return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-2 rounded px-2 py-1.5 text-xs ${sevBg} ${idx === liveStream.length - 1 ? "animate-in fade-in slide-in-from-bottom-1 duration-300" : ""}`}
                >
                  <span className="text-muted-foreground/60 shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                  <span className={`shrink-0 font-bold uppercase ${sevColor}`}>{entry.severity}</span>
                  <span className="text-cyan-400 shrink-0">[{entry.category}]</span>
                  <span className="text-foreground/90 truncate">{entry.action}</span>
                  <span className="text-muted-foreground/50 ml-auto shrink-0">{entry.actor}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${streamPaused ? "bg-muted-foreground" : "bg-green-500 animate-pulse"}`} />
            {streamPaused
              ? "Stream paused — events are still being logged but not displayed here"
              : `Streaming live across all tabs — ${liveStream.length} of ${maxStreamItems} most recent events shown. Open this page in another tab to see cross-tab push.`}
          </p>
        </CardContent>
      </Card>

      {/* ── Audit Log Explorer ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-navy-600" />
              Elite Audit Log
              <Badge variant="secondary" className="font-mono">{stats.total} entries</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleVerify}>
                <Lock className="h-4 w-4 mr-1.5" /> Verify Chain
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
              <Button size="sm" variant="destructive" onClick={handleClear}>
                Clear Log
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, actors, entities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="communication">Communication</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="retention">Retention</SelectItem>
                <SelectItem value="knowledge_base">Knowledge Base</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Log table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Time</th>
                    <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Actor</th>
                    <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Action</th>
                    <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Category</th>
                    <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Entity</th>
                    <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Sev</th>
                    <th className="px-3 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLog.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">
                        No audit entries match the current filters.
                      </td>
                    </tr>
                  )}
                  {filteredLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className="font-medium text-foreground">{entry.actor}</span>
                        <span className="text-muted-foreground ml-1">({entry.actorId})</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{entry.action}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className={`font-semibold ${categoryColors[entry.category]}`}>{entry.category}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {entry.entity}
                        {entry.entityId && <span className="ml-1 font-mono text-[10px]">#{entry.entityId}</span>}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <Badge variant={severityConfig[entry.severity].variant} className="text-[10px] px-1.5 py-0">
                          {severityConfig[entry.severity].label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground/60 whitespace-nowrap">{entry.hash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Integrity banner */}
          {!integrity.valid && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive font-medium">
                Audit chain integrity broken at entry #{integrity.brokenAt}. Possible tampering detected. Investigate immediately.
              </p>
            </div>
          )}
          {integrity.valid && stats.total > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <p className="text-sm text-success font-medium">
                Hash chain integrity verified — all {stats.total} entries are tamper-free.
                {integrity.truncated && " Older entries have aged out of the local retention window and are outside this check."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Action Permissions Matrix ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Action-Level Permission Matrix
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Granular per-action permissions beyond route access. Each row is an action; each column is a role. Green = allowed, gray = denied.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Action</th>
                  {(["admin", "supervisor", "agent", "retention", "readonly"] as const).map((r) => (
                    <th key={r} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground capitalize">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(actionPermissions).map(([action, roles]) => (
                  <tr key={action} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs font-mono">{action}</td>
                    {(["admin", "supervisor", "agent", "retention", "readonly"] as const).map((r) => {
                      const allowed = roles.includes(r);
                      return (
                        <td key={r} className="px-3 py-2 text-center">
                          {allowed ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success/15">
                              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                            </span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {Object.keys(actionPermissions).length} actions defined · Unknown actions are denied by default.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
