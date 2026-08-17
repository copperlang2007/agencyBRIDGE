import { useState, useMemo, useRef, useEffect } from "react";
import { logAudit } from "@/lib/auditLog";
import { format, parseISO, isSameDay, formatDistanceToNow } from "date-fns";
import { MessageSquare, Mail, Send, Smartphone, CheckCheck, Check, AlertTriangle, ChevronDown, Clock, Activity, Repeat, Ban, StickyNote, ShieldAlert } from "lucide-react";
import { TPMO_DISCLAIMER } from "@/lib/complianceData";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type Client, type TimelineMessage, type MessageChannel, messageTemplates, clientTimelines, getClientContactStats } from "@/lib/mockData";

interface Props {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

function fillTemplate(body: string, c: Client): string {
  return body
    .replace(/\{firstName\}/g, c.name.split(" ")[0])
    .replace(/\{planType\}/g, c.planType)
    .replace(/\{carrier\}/g, c.carrier)
    .replace(/\{renewalDate\}/g, format(parseISO(c.renewalDate), "MMM d, yyyy"));
}

export function CommunicationTimeline({ client, open, onOpenChange, notes, onNotesChange }: Props) {
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<TimelineMessage[]>([]);
  const [doNotContact, setDoNotContact] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (client) {
      setMessages(clientTimelines[client.id] ?? []);
      setDraft("");
      setChannel("sms");
      setDoNotContact(false);
      logAudit({ actor: "agent", action: "opened_client_timeline", category: "client", entity: client.name, entityId: client.id, severity: "info" });
    }
  }, [client]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const grouped = useMemo(() => {
    const groups: { date: string; items: TimelineMessage[] }[] = [];
    messages.forEach((m) => {
      const key = m.timestamp.split("T")[0];
      const g = groups.find((x) => x.date === key);
      if (g) g.items.push(m);
      else groups.push({ date: key, items: [m] });
    });
    return groups;
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim() || !client) return;
    const newMsg: TimelineMessage = {
      id: `${client.id}-M${messages.length + 1}`,
      channel,
      direction: "outbound",
      body: draft.trim(),
      timestamp: new Date().toISOString(),
      status: "sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    logAudit({ actor: "agent", action: `sent_${channel}_message`, category: "communication", entity: client.name, entityId: client.id, severity: "info", details: draft.trim().slice(0, 100) });
    setDraft("");
  };

  const handleTemplate = (tplBody: string) => {
    if (!client) return;
    setDraft(fillTemplate(tplBody, client));
  };

  if (!client) return null;

  const initials = client.name.split(" ").map((n) => n[0]).join("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between pr-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-navy-100 text-navy-800 text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <SheetTitle className="text-base">{client.name}</SheetTitle>
                <SheetDescription className="text-xs">
                  {client.email} · {client.phone}
                </SheetDescription>
              </div>
            </div>
            <StatusBadge status={client.status} />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-2">
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
              {client.planType}
            </Badge>
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
              {client.carrier}
            </Badge>
            <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
              Renewal {format(parseISO(client.renewalDate), "MMM d")}
            </Badge>
          </div>
        </SheetHeader>

        {/* Contact-history summary */}
        <ContactHistorySummary
          client={client}
          messages={messages}
          doNotContact={doNotContact}
          onDoNotContactChange={setDoNotContact}
        />

        {/* Client Notes */}
        <ClientNotesSection
          notes={notes ?? ""}
          onNotesChange={onNotesChange}
          clientName={client.name}
        />

        {/* Channel tabs */}
        <div className="flex border-b border-border">
          {(["sms", "email"] as MessageChannel[]).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                channel === ch
                  ? "text-accent border-b-2 border-accent bg-accent/5"
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
              )}
            >
              {ch === "sms" ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              {ch === "sms" ? "SMS" : "Email"}
            </button>
          ))}
        </div>
        {/* Timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-5 bg-muted/30">
          {grouped.map((group) => (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center justify-center">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground bg-background px-3 py-0.5 rounded-full border border-border">
                  {isSameDay(parseISO(group.date), new Date())
                    ? "Today"
                    : format(parseISO(group.date), "MMM d, yyyy")}
                </span>
              </div>
              {group.items.map((m) => (
                <MessageBubble key={m.id} message={m} clientInitials={initials} />
              ))}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              No messages yet. Start the conversation below.
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-border bg-background p-3 space-y-2">
          <div className="flex items-start gap-1.5 rounded-md bg-amber-50 border border-amber-200/60 px-2.5 py-1.5 text-[10px] text-amber-800 leading-snug">
            <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
            <span>{TPMO_DISCLAIMER}</span>
          </div>
          {doNotContact && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <Ban className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Do Not Contact is active.</span>
              <span className="text-muted-foreground">Messaging is disabled for this client.</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs" disabled={doNotContact}>
                  Quick reply <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[320px]">
                {messageTemplates
                  .filter((t) => t.channel === channel)
                  .map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => handleTemplate(t.body)}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {fillTemplate(t.body, client)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                {messageTemplates.filter((t) => t.channel === channel).length === 0 && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    No {channel.toUpperCase()} templates
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-[11px] text-muted-foreground">
              Sending via {channel === "sms" ? "SMS" : "Email"}
            </span>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={doNotContact ? "Do Not Contact is enabled — messaging disabled" : channel === "sms" ? "Type an SMS message..." : "Type an email message..."}
            className="min-h-[64px] max-h-[140px] resize-none text-sm"
            disabled={doNotContact}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {draft.length} chars {channel === "sms" && draft.length > 160 && `· ${Math.ceil(draft.length / 160)} segments`}
            </span>
            <Button size="sm" onClick={handleSend} disabled={!draft.trim() || doNotContact} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MessageBubble({ message, clientInitials }: { message: TimelineMessage; clientInitials: string }) {
  const outbound = message.direction === "outbound";
  const time = format(new Date(message.timestamp), "h:mm a");

  return (
    <div className={cn("flex gap-2", outbound ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarFallback
          className={cn(
            "text-[10px] font-semibold",
            outbound
              ? "bg-accent text-accent-foreground"
              : "bg-navy-100 text-navy-800"
          )}
        >
          {outbound ? "MP" : clientInitials}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[78%] flex flex-col", outbound ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm",
            outbound
              ? "bg-accent text-accent-foreground rounded-tr-sm"
              : "bg-card border border-border rounded-tl-sm"
          )}
        >
          <div className="flex items-center gap-1.5 mb-1 opacity-80">
            {message.channel === "sms" ? (
              <Smartphone className="h-3 w-3" />
            ) : (
              <Mail className="h-3 w-3" />
            )}
            <span className="text-[10px] uppercase tracking-wide">
              {message.channel === "sms" ? "SMS" : "Email"}
            </span>
          </div>
          <p className="leading-relaxed whitespace-pre-wrap">{message.body}</p>
        </div>
        <div className="flex items-center gap-1 px-1 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {outbound && <DeliveryStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}

function DeliveryStatus({ status }: { status: TimelineMessage["status"] }) {
  if (status === "read") return <CheckCheck className="h-3 w-3 text-accent" />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  if (status === "sent") return <Check className="h-3 w-3 text-muted-foreground" />;
  if (status === "failed") return <AlertTriangle className="h-3 w-3 text-destructive" />;
  return null;
}

function ContactHistorySummary({
  client,
  messages,
  doNotContact,
  onDoNotContactChange,
}: {
  client: Client;
  messages: TimelineMessage[];
  doNotContact: boolean;
  onDoNotContactChange: (v: boolean) => void;
}) {
  // Recompute live so newly sent messages are reflected
  const stats = useMemo(() => {
    const live = [...messages];
    const outbound = live.filter(m => m.direction === "outbound");
    const inbound = live.filter(m => m.direction === "inbound");
    const smsCount = live.filter(m => m.channel === "sms").length;
    const emailCount = live.filter(m => m.channel === "email").length;
    const lastTs = live.length
      ? live.reduce((latest, m) => (m.timestamp > latest ? m.timestamp : latest), live[0].timestamp)
      : null;
    let replied = 0;
    outbound.forEach((o) => {
      if (inbound.some(i => i.timestamp > o.timestamp)) replied++;
    });
    return {
      lastContacted: lastTs,
      responseRate: outbound.length ? Math.round((replied / outbound.length) * 100) : 0,
      preferredChannel: (smsCount >= emailCount ? "sms" : "email") as MessageChannel,
      totalMessages: live.length,
      inboundCount: inbound.length,
      outboundCount: outbound.length,
    };
  }, [messages]);

  const lastLabel = stats.lastContacted
    ? formatDistanceToNow(new Date(stats.lastContacted), { addSuffix: true })
    : "Never";

  const items = [
    {
      icon: Clock,
      label: "Last contacted",
      value: lastLabel,
      hint: stats.lastContacted ? format(new Date(stats.lastContacted), "MMM d, yyyy · h:mm a") : "No outreach yet",
    },
    {
      icon: Activity,
      label: "Response rate",
      value: `${stats.responseRate}%`,
      hint: `${stats.inboundCount} inbound · ${stats.outboundCount} outbound`,
    },
    {
      icon: Repeat,
      label: "Preferred channel",
      value: stats.preferredChannel === "sms" ? "SMS" : "Email",
      hint: `${stats.totalMessages} total messages`,
    },
  ];

  return (
    <div className="border-b border-border">
      <div className="grid grid-cols-3 gap-px bg-border">
        {items.map((it) => {
          const Icon = it.icon;
          const isResponseRate = it.label === "Response rate";
          return (
            <div key={it.label} className="bg-background px-3 py-2.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wide">{it.label}</span>
              </div>
              <span className="text-sm font-semibold text-foreground leading-tight">{it.value}</span>
              {isResponseRate ? (
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${stats.responseRate}%` }}
                  />
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground leading-tight truncate" title={it.hint}>
                  {it.hint}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <WeeklySparkline messages={messages} />
      <div className="flex items-center justify-between bg-background px-3 py-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Ban className={cn("h-3.5 w-3.5", doNotContact ? "text-destructive" : "text-muted-foreground")} />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-medium text-foreground">Do Not Contact</span>
            <span className="text-[10px] text-muted-foreground">
              {doNotContact ? "Messaging disabled for this client" : "Allow messaging"}
            </span>
          </div>
        </div>
        <Switch
          checked={doNotContact}
          onCheckedChange={onDoNotContactChange}
          aria-label="Toggle do not contact"
        />
      </div>
    </div>
  );
}

function WeeklySparkline({ messages }: { messages: TimelineMessage[] }) {
  const WEEKS = 8;
  const counts = useMemo(() => {
    const buckets = new Array(WEEKS).fill(0);
    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setHours(0, 0, 0, 0);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    messages.forEach((m) => {
      const d = new Date(m.timestamp);
      const diffDays = Math.floor((startOfThisWeek.getTime() - d.getTime()) / 86400000);
      const weekIdx = Math.floor(diffDays / 7);
      if (weekIdx >= 0 && weekIdx < WEEKS) {
        buckets[WEEKS - 1 - weekIdx]++;
      }
    });
    return buckets;
  }, [messages]);

  const max = Math.max(...counts, 1);
  const W = 100;
  const H = 26;
  const pad = 2;
  const stepX = (W - pad * 2) / (WEEKS - 1);
  const pts = counts.map((c, i) => {
    const x = pad + i * stepX;
    const y = H - pad - (c / max) * (H - pad * 2);
    return { x, y, c };
  });
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1].x.toFixed(1)},${H - pad} L${pts[0].x.toFixed(1)},${H - pad} Z`;
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-background px-3 py-2 border-t border-border flex items-center gap-3">
      <div className="flex flex-col leading-tight shrink-0">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Msg volume</span>
        <span className="text-[11px] font-medium text-foreground">{total} · last 8 wks</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="flex-1 h-7" preserveAspectRatio="none" aria-label="Weekly message volume">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.c > 0 ? 1.5 : 0} fill="hsl(var(--accent))" />
        ))}
      </svg>
    </div>
  );
}

function ClientNotesSection({
  notes,
  onNotesChange,
  clientName,
}: {
  notes: string;
  onNotesChange?: (notes: string) => void;
  clientName: string;
}) {
  const [expanded, setExpanded] = useState(notes.length > 0);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
          Client Notes
        </span>
        <div className="flex items-center gap-2">
          {notes.length > 0 && (
            <span className="text-[10px] text-muted-foreground">{notes.length} chars</span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-3">
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange?.(e.target.value)}
            placeholder={`Add notes for ${clientName}...`}
            className="min-h-[80px] max-h-[200px] resize-y text-xs"
          />
        </div>
      )}
    </div>
  );
}
