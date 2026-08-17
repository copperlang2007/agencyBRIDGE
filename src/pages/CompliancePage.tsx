import { useState, useMemo, useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Zap, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { complianceItems, agents } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";

const complianceIcon = (status: string) => {
  switch (status) {
    case "Compliant": return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "Expiring": return <AlertCircle className="h-4 w-4 text-warning" />;
    case "Overdue":
    case "Missing": return <XCircle className="h-4 w-4 text-destructive" />;
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function CompliancePage() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_compliance", category: "compliance", entity: "Compliance Dashboard", severity: "info" }); }, [user]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");

  const filtered = useMemo(() => {
    return complianceItems.filter(item => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesAgent = agentFilter === "all" || item.agent === agentFilter;
      return matchesStatus && matchesAgent;
    });
  }, [statusFilter, agentFilter]);

  const stats = {
    total: complianceItems.length,
    compliant: complianceItems.filter(i => i.status === "Compliant").length,
    expiring: complianceItems.filter(i => i.status === "Expiring").length,
    overdue: complianceItems.filter(i => i.status === "Overdue" || i.status === "Missing").length,
  };
  const complianceRate = Math.round((stats.compliant / stats.total) * 100);

  const agentAgents = agents.filter(a => a.role === "Agent");

  return (
    <div className="space-y-6">
      <PageHeader title="Compliance Dashboard" description="Agency-wide compliance oversight with one-click next best action">
        <Button size="sm"><Zap className="mr-1.5 h-4 w-4" /> Auto-Remediate</Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Compliance Rate</p>
            <ShieldCheck className="h-6 w-6 text-success/40" />
          </div>
          <p className={cn("font-display text-3xl font-bold mb-2", complianceRate >= 85 ? "text-success" : "text-warning")}>{complianceRate}%</p>
          <Progress value={complianceRate} className="h-1.5" />
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Compliant</p>
              <p className="font-display text-3xl font-bold text-success">{stats.compliant}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-success/40" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Expiring Soon</p>
              <p className="font-display text-3xl font-bold text-warning">{stats.expiring}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-warning/40" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overdue / Missing</p>
              <p className="font-display text-3xl font-bold text-destructive">{stats.overdue}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-destructive/40" />
          </div>
        </Card>
      </div>

      {/* Agent compliance scores */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Agent Compliance Scores</CardTitle>
          <CardDescription>Click-through to individual agent profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agentAgents.map(agent => {
              const agentItems = complianceItems.filter(i => i.agent === agent.name);
              const compliant = agentItems.filter(i => i.status === "Compliant").length;
              const rate = Math.round((compliant / agentItems.length) * 100);
              return (
                <div key={agent.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-navy-700 text-white text-xs font-semibold">
                      {agent.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{compliant}/{agentItems.length} items compliant</p>
                  </div>
                  <div className="hidden md:flex items-center gap-3 w-48 shrink-0">
                    <Progress value={rate} className="h-2" />
                    <span className={cn("text-sm font-semibold w-10 text-right", rate >= 85 ? "text-success" : rate >= 60 ? "text-warning" : "text-destructive")}>{rate}%</span>
                  </div>
                  <Button variant="outline" size="sm">Review</Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compliance items table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="font-display">All Compliance Items</CardTitle>
              <CardDescription>Filter by status or agent to focus on issues</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Compliant">Compliant</SelectItem>
                  <SelectItem value="Expiring">Expiring</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Missing">Missing</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agentAgents.map(a => <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>)}
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
                  <TableHead>Agent</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due / Expires</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => {
                  const daysLeft = differenceInDays(parseISO(item.dueDate), new Date());
                  const isIssue = item.status !== "Compliant";
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm font-medium">{item.agent}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.category}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {complianceIcon(item.status)}
                          <span className="text-sm">{item.item}</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(parseISO(item.dueDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <span className={cn("text-sm font-medium", daysLeft < 0 ? "text-destructive" : daysLeft <= 30 ? "text-warning" : "text-muted-foreground")}>
                          {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", item.severity === "High" ? "text-destructive border-destructive/30" : item.severity === "Medium" ? "text-warning border-warning/30" : "")}>
                          {item.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isIssue ? (
                          <Button variant="default" size="sm" className="bg-accent hover:bg-accent/90">
                            <Zap className="mr-1 h-3.5 w-3.5" /> Resolve
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm">View</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-3 px-1">Showing {filtered.length} of {complianceItems.length} compliance items</p>
        </CardContent>
      </Card>
    </div>
  );
}
