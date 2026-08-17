import { useState, useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare, CalendarDays, FileText, Phone, Mail, Lock, Shield,
  Send, Download, Clock, CheckCircle2,
} from "lucide-react";
import { clients } from "@/lib/mockData";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function ClientPortalPage() {
  const { user } = useRole();
  const [selectedClient, setSelectedClient] = useState(clients[0]);

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_client_portal", category: "client", entity: "Client Portal", severity: "info" });
  }, [user]);

  const c = selectedClient;
  const initials = c.name.split(" ").map(n => n[0]).join("");

  return (
    <div className="space-y-6">
      <PageHeader title="Client Portal" description="Beneficiary self-service portal preview — clients can view their plan, message their agent, and access documents 24/7" />

      {/* Client selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Preview as:</span>
            <select className="text-sm border rounded-md px-2 py-1.5 bg-background" value={c.id} onChange={(e) => setSelectedClient(clients.find(cl => cl.id === e.target.value) || clients[0])}>
              {clients.slice(0, 12).map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
            </select>
            <Badge variant="outline" className="text-xs text-green-600 border-green-200"><Shield className="h-3 w-3 mr-1" /> HIPAA-Compliant Portal</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile + Plan */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Avatar className="h-16 w-16 mx-auto mb-2">
                <AvatarFallback className="bg-navy-100 text-navy-800 text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-sm font-bold">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.email}</div>
              <div className="text-xs text-muted-foreground">{c.phone}</div>
              <Badge variant="outline" className={cn("mt-2 text-xs",
                c.status === "Active" ? "text-green-600 border-green-200" :
                c.status === "Pending" ? "text-amber-600 border-amber-200" : "text-red-600 border-red-200")}>
                {c.status}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">My Plan</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Carrier</span><span className="font-medium">{c.carrier}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plan Type</span><span className="font-medium">{c.planType}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Premium</span><span className="font-medium">${c.premium}/mo</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Enrolled</span><span className="font-medium">{format(new Date(c.enrollmentDate), "MMM d, yyyy")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Renewal</span><span className="font-medium">{format(new Date(c.renewalDate), "MMM d, yyyy")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Agent</span><span className="font-medium">{c.agent}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Middle: Messages */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] mb-3">
              <div className="flex gap-2">
                <Avatar className="h-7 w-7"><AvatarFallback className="bg-accent text-accent-foreground text-[10px]">MP</AvatarFallback></Avatar>
                <div className="bg-accent/10 rounded-lg px-3 py-2 text-sm max-w-[80%]">
                  <p>Hi {c.name.split(" ")[0]}, your annual renewal is coming up on {format(new Date(c.renewalDate), "MMM d")}. Would you like to schedule a plan review?</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{format(new Date(Date.now() - 2 * 86400000), "MMM d, h:mm a")}</span>
                </div>
              </div>
              <div className="flex gap-2 flex-row-reverse">
                <Avatar className="h-7 w-7"><AvatarFallback className="bg-navy-100 text-navy-800 text-[10px]">{initials}</AvatarFallback></Avatar>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[80%]">
                  <p>Yes, please schedule something for next week.</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{format(new Date(Date.now() - 1 * 86400000), "MMM d, h:mm a")}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Type a message..." className="text-sm" />
              <Button size="sm"><Send className="h-3.5 w-3.5" /></Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><Lock className="h-2.5 w-2.5" /> Messages are encrypted and HIPAA-compliant</p>
          </CardContent>
        </Card>

        {/* Right: Documents + Appointments */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {["Enrollment Application", "Plan Summary", "SOA Form", "EOB Q1 2026"].map((doc, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5 text-muted-foreground" /> {doc}</span>
                  <Button variant="ghost" size="sm" className="h-7"><Download className="h-3 w-3" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Upcoming Appointments</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="rounded-lg bg-accent/10 p-2"><CalendarDays className="h-3.5 w-3.5 text-accent" /></div>
                <div>
                  <div className="font-medium">Plan Review</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(Date.now() + 5 * 86400000), "MMM d, yyyy · h:mm a")}</div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full"><CalendarDays className="h-3.5 w-3.5 mr-1" /> Schedule New Appointment</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> Contact Agent</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> (305) 555-0142</div>
              <div className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {c.agent.toLowerCase().replace(" ", ".")}@agencybridge.com</div>
              <Button variant="outline" size="sm" className="w-full"><Phone className="h-3.5 w-3.5 mr-1" /> Call Agent</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
