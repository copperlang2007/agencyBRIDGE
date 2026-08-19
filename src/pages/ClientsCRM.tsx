import { useState, useMemo, useEffect } from "react";
import { Can } from "@/components/shared/Can";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { Search, Download, Plus, Phone, Mail, MoreHorizontal, Users, UserPlus, Clock, TrendingUp, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { CommunicationTimeline } from "@/components/shared/CommunicationTimeline";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { clients, type Client, type ClientStatus, type PlanType } from "@/lib/mockData";
import { useClientsQuery } from "@/hooks/useBook";
import { ScopeBadge } from "@/components/shared/ScopeBadge";
import { format, parseISO, differenceInDays } from "date-fns";

export default function ClientsCRM() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_crm", category: "client", entity: "Clients CRM", severity: "info" }); }, [user]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [clientNotes, setClientNotes] = useState<Record<string, string>>({});

  const openTimeline = (client: Client) => {
    setActiveClient(client);
    setTimelineOpen(true);
  };

  // Tell AgentAssist which client is active for "copy to notes"
  useEffect(() => {
    if (timelineOpen && activeClient) {
      window.dispatchEvent(new CustomEvent("crm:active-client", { detail: { name: activeClient.name, id: activeClient.id } }));
    } else {
      window.dispatchEvent(new CustomEvent("crm:active-client", { detail: null }));
    }
  }, [timelineOpen, activeClient]);

  // Listen for copy-to-notes from AgentAssist
  useEffect(() => {
    const handler = (e: Event) => {
      const content = (e as CustomEvent).detail?.content as string;
      if (!content || !activeClient) return;
      const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      setClientNotes(prev => ({
        ...prev,
        [activeClient.id]: ((prev[activeClient.id] ?? activeClient.notes ?? "") + `\n\n[Agent Assist · ${ts}]\n${content}`).trimStart(),
      }));
    };
    window.addEventListener("assist:copy-to-notes", handler);
    return () => window.removeEventListener("assist:copy-to-notes", handler);
  }, [activeClient]);

  const clientsQuery = useClientsQuery();
  const scoped = clientsQuery.data ?? [];

  const filtered = useMemo(() => {
    return scoped.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesPlan = planFilter === "all" || c.planType === planFilter;
      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [scoped, search, statusFilter, planFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scoped.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [scoped]);

  return (
    <div className="space-y-6">
<PageHeader title="Clients & Leads" description="Manage your book of business, prospects, and enrollments">
        <ScopeBadge />
        <Can action="client:export"><Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" /> Export</Button></Can>
        <Can action="client:create"><Button size="sm"><Plus className="mr-1.5 h-4 w-4" /> Add Client</Button></Can>
      </PageHeader>

      {/* Status summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active", count: statusCounts["Active"] || 0, icon: Users, color: "text-success" },
          { label: "Pending", count: statusCounts["Pending"] || 0, icon: Clock, color: "text-warning" },
          { label: "Prospects", count: statusCounts["Prospect"] || 0, icon: UserPlus, color: "text-accent" },
          { label: "Lapsed", count: statusCounts["Lapsed"] || 0, icon: TrendingUp, color: "text-destructive" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="font-display text-2xl font-bold">{s.count}</p>
                </div>
                <Icon className={`h-8 w-8 ${s.color} opacity-80`} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters + table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Prospect">Prospect</SelectItem>
                  <SelectItem value="Lapsed">Lapsed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Plan Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="MA">MA</SelectItem>
                  <SelectItem value="MAPD">MAPD</SelectItem>
                  <SelectItem value="CSNP">CSNP</SelectItem>
                  <SelectItem value="DSNP">DSNP</SelectItem>
                  <SelectItem value="MED SUPP">MED SUPP</SelectItem>
                  <SelectItem value="PART D">PART D</SelectItem>
                  <SelectItem value="HOSPITAL INDEMNITY">HOSPITAL INDEMNITY</SelectItem>
                  <SelectItem value="FINAL EXPENSE">FINAL EXPENSE</SelectItem>
                  <SelectItem value="OTHER">OTHER</SelectItem>
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
                  <TableHead className="w-[260px]">Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan Type</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead className="text-right">Premium</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const renewalDate = parseISO(c.renewalDate);
                  const daysToRenewal = differenceInDays(renewalDate, new Date());
                  const renewalUrgent = daysToRenewal >= 0 && daysToRenewal <= 30;
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => openTimeline(c)}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarFallback className="bg-navy-100 text-navy-800 text-xs font-semibold">
                              {c.name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-sm">{c.planType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.carrier}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(parseISO(c.enrollmentDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <span className={`text-sm ${renewalUrgent ? "font-medium text-warning" : "text-muted-foreground"}`}>
                          {format(renewalDate, "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{c.premium === 0 ? "—" : `$${c.premium}/mo`}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.agent}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openTimeline(c)}>
                              <MessageSquare className="mr-2 h-4 w-4" /> Message Timeline
                            </DropdownMenuItem>
                            <DropdownMenuItem><Phone className="mr-2 h-4 w-4" /> Call</DropdownMenuItem>
                            <DropdownMenuItem><Mail className="mr-2 h-4 w-4" /> Email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            <Can action="client:edit" fallback={<DropdownMenuItem className="opacity-40 pointer-events-none">Edit Details</DropdownMenuItem>}>
                              <DropdownMenuItem>Edit Details</DropdownMenuItem>
                            </Can>
                            <Can action="calendar:create" fallback={<DropdownMenuItem className="opacity-40 pointer-events-none">Schedule Appointment</DropdownMenuItem>}>
                              <DropdownMenuItem>Schedule Appointment</DropdownMenuItem>
                            </Can>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4 px-1">
            <p className="text-sm text-muted-foreground">
              Showing {filtered.length} of {scoped.length} clients
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled>Previous</Button>
              <Button variant="outline" size="sm" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <CommunicationTimeline
        client={activeClient}
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        notes={activeClient ? (clientNotes[activeClient.id] ?? activeClient.notes ?? "") : ""}
        onNotesChange={(val) => activeClient && setClientNotes(prev => ({ ...prev, [activeClient.id]: val }))}
      />
    </div>
  );
}
