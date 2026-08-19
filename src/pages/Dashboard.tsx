import { useEffect, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import {
  Users,
  CalendarClock,
  DollarSign,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  dashboardStats,
  commissionTrend,
  carrierDistribution,
  planTypeDistribution,
  atRiskClients,
} from "@/lib/mockData";
import { useAppointments, useAgents, useClients } from "@/hooks/useBook";
import { ScopeBadge } from "@/components/shared/ScopeBadge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// dateOffset is used for scoped stat calculations
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, parseISO, isToday, isTomorrow } from "date-fns";

const formatCurrency = (n: number) =>
  n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

export default function Dashboard() {
  const { user, role } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_dashboard", category: "system", entity: "Dashboard", severity: "info" }); }, [user]);

  const scopedAppts = useAppointments();
  const scopedAgentList = useAgents();
  const scopedClientList = useClients();
  const isScoped = role === "agent";

  const todayAppointments = scopedAppts
    .filter(a => a.date >= new Date().toISOString().split("T")[0])
    .slice(0, 5);

  // Scope stats for agents
  const scopedStats = isScoped ? {
    activeClients: scopedClientList.filter(c => c.status === "Active").length,
    pendingRenewals: scopedClientList.filter(c => c.renewalDate <= dateOffset(60) && c.renewalDate >= dateOffset(0) && c.status === "Active").length,
    ytdCommissions: scopedAgentList.filter(a => a.name === user?.name).reduce((s, a) => s + a.ytdCommissions, 0),
    upcomingAppointments: scopedAppts.filter(a => a.date >= dateOffset(0) && a.date <= dateOffset(7)).length,
    totalBookSize: scopedAgentList.filter(a => a.name === user?.name).reduce((s, a) => s + a.bookSize, 0),
    newClientsThisMonth: 2,
    pendingEnrollments: scopedClientList.filter(c => c.status === "Pending").length,
    lapsedPolicies: scopedClientList.filter(c => c.status === "Lapsed").length,
  } : dashboardStats;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600 p-6 lg:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-medium text-white/70 mb-1">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
<div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back, {user?.name?.split(" ")[0] ?? "there"}</h1>
            <ScopeBadge />
          </div>
          <p className="text-white/80 text-base">
            You have <span className="font-semibold text-white">{scopedStats.upcomingAppointments} appointments</span> this week
            and <span className="font-semibold text-white">{scopedStats.pendingRenewals} renewals</span> due soon.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-10">
          <div className="absolute right-10 top-10 h-40 w-40 rounded-full bg-white blur-3xl" />
          <div className="absolute right-32 bottom-0 h-32 w-32 rounded-full bg-white blur-2xl" />
        </div>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Clients" value={scopedStats.activeClients} icon={Users} trend={{ value: 5.2, positive: true }} accent="navy" />
        <StatCard label="Pending Renewals" value={scopedStats.pendingRenewals} icon={CalendarClock} trend={{ value: 3.1, positive: false }} accent="blue" />
        <StatCard label="YTD Commissions" value={formatCurrency(scopedStats.ytdCommissions)} icon={DollarSign} trend={{ value: 8.7, positive: true }} accent="success" />
        <StatCard label="Upcoming Appts" value={scopedStats.upcomingAppointments} icon={ClipboardList} accent="warning" />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Book Size", value: scopedStats.totalBookSize, icon: FileText },
          { label: "New This Month", value: scopedStats.newClientsThisMonth, icon: TrendingUp },
          { label: "Pending Enrollments", value: scopedStats.pendingEnrollments, icon: ClipboardList },
          { label: "Lapsed Policies", value: scopedStats.lapsedPolicies, icon: AlertTriangle },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-display text-xl font-bold">{s.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commission trend — spans 2 */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">Commission Trend</CardTitle>
              <CardDescription>Monthly commissions & policies sold</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/policies">View details <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={commissionTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="commissionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b6fa0" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b6fa0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Commission"]}
                />
                <Area type="monotone" dataKey="commission" stroke="#3b6fa0" strokeWidth={2.5} fill="url(#commissionGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Carrier distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Carrier Mix</CardTitle>
            <CardDescription>Active policies by carrier</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={carrierDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {carrierDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {carrierDistribution.map((c) => (
                <div key={c.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-muted-foreground truncate">{c.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: appointments + at-risk + plan distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming appointments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display">Upcoming Appointments</CardTitle>
              <CardDescription>Next 7 days</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/calendar">Open calendar <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayAppointments.map((apt) => {
              const d = parseISO(apt.date);
              const dayLabel = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "MMM d");
              return (
                <div key={apt.id} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex flex-col items-center justify-center w-14 shrink-0 rounded-lg bg-navy-900 text-white py-2">
                    <span className="text-[10px] uppercase">{format(d, "MMM")}</span>
                    <span className="font-display text-lg font-bold leading-none">{format(d, "d")}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{apt.client}</p>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dayLabel} at {apt.time} · {apt.type} · {apt.location}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Mail className="h-4 w-4" /></Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Plan type distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Plan Types</CardTitle>
            <CardDescription>Active enrollment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={planTypeDistribution} layout="vertical" margin={{ left: 0, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                  {planTypeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* At-risk clients + agent performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* At-risk clients */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" /> Retention Alerts
              </CardTitle>
              <CardDescription>Clients with elevated churn risk</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/retention">Retention center <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {atRiskClients.filter(c => !isScoped || c.agent === user?.name).slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-navy-100 text-navy-800 text-xs font-semibold">
                    {c.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.planType} · {c.carrier}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-warning to-destructive" style={{ width: `${c.churnRisk}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-destructive w-8 text-right">{c.churnRisk}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{c.nextBestAction}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Agent leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Agent Performance</CardTitle>
            <CardDescription>YTD commissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scopedAgentList.filter(a => a.role === "Agent").sort((a, b) => b.ytdCommissions - a.ytdCommissions).map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-3">
                <span className="font-display text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-navy-700 text-white text-xs font-semibold">
                    {agent.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.bookSize} clients</p>
                </div>
                <span className="text-sm font-semibold text-navy-700 shrink-0">${(agent.ytdCommissions / 1000).toFixed(0)}K</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
