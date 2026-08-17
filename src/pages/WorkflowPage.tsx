import { useState, useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Play, Pause, Bell, Mail, MessageSquare, Calendar, CheckSquare, UserCog } from "lucide-react";
import { mockWorkflowRules, type WorkflowTrigger, type WorkflowAction } from "@/lib/workflowData";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const triggerLabels: Record<WorkflowTrigger, string> = {
  new_client_assigned: "New Client Assigned",
  policy_lapsing: "Policy Lapsing (30 days)",
  aep_approaching: "AEP Approaching (60 days)",
  appointment_scheduled: "Appointment Scheduled",
  enrollment_submitted: "Enrollment Submitted",
  carrier_approval_received: "Carrier Approval Received",
  chargeback_received: "Chargeback Received",
  ahip_expiring: "AHIP Expiring (30 days)",
  carrier_appointment_expiring: "Carrier Appointment Expiring",
  birthday: "Client Birthday",
  renewal_approaching: "Renewal Approaching (60 days)",
  lost_client: "Client Lost",
};

const actionIcons: Record<WorkflowAction, React.ElementType> = {
  create_task: CheckSquare,
  send_email: Mail,
  send_sms: MessageSquare,
  create_appointment: Calendar,
  notify_supervisor: UserCog,
  update_status: Zap,
};

export default function WorkflowPage() {
  const { user } = useRole();
  const [rules, setRules] = useState(mockWorkflowRules);

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_workflows", category: "system", entity: "Workflow Automation", severity: "info" });
  }, [user]);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    const rule = rules.find(r => r.id === id);
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "toggled_workflow", category: "system", entity: id, severity: "info", details: `${rule?.active ? "Disabled" : "Enabled"}: ${rule?.name}` });
  };

  const activeCount = rules.filter(r => r.active).length;
  const totalRuns = rules.reduce((sum, r) => sum + r.runsThisMonth, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Workflow Automation" description="Trigger-based automated task creation, email/SMS sending, and supervisor notifications" />

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><Zap className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Active Rules</span></div>
          <div className="text-2xl font-bold">{activeCount}</div>
          <div className="text-xs text-muted-foreground">of {rules.length} total</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><Play className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Runs This Month</span></div>
          <div className="text-2xl font-bold">{totalRuns}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><Bell className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground">Notifications Sent</span></div>
          <div className="text-2xl font-bold">{totalRuns * 2}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>Configure triggers and actions for automated workflow execution</CardDescription>
            </div>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className={cn("rounded-lg border p-4", !rule.active && "opacity-60")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", rule.active ? "bg-green-500" : "bg-muted-foreground")} />
                    <span className="text-sm font-medium">{rule.name}</span>
                  </div>
                  <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                </div>
                <p className="text-xs text-muted-foreground mb-3">{rule.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">{triggerLabels[rule.trigger]}</Badge>
                  <span className="text-muted-foreground text-xs">→</span>
                  <div className="flex flex-wrap gap-1">
                    {rule.actions.map((a, i) => {
                      const Icon = actionIcons[a.type];
                      return <Badge key={i} variant="outline" className="text-[10px] gap-1"><Icon className="h-2.5 w-2.5" /> {a.type.replace("_", " ")}</Badge>;
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>{rule.runsThisMonth} runs this month</span>
                  {rule.lastRun && <span>Last run {formatDistanceToNow(new Date(rule.lastRun), { addSuffix: true })}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
