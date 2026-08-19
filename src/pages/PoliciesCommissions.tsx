import { useState, useMemo, useEffect } from "react";
import { Can } from "@/components/shared/Can";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { Search, Download, FileText, DollarSign, TrendingUp, CalendarClock, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { commissionTrend } from "@/lib/mockData";
import { usePolicies, useAgents } from "@/hooks/useBook";
import { ScopeBadge } from "@/components/shared/ScopeBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { format, parseISO, differenceInDays } from "date-fns";

export default function PoliciesCommissions() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_policies", category: "policy", entity: "Policies & Commissions", severity: "info" }); }, [user]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("policies");

  const scoped = usePolicies();
  const visibleAgents = useAgents();

  const filtered = useMemo(() => {
    return scoped.filter(p => {
      const matchesSearch = p.client.toLowerCase().includes(search.toLowerCase()) || p.carrier.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [scoped, search, statusFilter]);

  const totalPremium = scoped.filter(p => p.status === "Active").reduce((s, p) => s + p.premium, 0);
  const totalCommission = scoped.filter(p => p.status === "Active").reduce((s, p) => s + p.commission, 0);
  const upcomingRenewals = scoped.filter(p => {
    const days = differenceInDays(parseISO(p.renewalDate), new Date());
    return days >= 0 && days <= 60 && p.status === "Active";
  }).length;

  // Commission by agent
  const commissionByAgent = visibleAgents.filter(a => a.role === "Agent").map(a => ({
    name: a.name.split(" ")[0],
    commission: a.ytdCommissions,
    bookSize: a.bookSize,
  }));

  return (
    <div className="space-y-6">
<PageHeader title="Policies & Commissions" description="Track policies, carriers, commissions and renewal dates">
        <ScopeBadge />
        <Can action="policy:export"><Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" /> Export Report</Button></Can>
        <Can action="reconciliation:export"><Button variant="outline" size="sm" onClick={() => window.location.href = "/reconciliation"}><Scale className="mr-1.5 h-4 w-4" /> Reconciliation</Button></Can>
        <Can action="policy:create"><Button size="sm">Add Policy</Button></Can>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Policies" value={scoped.filter(p => p.status === "Active").length} icon={FileText} accent="navy" />
        <StatCard label="Monthly Premium" value={`$${(totalPremium / 1000).toFixed(1)}K`} icon={DollarSign} accent="blue" />
        <StatCard label="Total Commission" value={`$${(totalCommission / 1000).toFixed(1)}K`} icon={TrendingUp} accent="success" />
        <StatCard label="Renewals (60d)" value={upcomingRenewals} icon={CalendarClock} accent="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start max-w-md">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
        </TabsList>

        {/* Policies tab */}
        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search by client or carrier..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Lapsed">Lapsed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Policy ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Premium</TableHead>
                      <TableHead className="text-right">Commission</TableHead>
                      <TableHead>Effective</TableHead>
                      <TableHead>Renewal</TableHead>
                      <TableHead>Agent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 20).map(p => {
                      const daysToRenewal = differenceInDays(parseISO(p.renewalDate), new Date());
                      const urgent = daysToRenewal >= 0 && daysToRenewal <= 60;
                      return (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono text-xs">{p.id}</TableCell>
                          <TableCell className="font-medium text-sm">{p.client}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.carrier}</TableCell>
                          <TableCell className="text-sm">{p.planType}</TableCell>
                          <TableCell><StatusBadge status={p.status} /></TableCell>
                          <TableCell className="text-right text-sm font-medium">{p.premium === 0 ? "—" : `$${p.premium}`}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-success">${p.commission}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(parseISO(p.effectiveDate), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            <span className={`text-sm ${urgent ? "font-medium text-warning" : "text-muted-foreground"}`}>
                              {format(parseISO(p.renewalDate), "MMM d, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.agent}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-sm text-muted-foreground mt-3 px-1">Showing {Math.min(filtered.length, 20)} of {filtered.length} policies</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions tab */}
        <TabsContent value="commissions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Commission Trend</CardTitle>
                <CardDescription>Monthly commission earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={commissionTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Commission"]} />
                    <Bar dataKey="commission" fill="#3b6fa0" radius={[6, 6, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Commission by Agent</CardTitle>
                <CardDescription>YTD earnings per agent</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={commissionByAgent} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Commission"]} />
                    <Bar dataKey="commission" fill="#1e3a5f" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Policies sold trend */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Policies Sold</CardTitle>
              <CardDescription>Monthly new policy count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={commissionTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
                  <Line type="monotone" dataKey="policies" stroke="#3b6fa0" strokeWidth={2.5} dot={{ fill: "#3b6fa0", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Renewals tab */}
        <TabsContent value="renewals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Upcoming Renewals</CardTitle>
              <CardDescription>Policies due for renewal in the next 60 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Client</TableHead>
                      <TableHead>Carrier</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>Renewal Date</TableHead>
                      <TableHead className="text-center">Days Left</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scoped
                      .filter(p => {
                        const days = differenceInDays(parseISO(p.renewalDate), new Date());
                        return days >= 0 && days <= 60 && p.status === "Active";
                      })
                      .sort((a, b) => parseISO(a.renewalDate).getTime() - parseISO(b.renewalDate).getTime())
                      .map(p => {
                        const days = differenceInDays(parseISO(p.renewalDate), new Date());
                        return (
                          <TableRow key={p.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-sm">{p.client}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.carrier}</TableCell>
                            <TableCell className="text-sm">{p.planType}</TableCell>
                            <TableCell className="text-sm">{format(parseISO(p.renewalDate), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-medium ${days <= 14 ? "text-destructive" : days <= 30 ? "text-warning" : "text-muted-foreground"}`}>
                                {days}d
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.agent}</TableCell>
                            <TableCell className="text-right">
                              <Can action="policy:contact_renewal"><Button variant="outline" size="sm">Contact</Button></Can>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
