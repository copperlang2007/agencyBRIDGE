import { useState, useEffect } from "react";
import { Can } from "@/components/shared/Can";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, FileText, CheckCircle2, XCircle, AlertCircle, Clock, Phone, Mail, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { agents, type Agent } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const complianceIcon = (status: string) => {
  switch (status) {
    case "Compliant": return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "Expiring": return <AlertCircle className="h-4 w-4 text-warning" />;
    case "Overdue":
    case "Missing": return <XCircle className="h-4 w-4 text-destructive" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export default function AgentsPage() {
  const { user, role } = useRole();
  const { agentId } = useParams();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_agents", category: "agent", entity: "Agents", entityId: agentId ?? undefined, severity: "info" }); }, [agentId, user]);
  const navigate = useNavigate();

  // Agents can only view their own profile
  if (agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return <div>Agent not found</div>;
    if (role === "agent" && agent.name !== user?.name) {
      return <div className="p-8 text-muted-foreground">You do not have access to this agent's profile.</div>;
    }
    return <AgentDetail agent={agent} onBack={() => navigate("/agents")} />;
  }

  return <AgentsList user={user} role={role} />;
}

function AgentsList({ user, role }: { user: { name: string; id: string } | null; role: string | null }) {
  const visibleAgents = role === "agent" && user
    ? agents.filter(a => a.name === user.name)
    : agents.filter(a => a.role === "Agent" || a.role === "Retention");

  return (
    <div className="space-y-6">
      <PageHeader title="Agents" description="Manage agent profiles, compliance, and performance">
        <Can action="agent:create"><Button size="sm">Add Agent</Button></Can>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleAgents.map(agent => (
          <Link key={agent.id} to={`/agents/${agent.id}`}>
            <Card className="hover:shadow-lg hover:border-accent/40 transition-all cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-gradient-to-br from-navy-600 to-navy-800 text-white font-semibold">
                        {agent.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.role}</p>
                    </div>
                  </div>
                  <StatusBadge status={agent.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Book</p>
                    <p className="font-display text-lg font-bold">{agent.bookSize}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">YTD</p>
                    <p className="font-display text-lg font-bold">${(agent.ytdCommissions / 1000).toFixed(0)}K</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                    <p className={cn("font-display text-lg font-bold", agent.complianceScore >= 85 ? "text-success" : agent.complianceScore >= 70 ? "text-warning" : "text-destructive")}>
                      {agent.complianceScore}
                    </p>
                  </div>
                </div>

                {/* Compliance quick view */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Compliance Score</span>
                    <span className="font-medium">{agent.complianceScore}%</span>
                  </div>
                  <Progress value={agent.complianceScore} className="h-1.5" />
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  {complianceIcon(agent.ahip)}
                  <span className="text-xs text-muted-foreground">AHIP</span>
                  <span className="text-xs text-muted-foreground mx-1">·</span>
                  {agent.w9OnFile ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="text-xs text-muted-foreground">W-9</span>
                  <span className="text-xs text-muted-foreground mx-1">·</span>
                  <span className="text-xs text-muted-foreground">{agent.carrierAppointments.length} carriers</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AgentDetail({ agent, onBack }: { agent: Agent; onBack: () => void }) {
  const openTasks = agent.tasks.filter(t => !t.done);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Agents
        </Button>
      </div>

      {/* Agent header card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-navy-800 to-navy-600 p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-white/20">
              <AvatarFallback className="bg-white/10 text-white text-xl font-semibold">
                {agent.name.split(" ").map(n => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{agent.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-white/80 text-sm">
                <span>{agent.role}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {agent.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {agent.phone}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <StatusBadge status={agent.status} className="bg-white/10 text-white border-white/20" />
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                {agent.contracted ? "Contracted" : "Not Contracted"}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Book Size</p>
              <p className="font-display text-2xl font-bold">{agent.bookSize}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">YTD Commissions</p>
              <p className="font-display text-2xl font-bold text-success">${(agent.ytdCommissions / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compliance Score</p>
              <p className={cn("font-display text-2xl font-bold", agent.complianceScore >= 85 ? "text-success" : agent.complianceScore >= 70 ? "text-warning" : "text-destructive")}>
                {agent.complianceScore}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hire Date</p>
              <p className="font-display text-lg font-bold">{format(parseISO(agent.hireDate), "MMM yyyy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tasks">
        <TabsList className="w-full justify-start max-w-md">
          <TabsTrigger value="tasks">Open Tasks</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="tax">Tax & W-9</TabsTrigger>
        </TabsList>

        {/* Tasks */}
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Open Tasks & Requirements</CardTitle>
              <CardDescription>{openTasks.length} pending items</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {openTasks.map(task => {
                const overdue = parseISO(task.due) < new Date();
                return (
                  <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className={cn("h-2 w-2 rounded-full shrink-0", task.priority === "High" ? "bg-destructive" : task.priority === "Medium" ? "bg-warning" : "bg-muted-foreground")} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className={cn("text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                        Due {format(parseISO(task.due), "MMM d, yyyy")} {overdue && "· Overdue"}
                      </p>
                    </div>
                    <Badge variant="outline" className={task.priority === "High" ? "text-destructive border-destructive/30" : task.priority === "Medium" ? "text-warning border-warning/30" : ""}>
                      {task.priority}
                    </Badge>
                  </div>
                );
              })}
              {openTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No open tasks</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Certifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agent.certifications.map(cert => (
                  <div key={cert.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      {complianceIcon(cert.status)}
                      <span className="text-sm font-medium">{cert.name}</span>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={cert.status} />
                      <p className="text-xs text-muted-foreground mt-1">Expires {format(parseISO(cert.expiry), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Carrier Appointments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agent.carrierAppointments.map(ca => (
                  <div key={ca.carrier} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      {complianceIcon(ca.status)}
                      <span className="text-sm font-medium">{ca.carrier}</span>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={ca.status} />
                      <p className="text-xs text-muted-foreground mt-1">Expires {format(parseISO(ca.expiry), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))}
                {agent.carrierAppointments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No carrier appointments</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Payment History</CardTitle>
              <CardDescription>Commission checks and bonuses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agent.payments.map(p => (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm">{format(parseISO(p.date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-sm">{p.type}</TableCell>
                        <TableCell className="text-right text-sm font-medium">${p.amount.toLocaleString()}</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                      </TableRow>
                    ))}
                    {agent.payments.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-8">No payments recorded</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax & W-9 */}
        <TabsContent value="tax">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Tax Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    {agent.w9OnFile ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                    <span className="text-sm font-medium">W-9 on File</span>
                  </div>
                  {!agent.w9OnFile && <Can action="agent:request_docs"><Button variant="outline" size="sm">Request W-9</Button></Can>}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    {agent.taxInfoComplete ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                    <span className="text-sm font-medium">Tax Info Complete</span>
                  </div>
                  {!agent.taxInfoComplete && <Can action="agent:request_docs"><Button variant="outline" size="sm">Send Form</Button></Can>}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    {agent.contracted ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                    <span className="text-sm font-medium">Contractor Agreement</span>
                  </div>
                  {!agent.contracted && <Can action="agent:request_docs"><Button variant="outline" size="sm">Send Agreement</Button></Can>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-display">Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {["W-9 Form", "Contractor Agreement", "E&O Insurance", "Direct Deposit Form"].map(doc => (
                  <div key={doc} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc}</span>
                    </div>
                    <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
