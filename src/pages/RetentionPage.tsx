import { useState, useMemo, useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import {
  AlertTriangle, TrendingDown, Phone, Mail, Calendar, Zap, RefreshCw, Users, Target,
  Star, Shield, Clock, ArrowRight, Activity, Building2, Sparkles, ChevronRight,
  CheckCircle2, AlertCircle, TrendingUp, DollarSign, FileWarning, FileText,
  Wand2, Stethoscope, Network, PiggyBank, Route,
  Megaphone, CalendarPlus, ListChecks, Send, MapPin, MessageSquare, Filter,
  Scale, Plus, Heart, Eye, Ear, Truck, Dumbbell, Utensils, Video, Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  maAtRiskClients, maCarrierRetention, maChurnDrivers, aepOepTimeline,
  maRetentionStats, atRiskClients, retentionData, maNonRenewalNotices,
  aepCampaignTasks, aepCampaignInfo, maPlansForComparison, getClientCurrentPlan,
} from "@/lib/mockData";
import type { MARiskClient, ElectionPeriod, NonRenewalNotice, AEPCampaignTask, MAPlan } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { format, parseISO } from "date-fns";

const epConfig: Record<ElectionPeriod, { label: string; color: string }> = {
  AEP: { label: "AEP", color: "bg-warning text-warning-foreground" },
  OEP: { label: "OEP", color: "bg-accent text-accent-foreground" },
  ICEP: { label: "ICEP", color: "bg-primary text-primary-foreground" },
  SEP: { label: "SEP", color: "bg-destructive text-destructive-foreground" },
  None: { label: "Off-Season", color: "bg-muted text-muted-foreground" },
};

function riskColor(risk: number) {
  if (risk >= 85) return { bg: "bg-destructive", text: "text-destructive", bar: "bg-destructive", label: "Critical" };
  if (risk >= 70) return { bg: "bg-warning", text: "text-warning", bar: "bg-gradient-to-r from-warning to-destructive", label: "High" };
  if (risk >= 55) return { bg: "bg-accent", text: "text-accent", bar: "bg-accent", label: "Moderate" };
  return { bg: "bg-success", text: "text-success", bar: "bg-success", label: "Low" };
}

function starRating(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-3 w-3", i < Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")}
        />
      ))}
      <span className="ml-1 text-[11px] font-medium text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function RetentionPage() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_retention", category: "retention", entity: "Retention Center", severity: "info" }); }, [user]);
  const [selectedPeriod, setSelectedPeriod] = useState<ElectionPeriod | "All">("All");

  const filteredClients = useMemo(() => {
    const sorted = [...maAtRiskClients].sort((a, b) => b.churnRisk - a.churnRisk);
    if (selectedPeriod === "All") return sorted;
    return sorted.filter(c => c.electionPeriod === selectedPeriod);
  }, [selectedPeriod]);

  const totalMABook = maRetentionStats.maActiveBook;
  const churnPredicted = maRetentionStats.churnPredicted;
  const projectedRetention = Math.round(((totalMABook - churnPredicted) / totalMABook) * 100);

  return (
    <div className="space-y-6">
      <PageHeader title="MA Retention Center" description="Medicare Advantage book of business — churn prediction, AEP/OEP tracking, and carrier-level retention">
        <Button size="sm"><Zap className="mr-1.5 h-4 w-4" /> Run MA Churn Analysis</Button>
      </PageHeader>

      {/* MA-specific stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">MA Active Book</p>
              <p className="font-display text-3xl font-bold">{totalMABook}</p>
              <p className="text-xs text-muted-foreground mt-1">{maRetentionStats.lisClients} LIS / Dual eligible</p>
            </div>
            <Users className="h-8 w-8 text-accent/40" />
          </div>
        </Card>
        <Card className="p-5 border-warning/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">MA At-Risk Clients</p>
              <p className="font-display text-3xl font-bold text-warning">{maRetentionStats.maAtRisk}</p>
              <p className="text-xs text-muted-foreground mt-1">Predicted churn: {churnPredicted} clients</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-warning/40" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Projected Retention</p>
              <p className="font-display text-3xl font-bold text-success">{projectedRetention}%</p>
              <p className="text-xs text-muted-foreground mt-1">Current: {maRetentionStats.maRetentionRate}%</p>
            </div>
            <RefreshCw className="h-8 w-8 text-success/40" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Star Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="font-display text-3xl font-bold">{maRetentionStats.avgStarRating}</p>
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{maRetentionStats.nonRenewalNotices} non-renewal notices</p>
            </div>
            <Star className="h-8 w-8 text-yellow-400/40" />
          </div>
        </Card>
      </div>

      {/* AEP/OEP timeline banner */}
      <Card className="border-warning/30 bg-gradient-to-r from-warning/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <CardTitle className="font-display text-base">Medicare Advantage Election Periods</CardTitle>
            <Badge className="bg-warning text-warning-foreground gap-1 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> AEP Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aepOepTimeline.map((ep) => (
              <div
                key={ep.period}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  ep.active ? "border-warning/40 bg-warning/10 ring-1 ring-warning/20" : "border-border bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded", epConfig[ep.period as ElectionPeriod].color)}>
                      {ep.period}
                    </span>
                    {ep.active && <Badge variant="outline" className="text-[10px] border-warning/50 text-warning">Active Now</Badge>}
                  </div>
                </div>
                <p className="text-sm font-medium">{ep.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{ep.start} – {ep.end}</p>
                <p className="text-xs text-muted-foreground mt-2">{ep.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="at-risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="at-risk">At-Risk MA Clients</TabsTrigger>
          <TabsTrigger value="non-renewal">Non-Renewal Tracker</TabsTrigger>
          <TabsTrigger value="aep-campaign">AEP Campaign</TabsTrigger>
          <TabsTrigger value="plan-compare">Plan Comparison</TabsTrigger>
          <TabsTrigger value="carriers">Carrier Retention</TabsTrigger>
          <TabsTrigger value="drivers">Churn Drivers</TabsTrigger>
          <TabsTrigger value="trend">Retention Trend</TabsTrigger>
        </TabsList>

        {/* At-Risk MA Clients */}
        <TabsContent value="at-risk" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter by election period:</span>
            {(["All", "AEP", "OEP", "SEP", "ICEP", "None"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  selectedPeriod === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {p === "All" ? "All Periods" : epConfig[p as ElectionPeriod]?.label ?? p}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Target className="h-5 w-5 text-warning" /> MA At-Risk Clients — Next Best Action
              </CardTitle>
              <CardDescription>Prioritized by churn risk with MA-specific intervention recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredClients.map((c) => {
                const r = riskColor(c.churnRisk);
                return (
                  <div key={c.id} className="rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      {/* Client identity */}
                      <div className="flex items-start gap-3 lg:w-64 shrink-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-navy-100 text-navy-800 text-xs font-semibold">
                            {c.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.planName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {starRating(c.starRating)}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge className={cn("text-[10px] gap-1", epConfig[c.electionPeriod].color)}>
                              {epConfig[c.electionPeriod].label}
                            </Badge>
                            {c.lisEligible && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-accent/40 text-accent">
                                <Shield className="h-2.5 w-2.5" /> LIS
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Churn factors */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Churn Risk Factors</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {c.churnFactors.map((f) => (
                            <span key={f} className="text-[11px] px-2 py-0.5 rounded-md bg-muted border border-border text-muted-foreground">
                              {f}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-start gap-2 rounded-md bg-accent/5 border border-accent/20 p-2.5">
                          <Sparkles className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                          <p className="text-xs text-foreground">{c.nextBestAction}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Last contact: {format(parseISO(c.lastContact), "MMM d")} · Renewal: {format(parseISO(c.renewalDate), "MMM d, yyyy")} · ${c.premium}/mo · Agent: {c.agent}
                        </p>
                      </div>

                      {/* Risk + actions */}
                      <div className="flex lg:flex-col items-center lg:items-end gap-3 shrink-0">
                        <div className="flex flex-col items-end">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full", r.bar)} style={{ width: `${c.churnRisk}%` }} />
                            </div>
                            <span className={cn("text-sm font-bold w-10 text-right", r.text)}>{c.churnRisk}%</span>
                          </div>
                          <Badge variant="outline" className={cn("text-xs mt-1", r.text === "text-destructive" ? "text-destructive border-destructive/30" : r.text === "text-warning" ? "text-warning border-warning/30" : "text-accent border-accent/30")}>
                            {r.label}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="default" size="sm" className="bg-accent hover:bg-accent/90">
                            <Phone className="mr-1 h-3.5 w-3.5" /> Call
                          </Button>
                          <Button variant="outline" size="sm"><Calendar className="h-3.5 w-3.5" /></Button>
                          <Button variant="outline" size="sm"><Mail className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredClients.length === 0 && (
                <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" /> No at-risk clients in this election period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Non-Renewal Notice Tracker */}
        <TabsContent value="non-renewal" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <NonRenewalTracker notices={maNonRenewalNotices} />
        </TabsContent>

        {/* AEP Campaign Scheduler */}
        <TabsContent value="aep-campaign" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <AEPCampaignScheduler />
        </TabsContent>

        {/* Plan Comparison Tool */}
        <TabsContent value="plan-compare" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <PlanComparisonTool />
        </TabsContent>

        {/* Carrier Retention */}
        <TabsContent value="carriers" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Building2 className="h-5 w-5 text-accent" /> Carrier-Level MA Retention
              </CardTitle>
              <CardDescription>Retention rate by carrier with star ratings and churn counts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar chart */}
                <div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={maCarrierRetention} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="carrier" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={120} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
                        formatter={(v: number) => [`${v}%`, "Retention"]}
                      />
                      <Bar dataKey="retentionRate" radius={[0, 6, 6, 0]} name="Retention Rate">
                        {maCarrierRetention.map((entry, i) => (
                          <Cell key={i} fill={entry.retentionRate >= 88 ? "#2d8a9e" : entry.retentionRate >= 80 ? "#3b6fa0" : "#e85d3a"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Table */}
                <div className="space-y-2">
                  {maCarrierRetention.map((c) => (
                    <div key={c.carrier} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.carrier}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {starRating(c.starRating)}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{c.retentionRate}%</p>
                        <p className="text-[11px] text-muted-foreground">{c.retained}/{c.total} retained</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-destructive">{c.churned}</p>
                        <p className="text-[11px] text-muted-foreground">churned</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Churn Drivers */}
        <TabsContent value="drivers" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Activity className="h-5 w-5 text-destructive" /> MA Churn Drivers
              </CardTitle>
              <CardDescription>Top reasons MA clients leave — weighted by frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={maChurnDrivers} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="driver" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
                    formatter={(v: number) => [`${v} clients`, "Affected"]}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Affected Clients">
                    {maChurnDrivers.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Premium Increases", value: 38, icon: DollarSign, color: "text-destructive" },
                  { label: "Network Changes", value: 29, icon: AlertCircle, color: "text-warning" },
                  { label: "Benefit Reductions", value: 24, icon: TrendingDown, color: "text-warning" },
                  { label: "AEP Competitor Switch", value: 22, icon: ArrowRight, color: "text-accent" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                    <s.icon className={cn("h-5 w-5 mx-auto mb-1", s.color)} />
                    <p className="font-display text-xl font-bold">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Trend */}
        <TabsContent value="trend" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" /> MA Retention vs Churn Trend
              </CardTitle>
              <CardDescription>Monthly MA retention rate with churn overlay</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={retentionData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="retainedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b6fa0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b6fa0" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="churnedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e85d3a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e85d3a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} formatter={(v: number) => [`${v}%`, ""]} />
                  <Area type="monotone" dataKey="retained" stroke="#3b6fa0" strokeWidth={2.5} fill="url(#retainedGrad)" name="Retained %" />
                  <Area type="monotone" dataKey="churned" stroke="#e85d3a" strokeWidth={2.5} fill="url(#churnedGrad)" name="Churned %" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Non-Renewal Notice Tracker ----
const nrStatusConfig: Record<NonRenewalNotice["status"], { label: string; color: string; badge: string }> = {
  "Action Needed": { label: "Action Needed", color: "text-destructive", badge: "bg-destructive text-destructive-foreground" },
  "Workflow Generated": { label: "Workflow Generated", color: "text-accent", badge: "bg-accent text-accent-foreground" },
  "Contacted": { label: "Contacted", color: "text-warning", badge: "bg-warning text-warning-foreground" },
  "Enrolled": { label: "Enrolled", color: "text-success", badge: "bg-success text-success-foreground" },
};

function deadlineColor(days: number) {
  if (days <= 15) return "text-destructive";
  if (days <= 30) return "text-warning";
  return "text-muted-foreground";
}

function NonRenewalTracker({ notices }: { notices: NonRenewalNotice[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(notices[0]?.id ?? null);
  const [workflows, setWorkflows] = useState<Record<string, NonRenewalNotice>>(() =>
    Object.fromEntries(notices.map(n => [n.id, n]))
  );

  const actionNeeded = notices.filter(n => n.status === "Action Needed").length;
  const totalSavings = notices.reduce((sum, n) => {
    const best = n.alternativePlans.reduce((s, p) => Math.max(s, p.monthlySavings), 0);
    return sum + best;
  }, 0);

  const toggleStep = (noticeId: string, stepId: string) => {
    setWorkflows(prev => {
      const n = { ...prev[noticeId] };
      n.workflowSteps = n.workflowSteps.map(s => s.id === stepId ? { ...s, done: !s.done } : s);
      const allDone = n.workflowSteps.every(s => s.done);
      if (allDone) n.status = "Enrolled";
      else if (n.workflowSteps.filter(s => s.done).length >= 3) n.status = "Workflow Generated";
      else n.status = "Action Needed";
      return { ...prev, [noticeId]: n };
    });
  };

  const generateWorkflow = (noticeId: string) => {
    setWorkflows(prev => {
      const n = { ...prev[noticeId] };
      n.workflowSteps = n.workflowSteps.map(s => {
        if (s.id === "S2" || s.id === "S3") return { ...s, done: true };
        return s;
      });
      n.status = "Workflow Generated";
      return { ...prev, [noticeId]: n };
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-3">
            <FileWarning className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-display font-bold text-destructive">{actionNeeded}</p>
              <p className="text-xs text-muted-foreground">Notices requiring immediate action</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-warning/60" />
            <div>
              <p className="text-2xl font-display font-bold">{notices.length}</p>
              <p className="text-xs text-muted-foreground">Total non-renewal notices</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <PiggyBank className="h-8 w-8 text-success/60" />
            <div>
              <p className="text-2xl font-display font-bold text-success">${totalSavings}</p>
              <p className="text-xs text-muted-foreground">Potential monthly savings across alternatives</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Notice cards */}
      {Object.values(workflows).sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline).map((n) => {
        const isExpanded = expandedId === n.id;
        const status = nrStatusConfig[n.status];
        const completedSteps = n.workflowSteps.filter(s => s.done).length;
        const progress = Math.round((completedSteps / n.workflowSteps.length) * 100);
        return (
          <Card key={n.id} className={cn("overflow-hidden transition-all", isExpanded && "ring-1 ring-accent/30")}>
            {/* Header row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : n.id)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-navy-100 text-navy-800 text-xs font-semibold">
                    {n.clientName.split(" ").map(p => p[0]).join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{n.clientName}</p>
                  <Badge className={cn("text-[10px]", status.badge)}>{status.label}</Badge>
                  {n.lisEligible && (
                    <Badge variant="outline" className="text-[10px] gap-1 border-accent/40 text-accent">
                      <Shield className="h-2.5 w-2.5" /> LIS
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {n.carrier} · {n.planName} · {n.starRating}★ · ${n.currentPremium}/mo
                </p>
              </div>
              <div className="hidden md:flex items-center gap-6 shrink-0">
                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">Non-Renewal</p>
                  <p className="text-sm font-medium">{format(parseISO(n.nonRenewalDate), "MMM d")}</p>
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-muted-foreground">SEP Deadline</p>
                  <p className={cn("text-sm font-bold", deadlineColor(n.daysUntilDeadline))}>
                    {n.daysUntilDeadline}d left
                  </p>
                </div>
                <div className="w-24">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Workflow</span>
                    <span className="text-[10px] font-medium">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", n.status === "Enrolled" ? "bg-success" : "bg-accent")} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
              <ChevronRight className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-90")} />
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-border grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Left: SEP enrollment workflow */}
                <div className="p-4 border-r border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-accent" />
                      <p className="text-sm font-medium">SEP Enrollment Workflow</p>
                    </div>
                    {n.status === "Action Needed" && (
                      <Button size="sm" variant="default" className="bg-accent hover:bg-accent/90 h-7 text-xs" onClick={() => generateWorkflow(n.id)}>
                        <Wand2 className="mr-1 h-3 w-3" /> Auto-Generate Workflow
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {n.workflowSteps.map((s, i) => (
                      <button
                        key={s.id}
                        onClick={() => toggleStep(n.id, s.id)}
                        className="w-full flex items-start gap-3 text-left group"
                      >
                        <div className={cn(
                          "mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          s.done ? "bg-success border-success" : "border-border group-hover:border-accent"
                        )}>
                          {s.done && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-xs", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
                            <span className="text-muted-foreground mr-1.5">{i + 1}.</span>{s.step}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline"><Phone className="mr-1 h-3.5 w-3.5" /> Call Client</Button>
                    <Button size="sm" variant="outline"><Calendar className="mr-1 h-3.5 w-3.5" /> Schedule</Button>
                    <Button size="sm" variant="outline"><Mail className="mr-1 h-3.5 w-3.5" /> Email Packet</Button>
                  </div>
                </div>

                {/* Right: Alternative plan recommendations */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <p className="text-sm font-medium">Recommended Alternative Plans</p>
                  </div>
                  <div className="space-y-2.5">
                    {n.alternativePlans.map((p, i) => (
                      <div key={i} className={cn(
                        "rounded-lg border p-3 transition-colors",
                        i === 0 ? "border-accent/40 bg-accent/5" : "border-border hover:bg-muted/30"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{p.carrier}</p>
                              {i === 0 && <Badge className="text-[9px] bg-accent text-accent-foreground">Best Match</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{p.planName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold">${p.premium}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
                            {p.monthlySavings > 0 && <p className="text-[10px] text-success">Save ${p.monthlySavings}/mo</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {starRating(p.starRating)}
                          {p.networkMatch && (
                            <span className="flex items-center gap-1 text-[10px] text-success">
                              <Network className="h-3 w-3" /> Network Match
                            </span>
                          )}
                          {p.lisCompatible && n.lisEligible && (
                            <span className="flex items-center gap-1 text-[10px] text-accent">
                              <Shield className="h-3 w-3" /> LIS Compatible
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.keyBenefits.map((b) => (
                            <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="default" className="w-full mt-3 bg-accent hover:bg-accent/90">
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Generate Enrollment Application
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---- AEP Campaign Scheduler ----
const outreachConfig: Record<AEPCampaignTask["outreachType"], { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  "Call": { icon: Phone, color: "text-accent", label: "Call" },
  "Email": { icon: Mail, color: "text-primary", label: "Email" },
  "SMS": { icon: MessageSquare, color: "text-success", label: "SMS" },
  "In-Person": { icon: MapPin, color: "text-warning", label: "In-Person" },
  "Plan Comparison": { icon: ListChecks, color: "text-destructive", label: "Plan Comparison" },
};

const taskStatusConfig: Record<AEPCampaignTask["status"], { label: string; badge: string }> = {
  "Pending": { label: "Pending", badge: "bg-muted text-muted-foreground" },
  "Scheduled": { label: "Scheduled", badge: "bg-accent/15 text-accent border border-accent/30" },
  "Completed": { label: "Completed", badge: "bg-success/15 text-success border border-success/30" },
  "Overdue": { label: "Overdue", badge: "bg-destructive/15 text-destructive border border-destructive/30" },
};

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function AEPCampaignScheduler() {
  const [tasks, setTasks] = useState<AEPCampaignTask[]>(aepCampaignTasks);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterAgent, setFilterAgent] = useState<string>("All");
  const [generating, setGenerating] = useState(false);

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const scheduled = tasks.filter(t => t.status === "Scheduled").length;
  const pending = tasks.filter(t => t.status === "Pending").length;
  const overdue = tasks.filter(t => t.status === "Overdue").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const agents = Array.from(new Set(tasks.map(t => t.agent)));

  const filteredTasks = tasks.filter(t => {
    if (filterStatus !== "All" && t.status !== filterStatus) return false;
    if (filterAgent !== "All" && t.agent !== filterAgent) return false;
    return true;
  });

  const tasksByDate = filteredTasks.reduce((acc, t) => {
    if (!acc[t.scheduledDate]) acc[t.scheduledDate] = [];
    acc[t.scheduledDate].push(t);
    return acc;
  }, {} as Record<string, AEPCampaignTask[]>);

  const sortedDates = Object.keys(tasksByDate).sort();

  const generateTasks = () => {
    setGenerating(true);
    setTimeout(() => {
      const existingIds = new Set(tasks.map(t => t.id));
      const newTasks: AEPCampaignTask[] = maAtRiskClients
        .filter(c => !existingIds.has(`AEP-${c.id}-1`))
        .flatMap((c, i) => {
          const dayOffset = 70 + (i % 5) * 4;
          const list: AEPCampaignTask[] = [{
            id: `AEP-${c.id}-1`,
            clientId: c.id,
            clientName: c.name,
            carrier: c.carrier,
            planName: c.planName,
            starRating: c.starRating,
            churnRisk: c.churnRisk,
            lisEligible: c.lisEligible,
            outreachType: "Call",
            scheduledDate: daysFromNow(dayOffset),
            status: "Scheduled",
            priority: c.churnRisk >= 85 ? "High" : c.churnRisk >= 70 ? "Medium" : "Low",
            agent: c.agent,
            notes: c.nextBestAction,
          }];
          if (c.churnRisk >= 75) {
            list.push({
              id: `AEP-${c.id}-2`,
              clientId: c.id,
              clientName: c.name,
              carrier: c.carrier,
              planName: c.planName,
              starRating: c.starRating,
              churnRisk: c.churnRisk,
              lisEligible: c.lisEligible,
              outreachType: "Plan Comparison",
              scheduledDate: daysFromNow(dayOffset + 14),
              status: "Pending",
              priority: c.churnRisk >= 85 ? "High" : "Medium",
              agent: c.agent,
              notes: `Send personalized plan comparison packet for ${c.carrier} vs alternatives`,
            });
          }
          if (c.churnRisk >= 85) {
            list.push({
              id: `AEP-${c.id}-3`,
              clientId: c.id,
              clientName: c.name,
              carrier: c.carrier,
              planName: c.planName,
              starRating: c.starRating,
              churnRisk: c.churnRisk,
              lisEligible: c.lisEligible,
              outreachType: "In-Person",
              scheduledDate: daysFromNow(dayOffset + 28),
              status: "Pending",
              priority: "High",
              agent: c.agent,
              notes: "In-home enrollment visit — finalize plan switch before Dec 7 deadline",
            });
          }
          return list;
        });
      setTasks(prev => [...prev, ...newTasks]);
      setGenerating(false);
    }, 1200);
  };

  const updateTaskStatus = (taskId: string, status: AEPCampaignTask["status"]) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
  };

  return (
    <div className="space-y-4">
      {/* Campaign header */}
      <Card className="border-warning/30 bg-gradient-to-r from-warning/5 to-transparent">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-warning" />
              <CardTitle className="font-display text-base">{aepCampaignInfo.name}</CardTitle>
              <Badge className="bg-warning text-warning-foreground gap-1 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> Active
              </Badge>
            </div>
            <Button size="sm" onClick={generateTasks} disabled={generating}>
              {generating ? (
                <><RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Generating...</>
              ) : (
                <><CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Generate Outreach Tasks</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground">AEP Window</p>
                <p className="text-sm font-medium">{aepCampaignInfo.startDate} – {aepCampaignInfo.endDate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Days Remaining</p>
                <p className="text-sm font-bold text-warning">{aepCampaignInfo.totalDays} days</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Campaign Progress</p>
                <p className="text-sm font-bold">{progress}%</p>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-warning transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary/60" />
            <div>
              <p className="text-xl font-display font-bold">{total}</p>
              <p className="text-[11px] text-muted-foreground">Total Tasks</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success/60" />
            <div>
              <p className="text-xl font-display font-bold text-success">{completed}</p>
              <p className="text-[11px] text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-accent/60" />
            <div>
              <p className="text-xl font-display font-bold text-accent">{scheduled}</p>
              <p className="text-[11px] text-muted-foreground">Scheduled</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning/60" />
            <div>
              <p className="text-xl font-display font-bold text-warning">{pending + overdue}</p>
              <p className="text-[11px] text-muted-foreground">Pending / Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Overdue">Overdue</option>
        </select>
        <select
          value={filterAgent}
          onChange={e => setFilterAgent(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background"
        >
          <option value="All">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filteredTasks.length} tasks</span>
      </div>

      {/* Task timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-accent" /> Outreach Schedule
          </CardTitle>
          <CardDescription>Tasks auto-distributed across the AEP window (Oct 15 – Dec 7)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedDates.map((date) => {
            const dayTasks = tasksByDate[date];
            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground px-2">
                    {format(parseISO(date), "EEE, MMM d")}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {dayTasks.map((task) => {
                    const oc = outreachConfig[task.outreachType];
                    const sc = taskStatusConfig[task.status];
                    const r = riskColor(task.churnRisk);
                    const Icon = oc.icon;
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                          task.status === "Completed" ? "border-success/20 bg-success/5 opacity-70" : "border-border hover:bg-muted/30"
                        )}
                      >
                        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-muted", oc.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("text-sm font-medium", task.status === "Completed" && "line-through")}>
                              {task.clientName}
                            </p>
                            <Badge className={cn("text-[10px]", sc.badge)}>{sc.label}</Badge>
                            {task.priority === "High" && (
                              <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">High Priority</Badge>
                            )}
                            {task.lisEligible && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-accent/40 text-accent">
                                <Shield className="h-2.5 w-2.5" /> LIS
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {task.carrier} · {task.planName} · {oc.label} · Agent: {task.agent}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{task.notes}</p>
                        </div>
                        <div className="hidden md:flex flex-col items-end shrink-0">
                          <span className={cn("text-sm font-bold", r.text)}>{task.churnRisk}%</span>
                          <span className="text-[10px] text-muted-foreground">churn risk</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {task.status !== "Completed" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() => updateTaskStatus(task.id, "Completed")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2"
                                onClick={() => updateTaskStatus(task.id, "Scheduled")}
                              >
                                <Calendar className="h-3.5 w-3.5 text-accent" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <CalendarPlus className="h-8 w-8 opacity-40" />
              <p className="text-sm">No tasks match the current filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Plan Comparison Tool ----
const planTypeColors: Record<MAPlan["planType"], string> = {
  "HMO": "bg-primary/15 text-primary",
  "PPO": "bg-accent/15 text-accent",
  "SNP": "bg-warning/15 text-warning",
  "D-SNP": "bg-success/15 text-success",
};

function YesNo({ value, positive = true }: { value: boolean; positive?: boolean }) {
  const isGood = positive ? value : !value;
  return (
    <span className={cn("text-xs font-medium", isGood ? "text-success" : "text-muted-foreground")}>
      {value ? "Yes" : "No"}
    </span>
  );
}

function PlanComparisonTool() {
  const [selectedClient, setSelectedClient] = useState<string>(maAtRiskClients[0].id);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([
    maPlansForComparison[0].id,
    maPlansForComparison[3].id,
    maPlansForComparison[4].id,
  ]);

  const client = maAtRiskClients.find(c => c.id === selectedClient)!;
  const currentPlan = getClientCurrentPlan(selectedClient);

  const togglePlan = (planId: string) => {
    setSelectedPlanIds(prev =>
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : prev.length >= 4 ? prev : [...prev, planId]
    );
  };

  const plansToCompare = maPlansForComparison.filter(p => selectedPlanIds.includes(p.id));

  const rows: { label: string; icon: React.ComponentType<{ className?: string }>; render: (p: MAPlan) => React.ReactNode; highlight?: (p: MAPlan, all: MAPlan[]) => boolean }[] = [
    { label: "Monthly Premium", icon: DollarSign, render: p => <span className={cn("font-bold", p.premium === 0 ? "text-success" : "")}>${p.premium}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></span>, highlight: p => p.premium === 0 },
    { label: "Star Rating", icon: Star, render: p => starRating(p.starRating), highlight: (p, all) => p.starRating === Math.max(...all.map(a => a.starRating)) },
    { label: "Max Out-of-Pocket", icon: Wallet, render: p => <span>${p.moop.toLocaleString()}</span>, highlight: (p, all) => p.moop === Math.min(...all.map(a => a.moop)) },
    { label: "Plan Type", icon: Building2, render: p => <Badge className={cn("text-[10px]", planTypeColors[p.planType])}>{p.planType}</Badge> },
    { label: "Network", icon: Network, render: p => <span className="text-xs">{p.networkType}</span> },
    { label: "PCP Required", icon: Stethoscope, render: p => <YesNo value={p.pcpRequired} positive={false} /> },
    { label: "Referral Required", icon: Stethoscope, render: p => <YesNo value={p.referralRequired} positive={false} /> },
    { label: "Part B Giveback", icon: PiggyBank, render: p => p.partBGiveback > 0 ? <span className="text-success font-medium">${p.partBGiveback}/mo</span> : <span className="text-muted-foreground">—</span>, highlight: (p, all) => p.partBGiveback === Math.max(...all.map(a => a.partBGiveback)) && p.partBGiveback > 0 },
    { label: "LIS Compatible", icon: Shield, render: p => <YesNo value={p.lisCompatible} /> },
    { label: "Dental Allowance", icon: Heart, render: p => <span>${p.dental}<span className="text-[10px] text-muted-foreground">/yr</span></span>, highlight: (p, all) => p.dental === Math.max(...all.map(a => a.dental)) },
    { label: "Vision Allowance", icon: Eye, render: p => <span>${p.vision}</span>, highlight: (p, all) => p.vision === Math.max(...all.map(a => a.vision)) },
    { label: "Hearing Allowance", icon: Ear, render: p => <span>${p.hearing}</span>, highlight: (p, all) => p.hearing === Math.max(...all.map(a => a.hearing)) },
    { label: "OTC Quarterly", icon: ListChecks, render: p => <span>${p.otcQuarterly}<span className="text-[10px] text-muted-foreground">/qtr</span></span>, highlight: (p, all) => p.otcQuarterly === Math.max(...all.map(a => a.otcQuarterly)) },
    { label: "Transportation", icon: Truck, render: p => <span>{p.transportation > 0 ? `${p.transportation} trips/yr` : "—"}</span>, highlight: (p, all) => p.transportation === Math.max(...all.map(a => a.transportation)) && p.transportation > 0 },
    { label: "Fitness", icon: Dumbbell, render: p => <YesNo value={p.fitness} /> },
    { label: "Meals Post-Discharge", icon: Utensils, render: p => <YesNo value={p.mealsPostDischarge} /> },
    { label: "Telehealth", icon: Video, render: p => <YesNo value={p.telehealth} /> },
  ];

  return (
    <div className="space-y-4">
      {/* Client selector + plan picker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display flex items-center gap-2">
            <Scale className="h-5 w-5 text-accent" /> MA Plan Comparison Tool
          </CardTitle>
          <CardDescription>Compare competing Medicare Advantage plans side-by-side for retention and enrollment calls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Client selector */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="text-sm font-medium shrink-0">Client:</label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-2 bg-background flex-1 max-w-xs"
            >
              {maAtRiskClients.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.carrier} ({c.churnRisk}% churn risk)</option>
              ))}
            </select>
            {currentPlan && (
              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                Current: {currentPlan.planName}
              </Badge>
            )}
          </div>

          {/* Plan selection chips */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Select up to 4 plans to compare ({selectedPlanIds.length}/4):</p>
            <div className="flex flex-wrap gap-2">
              {maPlansForComparison.map(p => {
                const isSelected = selectedPlanIds.includes(p.id);
                const isCurrent = currentPlan?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlan(p.id)}
                    disabled={!isSelected && selectedPlanIds.length >= 4}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                      isSelected ? "border-accent bg-accent/5 ring-1 ring-accent/20" : "border-border hover:bg-muted/30"
                    )}
                  >
                    {isSelected ? <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" /> : <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <div>
                      <p className="text-xs font-medium">{p.carrier}</p>
                      <p className="text-[10px] text-muted-foreground">{p.planName}</p>
                    </div>
                    {isCurrent && <Badge className="text-[9px] bg-primary text-primary-foreground ml-1">Current</Badge>}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client context card */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-navy-100 text-navy-800 text-xs font-semibold">
                {client.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">{client.name}</p>
              <p className="text-xs text-muted-foreground">{client.planName} · {client.carrier} · {starRating(client.starRating)}</p>
            </div>
            <div className="flex items-center gap-4">
              {client.lisEligible && (
                <Badge variant="outline" className="text-[10px] gap-1 border-accent/40 text-accent">
                  <Shield className="h-2.5 w-2.5" /> LIS Eligible
                </Badge>
              )}
              <Badge className={cn("text-[10px]", epConfig[client.electionPeriod].color)}>
                {epConfig[client.electionPeriod].label}
              </Badge>
              <div className="text-right">
                <p className="text-sm font-bold text-destructive">{client.churnRisk}%</p>
                <p className="text-[10px] text-muted-foreground">churn risk</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison table */}
      {plansToCompare.length > 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Plan headers */}
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 w-48 sticky left-0 bg-card z-10">
                      <p className="text-xs text-muted-foreground font-medium">Benefit</p>
                    </th>
                    {plansToCompare.map(p => {
                      const isCurrent = currentPlan?.id === p.id;
                      return (
                        <th key={p.id} className={cn("text-left p-4 min-w-[180px]", isCurrent && "bg-primary/5")}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold">{p.carrier}</p>
                              {isCurrent && <Badge className="text-[9px] bg-primary text-primary-foreground">Current</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{p.planName}</p>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge className={cn("text-[10px]", planTypeColors[p.planType])}>{p.planType}</Badge>
                              {starRating(p.starRating)}
                            </div>
                            <p className="text-[10px] text-muted-foreground pt-1">{p.enrollmentCount} enrolled in market</p>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                {/* Benefit rows */}
                <tbody>
                  {rows.map((row, ri) => {
                    const Icon = row.icon;
                    return (
                      <tr key={ri} className={cn("border-b border-border/50", ri % 2 === 1 && "bg-muted/20")}>
                        <td className="p-4 sticky left-0 bg-card z-10">
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium">{row.label}</span>
                          </div>
                        </td>
                        {plansToCompare.map(p => {
                          const isBest = row.highlight ? row.highlight(p, plansToCompare) : false;
                          return (
                            <td key={p.id} className={cn("p-4", isBest && "bg-success/5")}>
                              <div className="flex items-center gap-1.5">
                                {isBest && <CheckCircle2 className="h-3 w-3 text-success shrink-0" />}
                                {row.render(p)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Key benefits row */}
                  <tr className="border-b border-border/50">
                    <td className="p-4 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium">Key Benefits</span>
                      </div>
                    </td>
                    {plansToCompare.map(p => (
                      <td key={p.id} className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {p.keyBenefits.map(b => (
                            <span key={b} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Scale className="h-8 w-8 opacity-40" />
              <p className="text-sm">Select at least one plan to compare</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {plansToCompare.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-accent hover:bg-accent/90">
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Generate Comparison Packet
          </Button>
          <Button size="sm" variant="outline">
            <Phone className="mr-1.5 h-3.5 w-3.5" /> Call Client
          </Button>
          <Button size="sm" variant="outline">
            <Mail className="mr-1.5 h-3.5 w-3.5" /> Email Comparison
          </Button>
          <Button size="sm" variant="outline">
            <Calendar className="mr-1.5 h-3.5 w-3.5" /> Schedule Review
          </Button>
        </div>
      )}
    </div>
  );
}
