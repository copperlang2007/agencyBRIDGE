import { useState, useMemo, useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { useSearchParams } from "react-router-dom";
import {
  ExternalLink, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
  GraduationCap, Building2, FileCheck, ClipboardList, TrendingUp, Lock,
  ChevronRight, PlayCircle, Award, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  agents, carrierPortals, ahipModules, getBackofficeTasks, getReadinessScore,
  type Agent, type BackofficeTask,
} from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";

const statusIcon = (status: string) => {
  switch (status) {
    case "Compliant":
    case "Completed": return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "Expiring":
    case "In Progress": return <Clock className="h-4 w-4 text-warning" />;
    case "Overdue":
    case "Missing":
    case "Expired": return <XCircle className="h-4 w-4 text-destructive" />;
    case "Not Started": return <Clock className="h-4 w-4 text-muted-foreground" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const categoryIcon = (cat: BackofficeTask["category"]) => {
  switch (cat) {
    case "AHIP": return <GraduationCap className="h-4 w-4" />;
    case "Carrier": return <Building2 className="h-4 w-4" />;
    case "Compliance": return <ShieldCheck className="h-4 w-4" />;
    case "Admin": return <FileCheck className="h-4 w-4" />;
  }
};

export default function AgentBackofficePage() {
  const { user, role } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const allAgentAgents = useMemo(() => agents.filter(a => a.role === "Agent" || a.role === "Retention"), []);
  // Agents are scoped to their own backoffice; admins/supervisors can pick any agent
  const agentAgents = useMemo(() => {
    if (role === "agent" && user) {
      const self = agents.find(a => a.name === user.name);
      return self ? [self] : allAgentAgents;
    }
    return allAgentAgents;
  }, [role, user, allAgentAgents]);
  const initialId = searchParams.get("agent") || (role === "agent" ? agentAgents[0]?.id : "") || agentAgents[0]?.id || "";
  const [selectedId, setSelectedId] = useState(initialId);
  const agent = useMemo(() => agents.find(a => a.id === selectedId) || agentAgents[0], [selectedId, agentAgents]);

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_agent_backoffice", category: "agent", entity: "Agent Backoffice", entityId: selectedId, severity: "info" });
  }, [selectedId, user]);

  if (!agent) return <div className="p-8 text-muted-foreground">No agents available.</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Agent Backoffice" description="One-click access to AHIP, carrier portals, certifications, and readiness tracking">
        {role !== "agent" && agentAgents.length > 1 && (
          <div className="flex items-center gap-2">
            <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setSearchParams({ agent: v }); }}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agentAgents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </PageHeader>

      <BackofficeDashboard agent={agent} />
    </div>
  );
}

function BackofficeDashboard({ agent }: { agent: Agent }) {
  const { user } = useRole();
  const readiness = useMemo(() => getReadinessScore(agent), [agent]);
  const tasks = useMemo(() => getBackofficeTasks(agent), [agent]);
  const openTasks = tasks.filter(t => !t.done);
  const highPriority = openTasks.filter(t => t.priority === "High").length;
  const expiringItems = useMemo(() => {
    const items: { name: string; date: string; type: string }[] = [];
    if (agent.ahip !== "Compliant") items.push({ name: "AHIP 2026", date: agent.ahipExpiry, type: "AHIP" });
    agent.carrierAppointments.forEach(ca => {
      if (ca.status !== "Compliant") items.push({ name: `${ca.carrier} Appointment`, date: ca.expiry, type: "Carrier" });
    });
    agent.certifications.forEach(c => {
      if (c.status !== "Compliant") items.push({ name: c.name, date: c.expiry, type: "Cert" });
    });
    return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [agent]);

  const readinessColor = readiness >= 85 ? "text-success" : readiness >= 70 ? "text-warning" : "text-destructive";
  const readinessBg = readiness >= 85 ? "from-success/20 to-success/5" : readiness >= 70 ? "from-warning/20 to-warning/5" : "from-destructive/20 to-destructive/5";

  return (
    <div className="space-y-6">
      {/* Agent header + readiness */}
      <Card className="overflow-hidden">
        <div className={cn("bg-gradient-to-br from-navy-800 to-navy-600 p-6 text-white")}>
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
                <span>{agent.email}</span>
                <span>·</span>
                <span>Book: {agent.bookSize}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={agent.status} className="bg-white/10 text-white border-white/20" />
              <Badge variant="outline" className="bg-white/10 text-white border-white/20">
                {agent.contracted ? "Contracted" : "Not Contracted"}
              </Badge>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          {/* Readiness ring */}
          <div className={cn("rounded-xl bg-gradient-to-br p-6 mb-6", readinessBg)}>
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">AEP Readiness Score</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn("font-display text-5xl font-bold", readinessColor)}>{readiness}</span>
                  <span className="text-lg text-muted-foreground">/ 100</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {readiness >= 85 ? "Ready for AEP — all critical items complete" : readiness >= 70 ? "Nearly ready — a few items to resolve" : "Not ready — critical items need attention"}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="font-display text-2xl font-bold">{openTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Open Tasks</p>
                </div>
                <div className="text-center">
                  <p className={cn("font-display text-2xl font-bold", highPriority > 0 ? "text-destructive" : "text-success")}>{highPriority}</p>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-2xl font-bold">{expiringItems.length}</p>
                  <p className="text-xs text-muted-foreground">Expiring Items</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={GraduationCap}
              label="AHIP Status"
              value={agent.ahip}
              accent={agent.ahip === "Compliant" ? "success" : agent.ahip === "Expiring" ? "warning" : "destructive"}
            />
            <StatCard
              icon={Building2}
              label="Carriers"
              value={`${agent.carrierAppointments.filter(c => c.status === "Compliant").length}/${agent.carrierAppointments.length}`}
              accent={agent.carrierAppointments.every(c => c.status === "Compliant") ? "success" : "warning"}
            />
            <StatCard
              icon={Award}
              label="Certifications"
              value={`${agent.certifications.filter(c => c.status === "Compliant").length}/${agent.certifications.length}`}
              accent={agent.certifications.every(c => c.status === "Compliant") ? "success" : "warning"}
            />
            <StatCard
              icon={FileCheck}
              label="Admin Docs"
              value={`${[agent.w9OnFile, agent.taxInfoComplete, agent.contracted].filter(Boolean).length}/3`}
              accent={agent.w9OnFile && agent.taxInfoComplete && agent.contracted ? "success" : "destructive"}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tasks">
        <TabsList className="w-full justify-start max-w-2xl">
          <TabsTrigger value="tasks">Open Tasks ({openTasks.length})</TabsTrigger>
          <TabsTrigger value="ahip">AHIP Certification</TabsTrigger>
          <TabsTrigger value="carriers">Carrier Portals</TabsTrigger>
          <TabsTrigger value="certs">Certifications</TabsTrigger>
        </TabsList>

        {/* Open Tasks */}
        <TabsContent value="tasks" className="space-y-4">
          {openTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-success mb-3" />
                <p className="font-display text-lg font-semibold">All caught up!</p>
                <p className="text-sm text-muted-foreground">No open tasks — you're ready for AEP.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Open Tasks & Action Items
                </CardTitle>
                <CardDescription>{openTasks.length} items requiring attention — sorted by priority</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {openTasks.map(task => {
                  const overdue = parseISO(task.due) < new Date();
                  const daysLeft = differenceInDays(parseISO(task.due), new Date());
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
                      <div className={cn("h-2 w-2 rounded-full shrink-0", task.priority === "High" ? "bg-destructive" : task.priority === "Medium" ? "bg-warning" : "bg-muted-foreground")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {categoryIcon(task.category)}
                          <span className="text-sm font-medium">{task.title}</span>
                        </div>
                        <p className={cn("text-xs", overdue ? "text-destructive font-medium" : daysLeft <= 7 ? "text-warning" : "text-muted-foreground")}>
                          Due {format(parseISO(task.due), "MMM d, yyyy")}
                          {overdue && " · OVERDUE"}
                          {!overdue && daysLeft <= 7 && ` · ${daysLeft} days left`}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        task.priority === "High" ? "text-destructive border-destructive/30" :
                        task.priority === "Medium" ? "text-warning border-warning/30" : ""
                      )}>
                        {task.priority}
                      </Badge>
                      {task.actionUrl && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={task.actionUrl} target="_blank" rel="noopener noreferrer" onClick={() => logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "launched_portal", category: "agent", entity: task.actionLabel || "Portal", severity: "info" })}>
                            {task.actionLabel || "Open"} <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AHIP */}
        <TabsContent value="ahip" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    AHIP 2026 Certification
                  </CardTitle>
                  <CardDescription>Annual Health Insurance Program — required for all Medicare agents</CardDescription>
                </div>
                <Button asChild>
                  <a href="https://ahip.org" target="_blank" rel="noopener noreferrer" onClick={() => logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "launched_ahip", category: "agent", entity: "AHIP Portal", severity: "info" })}>
                    <PlayCircle className="mr-2 h-4 w-4" /> Launch AHIP
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Module Progress</span>
                  <span className="text-sm font-medium">
                    {ahipModules.filter(m => m.status === "Completed").length} / {ahipModules.length} completed
                  </span>
                </div>
                <Progress value={(ahipModules.filter(m => m.status === "Completed").length / ahipModules.length) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                {ahipModules.map(mod => (
                  <div key={mod.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    {statusIcon(mod.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{mod.name}</p>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{mod.durationMinutes} min</span>
                      <StatusBadge status={mod.status} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">AHIP Status: {agent.ahip}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {agent.ahip === "Compliant"
                    ? `Certified — expires ${format(parseISO(agent.ahipExpiry), "MMM d, yyyy")}. No action needed.`
                    : agent.ahip === "Expiring"
                    ? `Expires in ${differenceInDays(parseISO(agent.ahipExpiry), new Date())} days. Complete before deadline to avoid lapse.`
                    : "OVERDUE — you cannot sell Medicare Advantage or Part D plans without current AHIP certification."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Carrier Portals */}
        <TabsContent value="carriers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Carrier Portals — One-Click Access
              </CardTitle>
              <CardDescription>
                {agent.carrierAppointments.filter(c => c.status === "Compliant").length} of {agent.carrierAppointments.length} appointments active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {carrierPortals.map(portal => {
                  const appointment = agent.carrierAppointments.find(ca => ca.carrier === portal.carrier);
                  const isAppointed = appointment?.status === "Compliant";
                  const isExpiring = appointment?.status === "Expiring";
                  const isMissing = !appointment || appointment.status === "Missing" || appointment.status === "Overdue";
                  return (
                    <div
                      key={portal.carrier}
                      className={cn(
                        "rounded-xl border p-4 transition-all hover:shadow-md",
                        isAppointed ? "border-success/30 bg-success/5" : isExpiring ? "border-warning/30 bg-warning/5" : isMissing ? "border-destructive/30 bg-destructive/5" : "border-border"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg font-display font-bold text-white text-sm shrink-0"
                            style={{ backgroundColor: portal.logoColor }}
                          >
                            {portal.carrier.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{portal.carrier}</p>
                            <p className="text-xs text-muted-foreground">{portal.portalName}</p>
                          </div>
                        </div>
                        {appointment ? <StatusBadge status={appointment.status} /> : <Badge variant="outline" className="text-muted-foreground">Not Appointed</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{portal.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {portal.capabilities.map(cap => (
                          <span key={cap} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{cap}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        {appointment ? (
                          <span className="text-xs text-muted-foreground">
                            Expires {format(parseISO(appointment.expiry), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No appointment on file</span>
                        )}
                        <Button size="sm" variant={isAppointed ? "default" : "outline"} asChild>
                          <a href={portal.url} target="_blank" rel="noopener noreferrer" onClick={() => logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "launched_carrier_portal", category: "agent", entity: portal.carrier, severity: "info" })}>
                            {isMissing ? "Apply Now" : "Open Portal"} <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications */}
        <TabsContent value="certs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <Award className="h-5 w-5" />
                Certifications & Training
              </CardTitle>
              <CardDescription>Track all required and optional certifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {agent.certifications.map(cert => {
                const daysLeft = differenceInDays(parseISO(cert.expiry), new Date());
                return (
                  <div key={cert.name} className="flex items-center gap-3 rounded-lg border border-border p-4">
                    {statusIcon(cert.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cert.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {format(parseISO(cert.expiry), "MMM d, yyyy")}
{cert.status !== "Compliant" && ` · ${daysLeft > 0 ? `${daysLeft} days left` : `${Math.abs(daysLeft)} days overdue`}`}
                      </p>
                    </div>
                    <StatusBadge status={cert.status} />
                    {cert.status !== "Compliant" && (
                      <Button size="sm" variant="outline">Renew</Button>
                    )}
                  </div>
                );
              })}
              {/* Admin docs */}
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Administrative Documents</p>
                <div className="space-y-2">
                  {[
                    { label: "W-9 on File", done: agent.w9OnFile, action: "Upload W-9" },
                    { label: "Tax Info Complete", done: agent.taxInfoComplete, action: "Complete Tax Form" },
                    { label: "Contractor Agreement Signed", done: agent.contracted, action: "Sign Agreement" },
                  ].map(doc => (
                    <div key={doc.label} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      {doc.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <span className="text-sm flex-1">{doc.label}</span>
                      {!doc.done && <Button size="sm" variant="outline">{doc.action}</Button>}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
