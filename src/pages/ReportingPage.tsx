import { useState, useEffect, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, FileText, Download, Calendar, Plus, Filter, TrendingUp, TrendingDown,
} from "lucide-react";
import { mockReportTemplates, mockRenewalForecast, mockChargebacks, mockHierarchy, type ReportTemplate } from "@/lib/workflowData";
import { agents, policies } from "@/lib/mockData";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

export default function ReportingPage() {
  const { user } = useRole();
  const [tab, setTab] = useState("reports");

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_reporting", category: "system", entity: "Reporting", severity: "info" });
  }, [user]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reporting & Analytics" description="Custom report builder, production dashboards, renewal forecasting, and chargeback tracking" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reports">Report Builder</TabsTrigger>
          <TabsTrigger value="forecast">Renewal Forecast</TabsTrigger>
          <TabsTrigger value="chargebacks">Chargebacks</TabsTrigger>
          <TabsTrigger value="hierarchy">Agent Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="reports"><ReportsTab /></TabsContent>
        <TabsContent value="forecast"><ForecastTab /></TabsContent>
        <TabsContent value="chargebacks"><ChargebackTab /></TabsContent>
        <TabsContent value="hierarchy"><HierarchyTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ReportsTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Report Templates</CardTitle>
            <CardDescription>Generate, schedule, and export reports across production, compliance, and retention</CardDescription>
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Report</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockReportTemplates.map((rpt) => <ReportRow key={rpt.id} rpt={rpt} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportRow({ rpt }: { rpt: ReportTemplate }) {
  const scheduleColors: Record<string, string> = {
    on_demand: "text-muted-foreground",
    daily: "text-amber-600",
    weekly: "text-blue-600",
    monthly: "text-purple-600",
    quarterly: "text-accent",
    annually: "text-green-600",
  };
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-muted p-2"><BarChart3 className="h-4 w-4 text-muted-foreground" /></div>
        <div>
          <div className="text-sm font-medium">{rpt.name}</div>
          <div className="text-xs text-muted-foreground">{rpt.description}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {rpt.fields.slice(0, 5).map(f => <Badge key={f} variant="outline" className="text-[10px] font-normal">{f}</Badge>)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge variant="outline" className={cn("text-xs capitalize", scheduleColors[rpt.schedule])}>{rpt.schedule.replace("_", " ")}</Badge>
          {rpt.lastRun && <div className="text-[10px] text-muted-foreground mt-1">Last: {format(new Date(rpt.lastRun), "MMM d")}</div>}
        </div>
        <Badge variant="secondary" className="text-xs uppercase">{rpt.format}</Badge>
        <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1" /> Run</Button>
      </div>
    </div>
  );
}

function ForecastTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Renewal Forecast — Next 6 Months</CardTitle>
          <CardDescription>Projected retention, revenue, and at-risk clients based on historical churn patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockRenewalForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="projectedRetained" fill="hsl(var(--success))" name="Retained" radius={[4, 4, 0, 0]} />
              <Bar dataKey="projectedLost" fill="hsl(var(--destructive))" name="Lost" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockRenewalForecast.map((f) => (
          <Card key={f.month}><CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{f.month}</span>
              <Badge variant="outline" className="text-xs">Confidence {f.confidenceScore}%</Badge>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div><div className="text-muted-foreground">Renewals</div><div className="font-semibold">{f.totalUpForRenewal}</div></div>
              <div><div className="text-muted-foreground">Retained</div><div className="font-semibold text-green-600">{f.projectedRetained}</div></div>
              <div><div className="text-muted-foreground">Lost</div><div className="font-semibold text-red-600">{f.projectedLost}</div></div>
              <div><div className="text-muted-foreground">Revenue</div><div className="font-semibold">${f.estimatedRevenue.toLocaleString()}</div></div>
            </div>
            {f.atRiskCount > 0 && <div className="mt-2 text-xs text-amber-600 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> {f.atRiskCount} at-risk clients</div>}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function ChargebackTab() {
  const totalChargebacks = mockChargebacks.reduce((sum, c) => sum + c.amount, 0);
  const pending = mockChargebacks.filter(c => c.status === "pending").length;
  const disputed = mockChargebacks.filter(c => c.status === "disputed").length;

  const reasonLabels: Record<string, string> = {
    rapid_disenrollment: "Rapid Disenrollment",
    plan_termination: "Plan Termination",
    death_within_90_days: "Death Within 90 Days",
    other: "Other",
  };
  const statusColors: Record<string, string> = {
    pending: "text-amber-600 bg-amber-50 border-amber-200",
    applied: "text-blue-600 bg-blue-50 border-blue-200",
    disputed: "text-purple-600 bg-purple-50 border-purple-200",
    reversed: "text-green-600 bg-green-50 border-green-200",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <div className="text-xs text-muted-foreground mb-1">Total Chargeback Value</div>
          <div className="text-2xl font-bold text-red-600">${totalChargebacks.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="text-xs text-muted-foreground mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-600">{pending}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="text-xs text-muted-foreground mb-1">Disputed</div>
          <div className="text-2xl font-bold text-purple-600">{disputed}</div>
        </CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Chargeback Tracking</CardTitle><CardDescription>Track rapid disenrollment, plan termination, and death chargebacks with net commission impact</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Client</th>
                  <th className="pb-2 font-medium">Agent</th>
                  <th className="pb-2 font-medium">Carrier</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 font-medium">Days</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockChargebacks.map(c => (
                  <tr key={c.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 font-medium">{c.clientName}</td>
                    <td className="py-2 text-xs">{c.agentName}</td>
                    <td className="py-2 text-xs">{c.carrier}</td>
                    <td className="py-2 text-xs">{c.planType}</td>
                    <td className="py-2 font-semibold text-red-600">${c.amount}</td>
                    <td className="py-2"><Badge variant="outline" className="text-xs">{reasonLabels[c.reason]}</Badge></td>
                    <td className="py-2 text-xs">{c.daysFromEnrollment}d</td>
                    <td className="py-2"><Badge variant="outline" className={cn("text-xs", statusColors[c.status])}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HierarchyTab() {
  const hierarchy = mockHierarchy;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Hierarchy & Downline</CardTitle>
        <CardDescription>FMO → MGA → Agency → Agent hierarchy with override commission tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {hierarchy.map((node) => (
            <div key={node.id} className="flex items-center justify-between rounded-lg border p-3"
              style={{ marginLeft: node.role === "Agent" ? 48 : node.role === "Agency" ? 24 : 0 }}>
              <div className="flex items-center gap-3">
                <div className={cn("rounded-full p-1.5",
                  node.role === "FMO" ? "bg-navy-100 text-navy-700" :
                  node.role === "MGA" ? "bg-purple-100 text-purple-700" :
                  node.role === "Agency" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground")}>
                  <BarChart3 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-sm font-medium">{node.name}</div>
                  <div className="text-xs text-muted-foreground">{node.role} · {node.downlineCount} downline · {node.bookSize} book</div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right"><div className="text-xs text-muted-foreground">YTD Comm</div><div className="font-semibold">${node.ytdCommissions.toLocaleString()}</div></div>
                {node.overrideRate > 0 && <div className="text-right"><div className="text-xs text-muted-foreground">Override</div><div className="font-semibold text-green-600">${node.overrideIncome.toLocaleString()}</div></div>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
