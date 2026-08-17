import { useState, useEffect, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  KanbanSquare, Users, ArrowRight, DollarSign, TrendingUp, Plus,
  Filter, ChevronDown, CheckCircle2, XCircle, Clock, Zap,
} from "lucide-react";
import {
  STAGE_CONFIG, mockPipelineDeals, mockRoutingRules, mockLeadQueue,
  type DealStage, type PipelineDeal,
} from "@/lib/pipelineData";
import { scopedAgents } from "@/lib/dataScope";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function PipelinePage() {
  const { user } = useRole();
  const [tab, setTab] = useState("kanban");

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_pipeline", category: "system", entity: "Pipeline", severity: "info" });
  }, [user]);

  const visibleDeals = useMemo(() => {
    if (!user) return [];
    if (user.role === "agent") return mockPipelineDeals.filter(d => d.agentName === user.name);
    return mockPipelineDeals;
  }, [user]);

  const totalValue = visibleDeals.filter(d => d.stage !== "lost").reduce((sum, d) => sum + d.dealValue, 0);
  const weightedValue = visibleDeals.filter(d => d.stage !== "lost").reduce((sum, d) => sum + (d.dealValue * d.probability / 100), 0);
  const wonDeals = visibleDeals.filter(d => d.stage === "enrolled").length;
  const conversionRate = visibleDeals.length > 0 ? Math.round((wonDeals / visibleDeals.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Sales Pipeline" description="Visual deal-stage management from lead to enrolled with lead routing and distribution" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Pipeline Value</span></div>
          <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground">Weighted Forecast</span></div>
          <div className="text-2xl font-bold">${Math.round(weightedValue).toLocaleString()}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Won Deals</span></div>
          <div className="text-2xl font-bold">{wonDeals}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Conversion Rate</span></div>
          <div className="text-2xl font-bold">{conversionRate}%</div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
          <TabsTrigger value="routing">Lead Routing</TabsTrigger>
          <TabsTrigger value="queue">Lead Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <KanbanBoard deals={visibleDeals} />
        </TabsContent>
        <TabsContent value="routing">
          <RoutingTab />
        </TabsContent>
        <TabsContent value="queue">
          <QueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KanbanBoard({ deals }: { deals: PipelineDeal[] }) {
  const stages = STAGE_CONFIG.filter(s => s.id !== "lost");
  const lostDeals = deals.filter(d => d.stage === "lost");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 overflow-x-auto">
        {stages.map((stage) => {
          const stageDeals = deals.filter(d => d.stage === stage.id);
          const stageValue = stageDeals.reduce((sum, d) => sum + d.dealValue, 0);
          return (
            <div key={stage.id} className="min-w-[180px]">
              <div className="rounded-lg bg-muted/40 p-3 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
                    <span className="text-xs font-semibold">{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{stageDeals.length}</Badge>
                </div>
                <div className="text-[10px] text-muted-foreground mb-3">${stageValue.toLocaleString()}</div>
                <div className="space-y-2">
                  {stageDeals.map((deal) => <DealCard key={deal.id} deal={deal} />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {lostDeals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lost Deals ({lostDeals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lostDeals.map(d => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span>{d.clientName} · {d.carrier} {d.planType}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs text-red-600 border-red-200">{d.lostReason}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(d.lastActivity), "MMM d")}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DealCard({ deal }: { deal: PipelineDeal }) {
  return (
    <div className="rounded-lg border bg-background p-2.5 hover:shadow-sm transition-shadow cursor-pointer">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium truncate">{deal.clientName}</span>
        <span className="text-[10px] font-semibold text-green-600">${deal.dealValue}</span>
      </div>
      <div className="text-[10px] text-muted-foreground mb-1.5">{deal.carrier} · {deal.planType}</div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${deal.probability}%` }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{deal.probability}%</span>
        </div>
        <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(deal.lastActivity), { addSuffix: true })}</span>
      </div>
      {deal.nextAction && (
        <div className="mt-1.5 pt-1.5 border-t text-[10px] text-amber-600 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" /> {deal.nextAction}
        </div>
      )}
    </div>
  );
}

function RoutingTab() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lead Routing Rules</CardTitle>
            <CardDescription>Automated lead distribution based on carrier appointments, territory, performance, and round-robin</CardDescription>
          </div>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockRoutingRules.map((rule) => (
            <div key={rule.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", rule.active ? "bg-green-500" : "bg-muted-foreground")} />
                  <span className="text-sm font-medium">{rule.name}</span>
                </div>
                <Badge variant="outline" className="text-xs capitalize">{rule.strategy.replace("_", " ")}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{rule.description}</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {rule.conditions.map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal">{c.field} {c.operator} {c.value}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Target agents:</span>
                  {rule.targetAgents.map(a => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}
                </div>
                <span className="text-muted-foreground">{rule.matchesThisMonth} matches this month</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QueueTab() {
  const { user } = useRole();
  const agentList = scopedAgents(user);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  const handleAssign = (leadId: string, agentName: string) => {
    setAssignments(prev => ({ ...prev, [leadId]: agentName }));
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "assigned_lead", category: "client", entity: leadId, severity: "info", details: `Assigned to ${agentName}` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Queue</CardTitle>
        <CardDescription>Unassigned leads waiting for distribution. Assign manually or let routing rules handle it.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockLeadQueue.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className={cn("h-2 w-2 rounded-full",
                  lead.priority === "high" ? "bg-red-500" : lead.priority === "medium" ? "bg-amber-500" : "bg-blue-500")} />
                <div>
                  <div className="text-sm font-medium">{lead.name}</div>
                  <div className="text-xs text-muted-foreground">{lead.phone} · {lead.zip} · {lead.planType} · {lead.source}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">${lead.estimatedValue}</div>
                  <div className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</div>
                </div>
                {assignments[lead.id] ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">→ {assignments[lead.id]}</Badge>
                ) : (
                  <Select onValueChange={(v) => handleAssign(lead.id, v)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agentList.filter(a => a.role === "Agent").map(a => (
                        <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
