import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import {
  Search, Download, FileSearch, AlertTriangle, DollarSign,
  Scale, Clock, FileWarning, ChevronDown, ChevronRight, ShieldAlert,
  TrendingDown, ArrowRightLeft, FileText, Receipt, CalendarClock, CheckCircle2,
  Upload, FileUp, FileSpreadsheet, Loader2, CheckCircle, Trash2,
  Activity, X, AlertOctagon, Landmark, BookOpen, ArrowDownToLine,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  commissionEvents, disputeRecords, carrierQuirks, reconciliationStats,
  agent1099Data, reconciliation1099Stats, anomalyAlerts,
  accountingMappings, buildTreasuryFeed, buildTreasurySummary, exportTreasuryCSV,
  type VarianceClass, type DisputeStatus, type ExportFormat,
} from "@/lib/mockData";
import { format, parseISO, differenceInDays } from "date-fns";

const varianceConfig: Record<VarianceClass, { label: string; color: string; bg: string }> = {
  paid_on_time: { label: "Paid on Time", color: "text-success", bg: "bg-success/10 border-success/30" },
  paid_late: { label: "Paid Late", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
  short_pay: { label: "Short Pay", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  over_pay: { label: "Over Pay", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
  chargeback_valid: { label: "Chargeback (Valid)", color: "text-muted-foreground", bg: "bg-muted border-border" },
  chargeback_disputable: { label: "Chargeback (Disputable)", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  missing: { label: "Missing Payment", color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  unexpected_payment: { label: "Unexpected Payment", color: "text-accent-foreground", bg: "bg-accent/20 border-accent/40" },
  split_mismatch: { label: "Split Mismatch", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
  tax_form_drift: { label: "1099 Drift", color: "text-warning", bg: "bg-warning/10 border-warning/30" },
};

const disputeStatusConfig: Record<DisputeStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-destructive/15 text-destructive border-destructive/30" },
  in_review: { label: "In Review", color: "bg-warning/15 text-warning border-warning/30" },
  resolved: { label: "Resolved", color: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", color: "bg-muted text-muted-foreground border-border" },
};

type UploadStatus = "parsing" | "extracting" | "complete" | "error";

interface UploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: "csv" | "pdf";
  carrier: string;
  status: UploadStatus;
  progress: number;
  eventsExtracted: number;
  variancesDetected: number;
  error?: string;
  uploadedAt: string;
}

const generateUploadId = () => `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const simulateParse = (item: UploadItem, setUploads: React.Dispatch<React.SetStateAction<UploadItem[]>>) => {
  // Phase 1: parsing
  let progress = 0;
  const parseInterval = setInterval(() => {
    progress += 12 + Math.random() * 8;
    setUploads(prev => prev.map(u => u.id === item.id ? { ...u, progress: Math.min(progress, 45), status: "parsing" } : u));
    if (progress >= 45) {
      clearInterval(parseInterval);
      // Phase 2: extracting events
      let extractProgress = 45;
      const extractInterval = setInterval(() => {
        extractProgress += 10 + Math.random() * 6;
        setUploads(prev => prev.map(u => u.id === item.id ? { ...u, progress: Math.min(extractProgress, 95), status: "extracting" } : u));
        if (extractProgress >= 95) {
          clearInterval(extractInterval);
          // Phase 3: complete with random results
          const events = Math.floor(15 + Math.random() * 120);
          const variances = Math.floor(Math.random() * 8);
          setUploads(prev => prev.map(u => u.id === item.id ? {
            ...u, progress: 100, status: "complete", eventsExtracted: events, variancesDetected: variances,
          } : u));
        }
      }, 250);
    }
  }, 200);
};

const handleFiles = (
  files: FileList | null,
  carrier: string,
  setUploads: React.Dispatch<React.SetStateAction<UploadItem[]>>,
  logFn: (entry: { actor: string; action: string; category: string; entity: string; severity: string }) => void,
) => {
  if (!files || files.length === 0) return;
  Array.from(files).forEach(file => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "pdf") return;
    const item: UploadItem = {
      id: generateUploadId(),
      fileName: file.name,
      fileSize: file.size,
      fileType: ext as "csv" | "pdf",
      carrier: carrier === "all" ? "Unassigned" : carrier,
      status: "parsing",
      progress: 0,
      eventsExtracted: 0,
      variancesDetected: 0,
      uploadedAt: new Date().toISOString(),
    };
    setUploads(prev => [item, ...prev]);
    logFn({ actor: "agent", action: "uploaded_carrier_statement", category: "commission", entity: file.name, severity: "info" });
    simulateParse(item, setUploads);
  });
};


export default function ReconciliationPage() {
  const { user } = useRole();
  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_reconciliation", category: "commission", entity: "Commission Reconciliation", severity: "info" });
  }, [user]);

  const [search, setSearch] = useState("");
  const [varianceFilter, setVarianceFilter] = useState("all");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);

  // ── Anomaly alert state ──
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const activeAlerts = useMemo(
    () => anomalyAlerts.filter(a => !dismissedAlerts.has(a.id)),
    [dismissedAlerts],
  );

  // ── Statement upload state ──
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCarrier, setUploadCarrier] = useState("all");

  // ── Treasury feed state ──
  const [exportFormat, setExportFormat] = useState<ExportFormat>("quickbooks");
  const treasuryFeed = useMemo(() => buildTreasuryFeed(exportFormat), [exportFormat]);
  const treasurySummary = useMemo(() => buildTreasurySummary(exportFormat), [exportFormat]);

  const handleDownloadCSV = () => {
    const csv = exportTreasuryCSV(exportFormat);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `treasury-feed-${exportFormat}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "exported_treasury_feed", category: "commission", entity: `${exportFormat} CSV export`, severity: "info" });
  };

  const carriers = useMemo(() => Array.from(new Set(commissionEvents.map(e => e.carrier))), []);

  const filteredEvents = useMemo(() => {
    return commissionEvents.filter(e => {
      const matchesSearch =
        e.event_id.toLowerCase().includes(search.toLowerCase()) ||
        e.agent.toLowerCase().includes(search.toLowerCase()) ||
        e.carrier.toLowerCase().includes(search.toLowerCase()) ||
        e.source_ref.toLowerCase().includes(search.toLowerCase());
      const matchesVariance = varianceFilter === "all" || e.variance_class === varianceFilter;
      const matchesCarrier = carrierFilter === "all" || e.carrier === carrierFilter;
      return matchesSearch && matchesVariance && matchesCarrier;
    });
  }, [search, varianceFilter, carrierFilter]);

  const varianceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    commissionEvents.forEach(e => { counts[e.variance_class] = (counts[e.variance_class] || 0) + 1; });
    return Object.entries(varianceConfig).map(([key, cfg]) => ({
      key: key as VarianceClass,
      label: cfg.label,
      color: cfg.color,
      count: counts[key] || 0,
    })).filter(v => v.count > 0);
  }, []);

  const openDisputes = disputeRecords.filter(d => d.status === "open" || d.status === "in_review");
  const overdueDisputes = openDisputes.filter(d => d.aging_days > 30);

  return (
    <div className="space-y-6">
      <PageHeader title="Commission Reconciliation" description="Carrier-neutral commission variance detection, dispute generation, and aging tracker">
        <Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" /> Export Reconciliation</Button>
        <Button size="sm"><FileSearch className="mr-1.5 h-4 w-4" /> Run Reconciliation</Button>
      </PageHeader>

      {/* Anomaly Detection Banner */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map(alert => {
            const isHigh = alert.severity === "high";
            const isCarrierDrop = alert.type === "carrier_drop";
            return (
              <div
                key={alert.id}
                className={`relative rounded-xl border p-4 pr-10 flex items-start gap-3 ${
                  isHigh
                    ? "border-destructive/40 bg-destructive/5"
                    : "border-warning/40 bg-warning/5"
                }`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isHigh ? "bg-destructive/15" : "bg-warning/15"
                }`}>
                  {isHigh
                    ? <AlertOctagon className="h-4.5 w-4.5 text-destructive" />
                    : <Activity className="h-4.5 w-4.5 text-warning" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold ${isHigh ? "text-destructive" : "text-warning"}`}>
                      {isCarrierDrop ? "Carrier Commission Drop" : "Agent Commission Anomaly"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${isHigh ? "border-destructive/30 text-destructive" : "border-warning/30 text-warning"}`}
                    >
                      {isHigh ? "HIGH" : "MEDIUM"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {alert.metric}: {alert.value} (threshold {alert.threshold})
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.detail}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => logAudit({
                        actor: "agent",
                        action: "investigated_anomaly",
                        category: "commission",
                        entity: alert.entity,
                        severity: alert.severity === "high" ? "warning" : "info",
                      })}
                    >
                      <FileSearch className="mr-1.5 h-3.5 w-3.5" /> Investigate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDismissedAlerts(prev => new Set(prev).add(alert.id));
                        logAudit({
                          actor: "agent",
                          action: "dismissed_anomaly_alert",
                          category: "commission",
                          entity: alert.id,
                          severity: "info",
                        });
                      }}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
                <button
                  className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setDismissedAlerts(prev => new Set(prev).add(alert.id))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events" value={reconciliationStats.totalEvents} icon={ArrowRightLeft} accent="navy" />
        <StatCard label="Variances Detected" value={reconciliationStats.variances} icon={AlertTriangle} accent="warning" />
        <StatCard label="Open Disputes" value={reconciliationStats.openDisputes} icon={Scale} accent="destructive" />
        <StatCard
          label="Net Variance"
          value={`${reconciliationStats.totalVarianceAmount >= 0 ? "+" : ""}$${reconciliationStats.totalVarianceAmount.toFixed(0)}`}
          icon={DollarSign}
          accent={reconciliationStats.totalVarianceAmount >= 0 ? "success" : "warning"}
        />
      </div>
      <Tabs defaultValue="events">
        <TabsList className="w-full justify-start max-w-xl">
          <TabsTrigger value="events">Commission Events</TabsTrigger>
          <TabsTrigger value="disputes">Disputes & Aging</TabsTrigger>
          <TabsTrigger value="breakdown">Variance Breakdown</TabsTrigger>
          <TabsTrigger value="upload">Statement Upload</TabsTrigger>
          <TabsTrigger value="1099">1099 Reconciliation</TabsTrigger>
          <TabsTrigger value="treasury">Treasury Feed</TabsTrigger>
          <TabsTrigger value="quirks">Carrier Quirks</TabsTrigger>
        </TabsList>

        {/* ── Events tab ── */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search by event ID, agent, carrier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-2">
                  <Select value={varianceFilter} onValueChange={setVarianceFilter}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Variance" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Variances</SelectItem>
                      {Object.entries(varianceConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Carrier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Carriers</SelectItem>
                      {carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-8" />
                      <TableHead>Event ID</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Net Paid</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Classification</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.slice(0, 25).map(e => {
                      const vc = varianceConfig[e.variance_class];
                      const expanded = expandedEvent === e.event_id;
                      return (
                        <Fragment key={e.event_id}>
                          <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedEvent(expanded ? null : e.event_id)}>
                            <TableCell className="text-muted-foreground">
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{e.event_id}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{e.carrier}</TableCell>
                            <TableCell className="text-sm">{e.plan_type}</TableCell>
                            <TableCell className="text-sm">{e.agent}</TableCell>
                            <TableCell className="text-sm text-muted-foreground capitalize">{e.event_type.replace(/_/g, " ")}</TableCell>
                            <TableCell className="text-right text-sm font-medium">${e.expected_amount.toFixed(0)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">${e.net_amount.toFixed(0)}</TableCell>
                            <TableCell className={`text-right text-sm font-medium ${e.variance > 0 ? "text-success" : e.variance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                              {e.variance > 0 ? "+" : ""}${e.variance.toFixed(0)}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${vc.bg} ${vc.color}`}>
                                {vc.label}
                              </span>
                            </TableCell>
                          </TableRow>
                          {expanded && (
                            <TableRow key={e.event_id + "-detail"} className="bg-muted/20">
                              <TableCell colSpan={10} className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Agent NPN</p>
                                    <p className="font-mono">{e.agent_npn}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Plan Year</p>
                                    <p>{e.plan_year}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Effective Date</p>
                                    <p>{format(parseISO(e.effective_date), "MMM d, yyyy")}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Source Statement</p>
                                    <p className="font-mono text-xs">{e.source_ref}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Gross Amount</p>
                                    <p>${e.gross_amount.toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Ingested At</p>
                                    <p className="text-xs">{format(parseISO(e.ingested_at), "MMM d, yyyy HH:mm")}</p>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground mb-1">Beneficiary Ref</p>
                                    <p className="font-mono text-xs text-muted-foreground">sha256({e.carrier}|{e.plan_type}|•••••••) — redacted</p>
                                  </div>
                                </div>
                                {(e.variance_class === "short_pay" || e.variance_class === "chargeback_disputable" || e.variance_class === "missing" || e.variance_class === "split_mismatch") && (
                                  <div className="mt-3 flex gap-2">
                                    <Button size="sm" variant="destructive" onClick={() => logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "opened_dispute", category: "commission", entity: e.event_id, severity: "warning" })}>
                                      <Scale className="mr-1.5 h-3.5 w-3.5" /> Open Dispute
                                    </Button>
                                    <Button size="sm" variant="outline"><FileText className="mr-1.5 h-3.5 w-3.5" /> Generate Packet</Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-3 px-1">Showing {Math.min(filteredEvents.length, 25)} of {filteredEvents.length} events</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Disputes tab ── */}
        <TabsContent value="disputes" className="space-y-4">
          {overdueDisputes.length > 0 && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-center gap-3 pt-4">
                <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">{overdueDisputes.length} disputes overdue (aging &gt; 30 days)</p>
                  <p className="text-xs text-muted-foreground">Per CMS §422.2274, carriers must respond within 30 days. Escalate unresolved disputes.</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Dispute Aging Tracker</CardTitle>
              <CardDescription>Open and in-review disputes with aging, citation, and suggested response language</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-8" />
                      <TableHead>Dispute ID</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {disputeRecords.map(d => {
                      const expanded = expandedDispute === d.id;
                      const agingColor = d.aging_days > 30 ? "text-destructive" : d.aging_days > 14 ? "text-warning" : "text-muted-foreground";
                      return (
                        <Fragment key={d.id}>
                          <TableRow className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedDispute(expanded ? null : d.id)}>
                            <TableCell className="text-muted-foreground">
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{d.id}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{d.carrier}</TableCell>
                            <TableCell className="text-sm">{d.agent}</TableCell>
                            <TableCell className="text-sm">{varianceConfig[d.variance_class].label}</TableCell>
                            <TableCell className={`text-right text-sm font-medium ${d.variance_amount < 0 ? "text-destructive" : "text-warning"}`}>
                              {d.variance_amount > 0 ? "+" : ""}${d.variance_amount.toFixed(0)}
                            </TableCell>
                            <TableCell className={`text-sm font-medium ${agingColor}`}>{d.aging_days}d</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${disputeStatusConfig[d.status].color}`}>
                                {disputeStatusConfig[d.status].label}
                              </span>
                            </TableCell>
                          </TableRow>
                          {expanded && (
                            <TableRow className="bg-muted/20">
                              <TableCell colSpan={8} className="p-4 space-y-3">
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">VARIANCE SUMMARY</p>
                                  <p className="text-sm">{d.summary}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">REGULATORY CITATION</p>
                                  <p className="text-sm font-mono text-xs bg-muted/40 rounded px-2 py-1.5">{d.citation}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">SUGGESTED RESPONSE LANGUAGE</p>
                                  <p className="text-sm italic bg-muted/40 rounded px-3 py-2 border-l-2 border-navy-500">{d.suggested_response}</p>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" variant="default"><FileText className="mr-1.5 h-3.5 w-3.5" /> Generate Dispute Packet</Button>
                                  <Button size="sm" variant="outline"><Download className="mr-1.5 h-3.5 w-3.5" /> Download Packet</Button>
                                  <Button size="sm" variant="ghost" onClick={() => logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "escalated_dispute", category: "commission", entity: d.id, severity: "warning" })}>
                                    <TrendingDown className="mr-1.5 h-3.5 w-3.5" /> Escalate
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Variance Breakdown tab ── */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Variance Classification</CardTitle>
                <CardDescription>Distribution of commission events by variance type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {varianceBreakdown.map(v => {
                  const pct = (v.count / commissionEvents.length) * 100;
                  return (
                    <div key={v.key} className="flex items-center gap-3">
                      <div className="w-40 text-sm shrink-0">{v.label}</div>
                      <div className="flex-1 h-7 rounded-md bg-muted/50 overflow-hidden relative">
                        <div
                          className={`h-full ${v.color === "text-success" ? "bg-success/40" : v.color === "text-destructive" ? "bg-destructive/40" : v.color === "text-warning" ? "bg-warning/40" : v.color === "text-muted-foreground" ? "bg-muted-foreground/30" : "bg-accent/40"}`}
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-medium">{v.count} ({pct.toFixed(0)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Reconciliation Summary</CardTitle>
                <CardDescription>Key metrics for this reconciliation cycle</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Match Rate</span>
                  <span className="text-sm font-medium">{((reconciliationStats.matched / reconciliationStats.totalEvents) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Short Pays</span>
                  <span className="text-sm font-medium text-destructive">{reconciliationStats.shortPays}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Chargebacks</span>
                  <span className="text-sm font-medium">{reconciliationStats.chargebacks}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Missing Payments</span>
                  <span className="text-sm font-medium text-destructive">{reconciliationStats.missingPayments}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Net Variance</span>
                  <span className={`text-sm font-medium ${reconciliationStats.totalVarianceAmount >= 0 ? "text-success" : "text-destructive"}`}>
                    {reconciliationStats.totalVarianceAmount >= 0 ? "+" : ""}${reconciliationStats.totalVarianceAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Open Disputes</span>
                  <span className="text-sm font-medium text-destructive">{reconciliationStats.openDisputes}</span>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <Clock className="inline h-3.5 w-3.5 mr-1" />
                    1099 reconciliation cutoff: December 15. All open variances must be resolved before year-end tax form generation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Statement Upload tab ── */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Drop zone + controls */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display flex items-center gap-2">
                    <FileUp className="h-4 w-4" /> Upload Carrier Statement
                  </CardTitle>
                  <CardDescription>Drop CSV or PDF carrier commission statements for automatic parsing and event extraction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Carrier selector */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground shrink-0">Assign carrier:</span>
                    <Select value={uploadCarrier} onValueChange={setUploadCarrier}>
                      <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Unassigned (auto-detect)</SelectItem>
                        {carriers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Drop zone */}
                  <div
                    className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[200px] flex flex-col items-center justify-center gap-3 p-8 text-center
                      ${dragActive
                        ? "border-navy-500 bg-navy-500/10 scale-[1.01]"
                        : "border-border bg-muted/20 hover:border-navy-400 hover:bg-muted/40"
                      }`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      handleFiles(e.dataTransfer.files, uploadCarrier, setUploads, (entry) => logAudit(entry as any));
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleFiles(e.target.files, uploadCarrier, setUploads, (entry) => logAudit(entry as any));
                        e.target.value = "";
                      }}
                    />
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center ${dragActive ? "bg-navy-500/20" : "bg-muted"}`}>
                      <Upload className={`h-7 w-7 ${dragActive ? "text-navy-500" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{dragActive ? "Drop files to upload" : "Drag & drop carrier statements here"}</p>
                      <p className="text-xs text-muted-foreground mt-1">or click to browse — CSV and PDF supported (max 10MB)</p>
                    </div>
                  </div>

                  {/* Upload info banner */}
                  <div className="flex items-start gap-2 rounded-lg bg-muted/40 border border-border p-3">
                    <ShieldAlert className="h-4 w-4 text-navy-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Statements are parsed through carrier-specific adapters. Beneficiary identifiers are salted-hashed on ingestion — no raw MBI is stored in the event log. All uploads are recorded in the audit trail.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Upload history / queue */}
              {uploads.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-base">Upload Queue & History</CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => setUploads([])}>
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear All
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {uploads.map(u => (
                      <div key={u.id} className="rounded-lg border border-border p-3 bg-muted/20">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                            {u.fileType === "csv" ? <FileSpreadsheet className="h-4.5 w-4.5 text-success" /> : <FileText className="h-4.5 w-4.5 text-destructive" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium truncate">{u.fileName}</p>
                              <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(u.fileSize)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px] uppercase">{u.fileType}</Badge>
                              <span className="text-xs text-muted-foreground">{u.carrier}</span>
                              {u.status === "complete" && (
                                <span className="inline-flex items-center gap-1 text-xs text-success">
                                  <CheckCircle className="h-3 w-3" /> {u.eventsExtracted} events extracted
                                </span>
                              )}
                              {u.variancesDetected > 0 && u.status === "complete" && (
                                <span className="inline-flex items-center gap-1 text-xs text-warning">
                                  <AlertTriangle className="h-3 w-3" /> {u.variancesDetected} variances
                                </span>
                              )}
                            </div>
                            {/* Progress bar */}
                            {u.status !== "complete" && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    {u.status === "parsing" && <><Loader2 className="h-3 w-3 animate-spin" /> Parsing statement structure...</>}
                                    {u.status === "extracting" && <><Loader2 className="h-3 w-3 animate-spin" /> Extracting commission events...</>}
                                  </span>
                                  <span className="text-xs font-mono text-muted-foreground">{u.progress.toFixed(0)}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full bg-navy-500 rounded-full transition-all duration-300" style={{ width: `${u.progress}%` }} />
                                </div>
                              </div>
                            )}
                          </div>
                          {u.status === "complete" && (
                            <Button size="sm" variant="ghost" className="shrink-0" onClick={() => {
                              setUploads(prev => prev.filter(x => x.id !== u.id));
                              logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "reviewed_uploaded_events", category: "commission", entity: u.fileName, severity: "info" });
                            }}>
                              Review Events
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Side panel: parsing guide */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base">How Parsing Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-navy-500/15 text-navy-500 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <div>
                      <p className="font-medium">Schema Detection</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Carrier-specific adapter identifies column layout and statement format from the file header.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-navy-500/15 text-navy-500 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <div>
                      <p className="font-medium">Row-Level Parsing</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Each row is parsed with Zod schema validation. Failures are counted, not dropped — failure rate &gt; 0.1% halts ingestion.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-navy-500/15 text-navy-500 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <div>
                      <p className="font-medium">Event Normalization</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Rows are decomposed into atomic commission events with deterministic event IDs and hashed beneficiary refs.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-navy-500/15 text-navy-500 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                    <div>
                      <p className="font-medium">Variance Check</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Each event is compared against the precomputed expected-commission schedule to flag variances automatically.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-warning/30 bg-warning/5">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-warning" /> Known Quirk Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {carrierQuirks.slice(0, 3).map(q => (
                    <div key={q.carrier} className="text-xs">
                      <p className="font-medium">{q.carrier}</p>
                      <p className="text-muted-foreground">{q.known_issues[0]}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── 1099 Annual Reconciliation tab ── */}
        <TabsContent value="1099" className="space-y-4">
          {/* Deadline banner */}
          <Card className={`border ${reconciliation1099Stats.overdue > 0 ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"}`}>
            <CardContent className="flex items-center gap-3 pt-4">
              <CalendarClock className={`h-5 w-5 shrink-0 ${reconciliation1099Stats.overdue > 0 ? "text-destructive" : "text-warning"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  1099 Reconciliation Cutoff: {reconciliation1099Stats.cutoffDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  All open variances and tax-form drift must be resolved before year-end 1099 generation. {reconciliation1099Stats.drift} agent(s) with drift detected, {reconciliation1099Stats.pending} pending, {reconciliation1099Stats.overdue} overdue.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "generated_1099_report", category: "commission", entity: "1099 Reconciliation", severity: "info" })}>
                <Download className="mr-1.5 h-4 w-4" /> Export 1099 Summary
              </Button>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Net Payments" value={`$${reconciliation1099Stats.totalNet.toFixed(0)}`} icon={DollarSign} accent="navy" />
            <StatCard label="Total Reported (1099)" value={`$${reconciliation1099Stats.totalReported.toFixed(0)}`} icon={Receipt} accent="success" />
            <StatCard label="Total Drift" value={`${reconciliation1099Stats.totalDrift >= 0 ? "+" : ""}$${reconciliation1099Stats.totalDrift.toFixed(0)}`} icon={AlertTriangle} accent={reconciliation1099Stats.totalDrift !== 0 ? "warning" : "success"} />
            <StatCard label="Agents w/ Drift" value={reconciliation1099Stats.drift} icon={FileWarning} accent={reconciliation1099Stats.drift > 0 ? "destructive" : "success"} />
          </div>

          {/* Per-agent 1099 table */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Per-Agent 1099 Reconciliation</CardTitle>
              <CardDescription>
                Aggregated yearly commission totals per agent, compared against carrier-reported 1099 amounts. Drift flags discrepancies exceeding $50.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Agent</TableHead>
                      <TableHead>NPN</TableHead>
                      <TableHead className="text-right">Gross Paid</TableHead>
                      <TableHead className="text-right">Net Paid</TableHead>
                      <TableHead className="text-right">Chargebacks</TableHead>
                      <TableHead className="text-right">Adjustments</TableHead>
                      <TableHead className="text-right">1099 Reported</TableHead>
                      <TableHead className="text-right">Drift</TableHead>
                      <TableHead>Carriers</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent1099Data.map(a => (
                      <TableRow key={a.agent} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm">{a.agent}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.npn}</TableCell>
                        <TableCell className="text-right text-sm">${a.grossPayments.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">${a.netPayments.toFixed(0)}</TableCell>
                        <TableCell className="text-right text-sm text-destructive">${a.chargebacks.toFixed(0)}</TableCell>
                        <TableCell className={`text-right text-sm ${a.adjustments >= 0 ? "text-success" : "text-destructive"}`}>
                          {a.adjustments >= 0 ? "+" : ""}${a.adjustments.toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">${a.reported1099.toFixed(0)}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${a.driftFlag ? (a.drift < 0 ? "text-destructive" : "text-warning") : "text-success"}`}>
                          {a.drift > 0 ? "+" : ""}${a.drift.toFixed(0)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {a.carriers.slice(0, 3).map(c => (
                              <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{c.slice(0, 4)}</span>
                            ))}
                            {a.carriers.length > 3 && <span className="text-[10px] text-muted-foreground">+{a.carriers.length - 3}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {a.status === "matched" && (
                            <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Matched</span>
                          )}
                          {a.status === "drift" && (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Drift</span>
                          )}
                          {a.status === "pending" && (
                            <span className="inline-flex items-center gap-1 text-xs text-warning"><Clock className="h-3.5 w-3.5" /> Pending</span>
                          )}
                          {a.status === "overdue" && (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive"><ShieldAlert className="h-3.5 w-3.5" /> Overdue</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Drift detail cards */}
          {agent1099Data.filter(a => a.driftFlag).length > 0 && (
            <Card className="border-warning/30">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-warning" /> Tax-Form Drift Analysis
                </CardTitle>
                <CardDescription>Discrepancies between event-sum totals and carrier-reported 1099 amounts require investigation before filing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent1099Data.filter(a => a.driftFlag).map(a => (
                  <div key={a.agent} className="rounded-lg border border-border p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{a.agent}</span>
                      <span className={`text-sm font-medium ${a.drift < 0 ? "text-destructive" : "text-warning"}`}>
                        Drift: {a.drift > 0 ? "+" : ""}${a.drift.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Event-Sum Net</p>
                        <p className="font-medium">${a.netPayments.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">1099 Reported</p>
                        <p className="font-medium">${a.reported1099.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Statement</p>
                        <p className="text-xs">{format(parseISO(a.lastStatement), "MMM d, yyyy")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Event Count</p>
                        <p className="font-medium">{a.eventCount}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "investigated_1099_drift", category: "commission", entity: a.agent, severity: "warning" })}>
                        <FileSearch className="mr-1.5 h-3.5 w-3.5" /> Investigate Drift
                      </Button>
                      <Button size="sm" variant="ghost"><FileText className="mr-1.5 h-3.5 w-3.5" /> Request Carrier Reconciliation</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Treasury Feed tab ── */}
        <TabsContent value="treasury" className="space-y-4">
          {/* Format selector + export */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="font-display flex items-center gap-2">
                    <Landmark className="h-4 w-4" /> Treasury Reconciliation Feed
                  </CardTitle>
                  <CardDescription>Journal entries mapped to accounting categories for QuickBooks, Sage, or generic CSV import</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quickbooks">QuickBooks Desktop (IIF)</SelectItem>
                      <SelectItem value="sage">Sage 50 / Sage Intacct</SelectItem>
                      <SelectItem value="generic">Generic CSV</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleDownloadCSV}>
                    <ArrowDownToLine className="mr-1.5 h-4 w-4" /> Export {exportFormat === "quickbooks" ? "IIF" : "CSV"}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Debits" value={`$${treasurySummary.totalDebits.toFixed(0)}`} icon={ArrowDownToLine} accent="navy" />
            <StatCard label="Total Credits" value={`$${treasurySummary.totalCredits.toFixed(0)}`} icon={ArrowRightLeft} accent="warning" />
            <StatCard
              label="Net Journal"
              value={`${treasurySummary.netJournal >= 0 ? "+" : ""}$${treasurySummary.netJournal.toFixed(0)}`}
              icon={DollarSign}
              accent={treasurySummary.netJournal >= 0 ? "success" : "destructive"}
            />
            <StatCard label="Journal Entries" value={treasurySummary.entryCount} icon={BookOpen} accent="navy" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Category breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">By Accounting Category</CardTitle>
                <CardDescription>Debits and credits grouped by GL account code</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {treasurySummary.byCategory.map(c => (
                        <TableRow key={c.category} className="hover:bg-muted/30">
                          <TableCell className="text-xs font-mono">{c.category}</TableCell>
                          <TableCell className="text-right text-sm text-success">{c.debit > 0 ? `$${c.debit.toFixed(0)}` : "—"}</TableCell>
                          <TableCell className="text-right text-sm text-warning">{c.credit > 0 ? `$${c.credit.toFixed(0)}` : "—"}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{c.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* By Carrier breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">By Carrier</CardTitle>
                <CardDescription>Commission flow per carrier for reconciliation against carrier statements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Carrier</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Entries</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {treasurySummary.byCarrier.map(c => (
                        <TableRow key={c.carrier} className="hover:bg-muted/30">
                          <TableCell className="text-sm font-medium">{c.carrier}</TableCell>
                          <TableCell className="text-right text-sm text-success">{c.debit > 0 ? `$${c.debit.toFixed(0)}` : "—"}</TableCell>
                          <TableCell className="text-right text-sm text-warning">{c.credit > 0 ? `$${c.credit.toFixed(0)}` : "—"}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{c.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Journal Entry preview */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display text-base">Journal Entry Preview</CardTitle>
                  <CardDescription>First 20 entries — {exportFormat === "quickbooks" ? "QuickBooks" : exportFormat === "sage" ? "Sage 50" : "Generic"} format</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">{treasuryFeed.length} total entries</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>JE #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead>Memo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {treasuryFeed.slice(0, 20).map(e => (
                      <TableRow key={e.journalId} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{e.journalId}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{format(parseISO(e.date), "MMM d")}</TableCell>
                        <TableCell className="text-xs font-mono">{e.account}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.carrier}</TableCell>
                        <TableCell className="text-right text-sm text-success">{e.debit > 0 ? `$${e.debit.toFixed(0)}` : "—"}</TableCell>
                        <TableCell className="text-right text-sm text-warning">{e.credit > 0 ? `$${e.credit.toFixed(0)}` : "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.memo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Account mapping reference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Account Mapping Reference
              </CardTitle>
              <CardDescription>How commission event types map to GL accounts across formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Event Type</TableHead>
                      <TableHead>QuickBooks Account</TableHead>
                      <TableHead>Sage Account</TableHead>
                      <TableHead>Generic Account</TableHead>
                      <TableHead>D/C</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountingMappings.map(m => (
                      <TableRow key={m.eventType} className="hover:bg-muted/30">
                        <TableCell className="text-sm capitalize">{m.eventType.replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-xs font-mono">{m.qbAccount}</TableCell>
                        <TableCell className="text-xs font-mono">{m.sageAccount}</TableCell>
                        <TableCell className="text-xs font-mono">{m.genericAccount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${m.debitCredit === "debit" ? "border-success/30 text-success" : "border-warning/30 text-warning"}`}>
                            {m.debitCredit === "debit" ? "DR" : "CR"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Carrier Quirks tab ── */}
        <TabsContent value="quirks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Carrier-Specific Quirks Registry</CardTitle>
              <CardDescription>Institutional memory of known carrier statement issues. Every adapter contributes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {carrierQuirks.map(q => (
                  <div key={q.carrier} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-medium text-sm">{q.carrier}</span>
                      <Badge variant="outline" className="text-xs">{q.statement_format}</Badge>
                    </div>
                    <ul className="space-y-1.5">
                      {q.known_issues.map((issue, i) => (
                        <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                          <FileWarning className="h-3.5 w-3.5 shrink-0 mt-0.5 text-warning" />
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
