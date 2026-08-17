import { useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { Link } from "react-router-dom";
import { ShieldCheck, AlertTriangle, Users, TrendingUp, ArrowRight, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { agents } from "@/lib/mockData";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_admin_dashboard", category: "system", entity: "Admin Dashboard", severity: "warning" }); }, [user]);
  const allAgents = agents.filter(a => a.role === "Agent" || a.role === "Retention");
  const avgCompliance = Math.round(allAgents.reduce((s, a) => s + a.complianceScore, 0) / allAgents.length);
  const totalBook = allAgents.reduce((s, a) => s + a.bookSize, 0);
  const totalCommissions = allAgents.reduce((s, a) => s + a.ytdCommissions, 0);
  const complianceIssues = allAgents.filter(a => a.complianceScore < 85).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Agency-wide oversight with drill-down into individual agents">
        <Button size="sm">Generate Report</Button>
      </PageHeader>

      {/* Agency overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-navy-800 to-navy-900 text-white border-0 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70 mb-1">Total Agents</p>
              <p className="font-display text-3xl font-bold">{allAgents.length}</p>
            </div>
            <Users className="h-8 w-8 text-white/40" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Book Size</p>
              <p className="font-display text-3xl font-bold">{totalBook.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-accent/40" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">YTD Commissions</p>
              <p className="font-display text-3xl font-bold">${(totalCommissions / 1000000).toFixed(2)}M</p>
            </div>
            <TrendingUp className="h-8 w-8 text-success/40" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Avg Compliance</p>
              <p className={cn("font-display text-3xl font-bold", avgCompliance >= 85 ? "text-success" : "text-warning")}>{avgCompliance}%</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-accent/40" />
          </div>
        </Card>
      </div>

      {/* Compliance issues alert */}
      {complianceIssues > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">{complianceIssues} agent{complianceIssues > 1 ? "s" : ""}</span> have compliance scores below 85%. Review and assign corrective tasks below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Agent table with drill-down */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Agent Roster</CardTitle>
          <CardDescription>Click any agent to view full profile, compliance, and tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allAgents.map(agent => (
              <Link key={agent.id} to={`/agents/${agent.id}`}>
                <div className="flex items-center gap-4 rounded-lg border border-border p-4 hover:border-accent/40 hover:bg-muted/30 transition-all cursor-pointer">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-navy-600 to-navy-800 text-white text-sm font-semibold">
                      {agent.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{agent.name}</p>
                      <StatusBadge status={agent.status} />
                      <Badge variant="outline" className="text-xs">{agent.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {agent.bookSize} clients · ${(agent.ytdCommissions / 1000).toFixed(0)}K YTD · {agent.carrierAppointments.length} carriers
                    </p>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-1 w-40 shrink-0">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-muted-foreground">Compliance</span>
                      <span className={cn("text-xs font-semibold", agent.complianceScore >= 85 ? "text-success" : agent.complianceScore >= 70 ? "text-warning" : "text-destructive")}>
                        {agent.complianceScore}%
                      </span>
                    </div>
                    <Progress value={agent.complianceScore} className="h-1.5" />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm">View <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/compliance">
          <Card className="hover:border-accent/40 transition-colors cursor-pointer h-full">
            <CardContent className="p-5">
              <ShieldCheck className="h-8 w-8 text-accent mb-3" />
              <p className="font-display font-semibold">Compliance Center</p>
              <p className="text-sm text-muted-foreground mt-1">Oversee all agent compliance items</p>
              <span className="text-sm text-accent mt-2 inline-flex items-center">Open <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/retention">
          <Card className="hover:border-accent/40 transition-colors cursor-pointer h-full">
            <CardContent className="p-5">
              <TrendingUp className="h-8 w-8 text-success mb-3" />
              <p className="font-display font-semibold">Retention Center</p>
              <p className="text-sm text-muted-foreground mt-1">Book of business churn analysis</p>
              <span className="text-sm text-accent mt-2 inline-flex items-center">Open <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
            </CardContent>
          </Card>
        </Link>
        <Link to="/policies">
          <Card className="hover:border-accent/40 transition-colors cursor-pointer h-full">
            <CardContent className="p-5">
              <TrendingUp className="h-8 w-8 text-warning mb-3" />
              <p className="font-display font-semibold">Commissions</p>
              <p className="text-sm text-muted-foreground mt-1">Agency-wide commission tracking</p>
              <span className="text-sm text-accent mt-2 inline-flex items-center">Open <ArrowRight className="ml-1 h-3.5 w-3.5" /></span>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
