import { useState, useRef, useEffect, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { Monitor } from "lucide-react";
import {
  Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Mic, MicOff, Pause, Play, Volume2, VolumeX, PhoneForwarded,
  User, Mail, MapPin, CalendarClock, Shield, FileText,
  Trash2, PhoneOff, Plus, Send, AudioLines, Save,
  ChevronRight, Search, Users2, UserPlus, X, Check,
  Voicemail, Square, Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PageHeader } from "@/components/shared/PageHeader";
import { CallRecordingPlayer } from "@/components/shared/CallRecordingPlayer";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { clients, agents, type Client, type Agent } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

type CallStatus = "idle" | "ringing" | "connected" | "voicemail" | "ended";
type CallDirection = "inbound" | "outbound";

type CallDisposition = "Interested" | "Not Interested" | "Callback" | "Enrolled" | "Wrong Number" | "Do Not Call" | "Pending";

const dispositionConfig: Record<CallDisposition, { color: string; dot: string }> = {
  "Interested": { color: "text-success", dot: "bg-success" },
  "Not Interested": { color: "text-destructive", dot: "bg-destructive" },
  "Callback": { color: "text-accent", dot: "bg-accent" },
  "Enrolled": { color: "text-success", dot: "bg-success" },
  "Wrong Number": { color: "text-muted-foreground", dot: "bg-muted-foreground" },
  "Do Not Call": { color: "text-destructive", dot: "bg-destructive" },
  "Pending": { color: "text-warning", dot: "bg-warning" },
};

interface CallLogEntry {
  id: string;
  client: Client;
  direction: CallDirection;
  status: "completed" | "missed" | "voicemail";
  duration: number; // seconds
  timestamp: string; // ISO
  notes?: string;
  transferredTo?: string;
  conferencedWith?: string[];
  disposition?: CallDisposition;
}

interface TranscriptLine {
  id: string;
  speaker: "agent" | "client";
  text: string;
  time: string;
}

interface ConferenceParticipant {
  agent: Agent;
  joinedAt: number; // callSeconds when joined
  status: "ringing" | "connected" | "left";
}

const dialKeys = [
  { d: "1", sub: "" }, { d: "2", sub: "ABC" }, { d: "3", sub: "DEF" },
  { d: "4", sub: "GHI" }, { d: "5", sub: "JKL" }, { d: "6", sub: "MNO" },
  { d: "7", sub: "PQRS" }, { d: "8", sub: "TUV" }, { d: "9", sub: "WXYZ" },
  { d: "*", sub: "" }, { d: "0", sub: "+" }, { d: "#", sub: "" },
];

// Simulated voice transcription snippets that map to record fields
const transcriptionFlow: { speaker: "client"; text: string; field?: string; value?: string }[] = [
  { speaker: "client", text: "Hi, my name is Robert Williams, I'm calling about my Medicare plan." },
  { speaker: "client", text: "My phone number is 305 555 0192.", field: "phone", value: "(305) 555-0192" },
  { speaker: "client", text: "I'm interested in the Medicare Advantage option.", field: "planType", value: "MA" },
  { speaker: "client", text: "I live in zip code 33139.", field: "zip", value: "33139" },
  { speaker: "client", text: "Please note I prefer morning appointments and my spouse is also eligible.", field: "notes", value: "Prefers morning appointments. Spouse also eligible for coverage." },
  { speaker: "client", text: "You can reach me at robert.williams@email.com.", field: "email", value: "robert.williams@email.com" },
];

interface VoicemailTemplate {
  id: string;
  name: string;
  description: string;
  duration: number;
  category: "Follow-up" | "Renewal" | "Enrollment" | "Appointment" | "Custom";
  script: string;
}

const defaultVoicemailTemplates: VoicemailTemplate[] = [
  { id: "VM-1", name: "General Follow-up", description: "Standard callback request", duration: 15, category: "Follow-up", script: "Hi, this is your Medicare agent calling to follow up on your recent inquiry. Please call us back at your convenience to discuss your options. Thank you!" },
  { id: "VM-2", name: "Renewal Reminder", description: "Upcoming plan renewal", duration: 22, category: "Renewal", script: "Hello, this is a reminder that your Medicare plan renewal is coming up. We'd love to schedule a time to review your coverage and ensure you have the best plan for the upcoming year. Please call us back at your earliest convenience." },
  { id: "VM-3", name: "Open Enrollment", description: "Annual enrollment period", duration: 18, category: "Enrollment", script: "Hi, the Medicare Open Enrollment period is now open. This is a great time to review and update your coverage. Please call us back to schedule a consultation at your convenience." },
  { id: "VM-4", name: "Missed Appointment", description: "Reschedule no-show", duration: 12, category: "Appointment", script: "Hi, we missed you at your scheduled appointment. Please call us back to reschedule at your earliest convenience. Thank you and have a great day!" },
];

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function DialerPage() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "opened_dialer", category: "call", entity: "Softphone Dialer", severity: "info" }); }, [user]);
  const [dialNumber, setDialNumber] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callDirection, setCallDirection] = useState<CallDirection>("outbound");
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [search, setSearch] = useState("");
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAgent, setTransferAgent] = useState<Agent | null>(null);
  const [transferQuery, setTransferQuery] = useState("");
  const [transferMode, setTransferMode] = useState<"warm" | "cold">("warm");
  const [transferring, setTransferring] = useState(false);
  const [conferenceOpen, setConferenceOpen] = useState(false);
  const [conferenceQuery, setConferenceQuery] = useState("");
  const [participants, setParticipants] = useState<ConferenceParticipant[]>([]);
  const [voicemailTemplates, setVoicemailTemplates] = useState<VoicemailTemplate[]>(defaultVoicemailTemplates);
  const [previewingVm, setPreviewingVm] = useState<string | null>(null);
  const [vmTemplateOpen, setVmTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<VoicemailTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", category: "Follow-up" as VoicemailTemplate["category"], script: "" });
  const [recentCalls, setRecentCalls] = useState<CallLogEntry[]>(() => [
    { id: "CL-1", client: clients[0], direction: "inbound", status: "completed", duration: 342, timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), notes: "Discussed renewal options.", disposition: "Interested" },
    { id: "CL-2", client: clients[1], direction: "outbound", status: "completed", duration: 540, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), conferencedWith: ["Daniel Reyes"], disposition: "Enrolled" },
    { id: "CL-3", client: clients[2], direction: "inbound", status: "missed", duration: 0, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), disposition: "Pending" },
    { id: "CL-4", client: clients[3], direction: "outbound", status: "voicemail", duration: 22, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), disposition: "Callback" },
    { id: "CL-5", client: clients[4], direction: "inbound", status: "completed", duration: 780, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(), transferredTo: "Sarah Chen", disposition: "Not Interested" },
  ]);

  // Record fields populated by voice transcription
  const [recordFields, setRecordFields] = useState({
    name: "", phone: "", email: "", planType: "", zip: "", notes: "",
  });

  // Call disposition that saves with the record
  const [disposition, setDisposition] = useState<CallDisposition>("Pending");

  // Supervisor screen-pop
  const [screenPop, setScreenPop] = useState<{ message: string; id: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.message) {
        setScreenPop({ message: detail.message, id: Date.now() });
        setTimeout(() => setScreenPop(null), 12000);
      }
    };
    window.addEventListener("supervisor-screen-pop", handler);
    return () => window.removeEventListener("supervisor-screen-pop", handler);
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const availableAgents = useMemo(
    () => agents.filter(a => a.status === "Active"),
    [],
  );

  const filteredTransferAgents = useMemo(() => {
    const q = transferQuery.toLowerCase();
    return availableAgents.filter(a =>
      a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.phone.includes(q)
    );
  }, [transferQuery, availableAgents]);

  const filteredConferenceAgents = useMemo(() => {
    const q = conferenceQuery.toLowerCase();
    return availableAgents.filter(a =>
      (a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)) &&
      !participants.some(p => p.agent.id === a.id)
    );
  }, [conferenceQuery, availableAgents, participants]);

  // Call timer
  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  // Stop transcription when call ends
  useEffect(() => {
    if (callStatus !== "connected" && transcriptTimerRef.current) {
      clearInterval(transcriptTimerRef.current);
      transcriptTimerRef.current = null;
      setTranscribing(false);
    }
  }, [callStatus]);

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search]);

  const startCall = (client: Client | null, direction: CallDirection, forceVoicemail = false) => {
    setCallDirection(direction);
    setActiveClient(client);
    setCallStatus("ringing");
    setMuted(false);
    setOnHold(false);
    setParticipants([]);
    setTranscript([]);
    setDisposition("Pending");
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: `started_${direction}_call`, category: "call", entity: client?.name ?? dialNumber, entityId: client?.id, severity: "info" });
    setRecordFields({
      name: client?.name ?? "",
      phone: client?.phone ?? dialNumber,
      email: client?.email ?? "",
      planType: client?.planType ?? "",
      zip: client?.zip ?? "",
      notes: client?.notes ?? "",
    });
    // Simulate connection or voicemail after 2.5s
    setTimeout(() => {
      if (forceVoicemail || (direction === "outbound" && Math.random() < 0.3)) {
        setCallStatus("voicemail");
      } else {
        setCallStatus("connected");
      }
    }, 2500);
  };

  const endCall = () => {
    if (activeClient) {
      const entry: CallLogEntry = {
        id: `CL-${Date.now()}`,
        client: activeClient,
        direction: callDirection,
        status: callSeconds > 0 ? "completed" : "missed",
        duration: callSeconds,
        timestamp: new Date().toISOString(),
        notes: recordFields.notes || undefined,
        transferredTo: transferring && transferAgent ? transferAgent.name : undefined,
        conferencedWith: participants.filter(p => p.status === "connected").map(p => p.agent.name),
        disposition,
      };
      setRecentCalls((prev) => [entry, ...prev]);
      logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "ended_call", category: "call", entity: activeClient.name, entityId: activeClient.id, severity: "info", details: `Duration: ${callSeconds}s, Disposition: ${disposition}` });
    }
    if (transferTimerRef.current) clearTimeout(transferTimerRef.current);
    setCallStatus("idle");
    setActiveClient(null);
    setDialNumber("");
    setParticipants([]);
    setTransferring(false);
    setTransferAgent(null);
  };

  const dropVoicemail = (templateId: string) => {
    const template = voicemailTemplates.find(t => t.id === templateId);
    if (activeClient) {
      const entry: CallLogEntry = {
        id: `CL-${Date.now()}`,
        client: activeClient,
        direction: callDirection,
        status: "voicemail",
        duration: template?.duration ?? 0,
        timestamp: new Date().toISOString(),
        notes: `Voicemail dropped: ${template?.name ?? "Custom"}`,
        disposition: "Callback",
      };
      setRecentCalls((prev) => [entry, ...prev]);
    }
    setPreviewingVm(null);
    setCallStatus("idle");
    setActiveClient(null);
    setDialNumber("");
    setParticipants([]);
    setTransferring(false);
    setTransferAgent(null);
  };

  const saveTemplate = () => {
    if (!templateForm.name.trim() || !templateForm.script.trim()) return;
    if (editingTemplate) {
      setVoicemailTemplates((prev) => prev.map(t =>
        t.id === editingTemplate.id
          ? { ...t, name: templateForm.name, description: templateForm.description, category: templateForm.category, script: templateForm.script }
          : t
      ));
    } else {
      const newTemplate: VoicemailTemplate = {
        id: `VM-${Date.now()}`,
        name: templateForm.name,
        description: templateForm.description || "Custom template",
        duration: Math.max(8, Math.min(60, Math.round(templateForm.script.length / 15))),
        category: templateForm.category,
        script: templateForm.script,
      };
      setVoicemailTemplates((prev) => [...prev, newTemplate]);
    }
    setVmTemplateOpen(false);
    setEditingTemplate(null);
    setTemplateForm({ name: "", description: "", category: "Follow-up", script: "" });
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: "", description: "", category: "Follow-up", script: "" });
    setVmTemplateOpen(true);
  };

  const openEditTemplate = (template: VoicemailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ name: template.name, description: template.description, category: template.category, script: template.script });
    setVmTemplateOpen(true);
  };

  const deleteTemplate = (id: string) => {
    setVoicemailTemplates((prev) => prev.filter(t => t.id !== id));
  };

  const initiateTransfer = () => {
    if (!transferAgent) return;
    setTransferring(true);
    setTransferOpen(false);
    if (transferMode === "cold") {
      // Cold transfer: hand off immediately
      transferTimerRef.current = setTimeout(() => {
        endCall();
      }, 1500);
    }
    // Warm transfer: agent stays on the line (simulated consult)
  };

  const completeWarmTransfer = () => {
    if (transferTimerRef.current) clearTimeout(transferTimerRef.current);
    endCall();
  };

  const cancelTransfer = () => {
    if (transferTimerRef.current) clearTimeout(transferTimerRef.current);
    setTransferring(false);
    setTransferAgent(null);
  };

  const addParticipant = (agent: Agent) => {
    const newParticipant: ConferenceParticipant = {
      agent,
      joinedAt: callSeconds,
      status: "ringing",
    };
    setParticipants((prev) => [...prev, newParticipant]);
    setConferenceOpen(false);
    setConferenceQuery("");
    // Simulate agent joining after 2s
    setTimeout(() => {
      setParticipants((prev) =>
        prev.map(p => p.agent.id === agent.id ? { ...p, status: "connected" } : p)
      );
    }, 2000);
  };

  const removeParticipant = (agentId: string) => {
    setParticipants((prev) => prev.map(p =>
      p.agent.id === agentId ? { ...p, status: "left" } : p
    ));
    setTimeout(() => {
      setParticipants((prev) => prev.filter(p => p.agent.id !== agentId));
    }, 500);
  };

  const handleDialKey = (key: string) => {
    setDialNumber((prev) => (prev.length < 15 ? prev + key : prev));
  };

  const startTranscription = () => {
    if (transcribing) return;
    setTranscribing(true);
    let i = 0;
    transcriptTimerRef.current = setInterval(() => {
      if (i >= transcriptionFlow.length) {
        if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
        transcriptTimerRef.current = null;
        setTranscribing(false);
        return;
      }
      const item = transcriptionFlow[i];
      setTranscript((prev) => [...prev, {
        id: `T-${Date.now()}-${i}`,
        speaker: item.speaker,
        text: item.text,
        time: fmtDuration(callSeconds),
      }]);
      if (item.field && item.value) {
        setRecordFields((prev) => ({ ...prev, [item.field!]: item.value! }));
      }
      i++;
    }, 2200);
  };

  const stopTranscription = () => {
    if (transcriptTimerRef.current) clearInterval(transcriptTimerRef.current);
    transcriptTimerRef.current = null;
    setTranscribing(false);
  };

  const updateField = (field: keyof typeof recordFields, value: string) => {
    setRecordFields((prev) => ({ ...prev, [field]: value }));
  };

  const statusConfig: Record<CallStatus, { label: string; color: string; dot: string }> = {
    idle: { label: "Ready", color: "text-muted-foreground", dot: "bg-muted-foreground" },
    ringing: { label: "Ringing…", color: "text-warning", dot: "bg-warning animate-pulse" },
    connected: { label: "Connected", color: "text-success", dot: "bg-success" },
    voicemail: { label: "Voicemail", color: "text-accent", dot: "bg-accent" },
    ended: { label: "Call ended", color: "text-muted-foreground", dot: "bg-muted-foreground" },
  };

  const callActive = callStatus === "connected" || callStatus === "ringing" || callStatus === "voicemail";

  return (
    <div className="space-y-6">
      <PageHeader title="Softphone Dialer" description="Inbound & outbound calls with live voice transcription and record capture">
        <Badge variant="outline" className="gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", statusConfig[callStatus].dot)} />
          <span className={statusConfig[callStatus].color}>{statusConfig[callStatus].label}</span>
        </Badge>
        {callStatus === "connected" && (
          <Badge variant="secondary" className="font-mono">{fmtDuration(callSeconds)}</Badge>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Dial pad + recent calls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Dial pad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-accent" /> Dial Pad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder="Enter number…"
                className="text-center text-lg font-mono tracking-wider h-12"
                disabled={callActive}
              />
              <div className="grid grid-cols-3 gap-2">
                {dialKeys.map((k) => (
                  <button
                    key={k.d}
                    onClick={() => handleDialKey(k.d)}
                    disabled={callActive}
                    className="flex flex-col items-center justify-center h-14 rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-accent/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-xl font-semibold font-display">{k.d}</span>
                    {k.sub && <span className="text-[9px] text-muted-foreground tracking-wider">{k.sub}</span>}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-success hover:bg-success/90"
                  disabled={callActive || (!dialNumber && !activeClient)}
                  onClick={() => startCall(activeClient, "outbound")}
                >
                  <PhoneCall className="mr-2 h-4 w-4" /> Call
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDialNumber("")}
                  disabled={callActive}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent calls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Recent Calls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <ScrollArea className="h-[420px] pr-2">
                {recentCalls.map((entry) => {
                  const Icon = entry.direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
                  const hasRecording = entry.status === "completed" && entry.duration > 0;
                  const isOpen = recordingId === entry.id;
                  return (
                    <div key={entry.id} className="rounded-lg">
                      <div className="flex items-center gap-3 p-2 hover:bg-muted/50 transition-colors text-left">
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
                          entry.status === "missed" ? "bg-destructive/10 text-destructive" :
                          entry.status === "voicemail" ? "bg-warning/10 text-warning" :
                          "bg-accent/10 text-accent"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => { setActiveClient(entry.client); setDialNumber(entry.client.phone); }}
                        >
                          <p className="text-sm font-medium truncate">{entry.client.name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs text-muted-foreground">
                              {entry.status === "missed" ? "Missed call" :
                               entry.status === "voicemail" ? "Left voicemail" :
                               fmtDuration(entry.duration)}
                            </p>
                            {entry.disposition && entry.disposition !== "Pending" && (
                              <Badge variant="outline" className={cn("h-4 px-1.5 text-[9px] gap-1", dispositionConfig[entry.disposition].color, "border-current/30")}>
                                <span className={cn("h-1.5 w-1.5 rounded-full", dispositionConfig[entry.disposition].dot)} />
                                {entry.disposition}
                              </Badge>
                            )}
                            {entry.transferredTo && (
                              <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 text-accent border-accent/30">
                                <PhoneForwarded className="h-2.5 w-2.5" /> {entry.transferredTo}
                              </Badge>
                            )}
                            {entry.conferencedWith && entry.conferencedWith.length > 0 && (
                              <Badge variant="outline" className="h-4 px-1 text-[9px] gap-0.5 text-accent border-accent/30">
                                <Users2 className="h-2.5 w-2.5" /> {entry.conferencedWith.length}
                              </Badge>
                            )}
                          </div>
                        </button>
                        {hasRecording && (
                          <Button
                            size="sm"
                            variant={isOpen ? "secondary" : "ghost"}
                            className="h-7 px-2 shrink-0 gap-1 text-xs"
                            onClick={() => setRecordingId(isOpen ? null : entry.id)}
                          >
                            <Play className="h-3 w-3" />
                            {isOpen ? "Hide" : "Recording"}
                          </Button>
                        )}
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {format(parseISO(entry.timestamp), "h:mm a")}
                        </span>
                      </div>
                      {isOpen && hasRecording && (
                        <CallRecordingPlayer
                          callId={entry.id}
                          duration={entry.duration}
                          callerName={entry.client.name}
                        />
                      )}
                    </div>
                  );
                })}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Voicemail templates */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Voicemail className="h-4 w-4 text-accent" /> Voicemail Drops
                </CardTitle>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={openNewTemplate}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardDescription className="text-xs">Pre-recorded templates for no-answer calls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <ScrollArea className="h-[200px] pr-2">
                {voicemailTemplates.map((tpl) => (
                  <div key={tpl.id} className="group rounded-lg p-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
                        <AudioLines className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground">{tpl.category} · {tpl.duration}s</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditTemplate(tpl)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTemplate(tpl.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* CENTER: Active call / lead info */}
        <div className="lg:col-span-5 space-y-4">
          <Card className={cn(
            "transition-colors",
            callStatus === "connected" && "ring-2 ring-success/40",
            callStatus === "ringing" && "ring-2 ring-warning/40"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" /> Active Call
                </CardTitle>
                {callStatus === "connected" && (
                  <Badge variant="outline" className="font-mono text-success">{fmtDuration(callSeconds)}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activeClient && callActive ? (
                <div className="space-y-5">
                  {/* Lead header */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-accent/20">
                      <AvatarFallback className="bg-gradient-to-br from-navy-600 to-navy-800 text-white font-display text-lg">
                        {activeClient.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-lg leading-tight">{activeClient.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{activeClient.phone}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={activeClient.status} />
                        <Badge variant="outline" className="text-xs">{activeClient.planType}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        {callDirection === "inbound" ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
                        {callDirection}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{activeClient.carrier}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Lead info grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">Email</span>
                      <span className="font-medium truncate">{activeClient.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">ZIP</span>
                      <span className="font-medium">{activeClient.zip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">Renewal</span>
                      <span className="font-medium">{format(parseISO(activeClient.renewalDate), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">Age</span>
                      <span className="font-medium">{activeClient.age}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground text-xs">Agent</span>
                      <span className="font-medium">{activeClient.agent}</span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <span className="text-muted-foreground text-xs">Source: {activeClient.leadSource}</span>
                    </div>
                  </div>

                  {/* Voicemail drop panel */}
                  {callStatus === "voicemail" && (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Voicemail className="h-5 w-5 text-accent" />
                        <div>
                          <p className="text-sm font-semibold">Voicemail — No Answer</p>
                          <p className="text-xs text-muted-foreground">Select a pre-recorded template to drop</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {voicemailTemplates.map((tpl) => (
                          <div
                            key={tpl.id}
                            className={cn(
                              "rounded-lg border p-3 transition-colors",
                              previewingVm === tpl.id ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-muted/50"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate">{tpl.name}</p>
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">{tpl.category}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.script}</p>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">{tpl.duration}s</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => setPreviewingVm(previewingVm === tpl.id ? null : tpl.id)}
                              >
                                {previewingVm === tpl.id ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                {previewingVm === tpl.id ? "Stop" : "Preview"}
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-3 text-xs gap-1 bg-accent hover:bg-accent/90"
                                onClick={() => dropVoicemail(tpl.id)}
                              >
                                <Voicemail className="h-3 w-3" /> Drop Voicemail
                              </Button>
                            </div>
                            {previewingVm === tpl.id && (
                              <div className="mt-2 flex items-center gap-1">
                                {Array.from({ length: 28 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="flex-1 rounded-full bg-accent/40 animate-pulse"
                                    style={{ height: `${4 + Math.sin(i * 0.8) * 8 + Math.random() * 6}px` }}
                                  />
                                ))}
                                <span className="text-[10px] text-muted-foreground font-mono ml-1">{tpl.duration}s</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="icon"
                          className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90"
                          onClick={endCall}
                        >
                          <PhoneOff className="h-6 w-6" />
                        </Button>
                        <p className="text-xs text-muted-foreground">Hang up without leaving a message</p>
                      </div>
                    </div>
                  )}

                  {callStatus === "connected" && (
                    <>
                  {/* Transfer / Conference banner */}
                  {transferring && transferAgent && (
                    <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                        <span className="font-medium">
                          {transferMode === "warm" ? "Warm transfer" : "Cold transfer"} to {transferAgent.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {transferMode === "warm" && (
                          <Button size="sm" className="h-7" onClick={completeWarmTransfer}>
                            <Check className="mr-1 h-3 w-3" /> Complete
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7" onClick={cancelTransfer}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Conference participants */}
                  {participants.length > 0 && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Users2 className="h-3.5 w-3.5" /> Conference ({participants.length})
                      </p>
                      {participants.map((p) => (
                        <div key={p.agent.id} className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-navy-100 text-navy-700 text-[10px] font-medium">
                              {p.agent.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{p.agent.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.status === "ringing" ? "Ringing…" : p.status === "left" ? "Left" : `Joined · ${fmtDuration(callSeconds - p.joinedAt)}`}
                            </p>
                          </div>
                          {p.status === "connected" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => removeParticipant(p.agent.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Call controls */}
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-12 w-12 rounded-full", muted && "bg-destructive/10 border-destructive/30 text-destructive")}
                      onClick={() => setMuted(!muted)}
                      disabled={callStatus !== "connected"}
                    >
                      {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-12 w-12 rounded-full", onHold && "bg-warning/10 border-warning/30 text-warning")}
                      onClick={() => setOnHold(!onHold)}
                      disabled={callStatus !== "connected"}
                    >
                      {onHold ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-12 w-12 rounded-full", (transferOpen || transferring) && "bg-accent/10 border-accent/40 text-accent")}
                      onClick={() => setTransferOpen(true)}
                      disabled={callStatus !== "connected" || transferring}
                      title="Warm / cold transfer"
                    >
                      <PhoneForwarded className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-12 w-12 rounded-full", participants.length > 0 && "bg-accent/10 border-accent/40 text-accent")}
                      onClick={() => setConferenceOpen(true)}
                      disabled={callStatus !== "connected"}
                      title="Add to conference"
                    >
                      <Users2 className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn("h-12 w-12 rounded-full", !speakerOn && "bg-muted")}
                      onClick={() => setSpeakerOn(!speakerOn)}
                    >
                      {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                    </Button>
                    <Button
                      size="icon"
                      className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90"
                      onClick={endCall}
                    >
                      <PhoneOff className="h-6 w-6" />
                    </Button>
                  </div>
                  {onHold && (
                    <p className="text-center text-xs text-warning font-medium">Call on hold</p>
                  )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 mb-4">
                    <PhoneCall className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No active call</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Dial a number or select a lead to start an outbound call. Inbound calls will appear here automatically.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startCall(clients[0], "inbound")}
                    >
                      <PhoneIncoming className="mr-1.5 h-4 w-4" /> Simulate inbound
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startCall(clients[1], "outbound", true)}
                    >
                      <Voicemail className="mr-1.5 h-4 w-4" /> Simulate voicemail
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live transcript */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <AudioLines className="h-4 w-4 text-accent" /> Live Transcript
                </CardTitle>
                {callStatus === "connected" && (
                  <Button
                    size="sm"
                    variant={transcribing ? "destructive" : "secondary"}
                    onClick={transcribing ? stopTranscription : startTranscription}
                  >
                    {transcribing ? (
                      <><span className="mr-1.5 h-2 w-2 rounded-full bg-white animate-pulse" /> Stop</>
                    ) : (
                      <><Mic className="mr-1.5 h-3.5 w-3.5" /> Start transcription</>
                    )}
                  </Button>
                )}
              </div>
              <CardDescription className="text-xs">
                Voice-to-text transcription auto-fills record fields below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-2">
                {transcript.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-xs text-muted-foreground">
                      {callStatus === "connected"
                        ? "Click \"Start transcription\" to capture caller speech"
                        : "Transcript appears during active calls"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transcript.map((line) => (
                      <div key={line.id} className={cn(
                        "flex gap-2",
                        line.speaker === "agent" ? "justify-end" : "justify-start"
                      )}>
                        {line.speaker === "client" && (
                          <div className="h-7 w-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-semibold shrink-0">
                            {activeClient?.name.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "C"}
                          </div>
                        )}
                        <div className={cn(
                          "max-w-[75%] rounded-xl px-3 py-2",
                          line.speaker === "agent"
                            ? "bg-navy-700 text-white"
                            : "bg-muted text-foreground"
                        )}>
                          <p className="text-sm leading-snug">{line.text}</p>
                          <p className={cn("text-[10px] mt-0.5", line.speaker === "agent" ? "text-white/60" : "text-muted-foreground")}>
                            {line.time}
                          </p>
                        </div>
                        {line.speaker === "agent" && (
                          <div className="h-7 w-7 rounded-full bg-navy-700 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                            PC
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Record fields + lead search */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" /> Record Fields
              </CardTitle>
              <CardDescription className="text-xs">Edit captured data or type manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <Input value={recordFields.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Full name" className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={recordFields.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Phone" className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input value={recordFields.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Email" className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Plan</label>
                  <Input value={recordFields.planType} onChange={(e) => updateField("planType", e.target.value)} placeholder="Plan" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">ZIP</label>
                  <Input value={recordFields.zip} onChange={(e) => updateField("zip", e.target.value)} placeholder="ZIP" className="h-9 text-sm font-mono" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Textarea value={recordFields.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Call notes…" className="text-sm min-h-[80px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Call Disposition</label>
                <Select value={disposition} onValueChange={(v) => setDisposition(v as CallDisposition)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select disposition…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(dispositionConfig) as CallDisposition[]).map((d) => (
                      <SelectItem key={d} value={d}>
                        <span className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", dispositionConfig[d].dot)} />
                          {d}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1">
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save Record
                </Button>
                <Button size="sm" variant="outline">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lead search */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Quick Dial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads…"
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <ScrollArea className="h-[200px] pr-2">
                <div className="space-y-1">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setActiveClient(c); setDialNumber(c.phone); }}
                      className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-medium">
                          {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{c.phone}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <PhoneForwarded className="h-4 w-4 text-accent" /> Transfer Call
            </DialogTitle>
            <DialogDescription>
              Warm transfer consults with the agent first; cold transfer hands off immediately.
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTransferMode("warm")}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                transferMode === "warm" ? "border-accent bg-accent/10" : "border-border hover:bg-muted/50"
              )}
            >
              <p className="text-sm font-medium">Warm Transfer</p>
              <p className="text-xs text-muted-foreground">Consult agent before handing off</p>
            </button>
            <button
              onClick={() => setTransferMode("cold")}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                transferMode === "cold" ? "border-accent bg-accent/10" : "border-border hover:bg-muted/50"
              )}
            >
              <p className="text-sm font-medium">Cold Transfer</p>
              <p className="text-xs text-muted-foreground">Hand off immediately</p>
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={transferQuery}
              onChange={(e) => setTransferQuery(e.target.value)}
              placeholder="Search agents…"
              className="pl-9 h-9 text-sm"
            />
          </div>

          <ScrollArea className="h-[220px] pr-2 -mr-2">
            <div className="space-y-1">
              {filteredTransferAgents.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No agents found</p>
              ) : (
                filteredTransferAgents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setTransferAgent(a)}
                    className={cn(
                      "w-full flex items-center gap-2.5 rounded-lg p-2 transition-colors text-left",
                      transferAgent?.id === a.id ? "bg-accent/10 ring-1 ring-accent/30" : "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-medium">
                        {a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.role} · {a.phone}</p>
                    </div>
                    {transferAgent?.id === a.id && <Check className="h-4 w-4 text-accent shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={initiateTransfer} disabled={!transferAgent}>
              <PhoneForwarded className="mr-1.5 h-4 w-4" />
              {transferMode === "warm" ? "Start Warm Transfer" : "Cold Transfer Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conference dialog */}
      <Dialog open={conferenceOpen} onOpenChange={setConferenceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Users2 className="h-4 w-4 text-accent" /> Add to Conference
            </DialogTitle>
            <DialogDescription>
              Add agents to a multi-party conference call. {participants.length > 0 && `${participants.length} already joined.`}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={conferenceQuery}
              onChange={(e) => setConferenceQuery(e.target.value)}
              placeholder="Search agents…"
              className="pl-9 h-9 text-sm"
            />
          </div>

          <ScrollArea className="h-[260px] pr-2 -mr-2">
            <div className="space-y-1">
              {filteredConferenceAgents.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">No available agents</p>
              ) : (
                filteredConferenceAgents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => addParticipant(a)}
                    className="w-full flex items-center gap-2.5 rounded-lg p-2 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-navy-100 text-navy-700 text-xs font-medium">
                        {a.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.role} · {a.phone}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-accent shrink-0" />
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConferenceOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voicemail template editor dialog */}
      <Dialog open={vmTemplateOpen} onOpenChange={setVmTemplateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Voicemail className="h-4 w-4 text-accent" />
              {editingTemplate ? "Edit Template" : "New Voicemail Template"}
            </DialogTitle>
            <DialogDescription>
              Create a pre-recorded voicemail message agents can drop on no-answer calls.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Template Name</label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Renewal Reminder"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {(["Follow-up", "Renewal", "Enrollment", "Appointment", "Custom"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setTemplateForm((prev) => ({ ...prev, category: cat }))}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      templateForm.category === cat ? "border-accent bg-accent/10 text-accent" : "border-border hover:bg-muted/50"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Script</label>
              <Textarea
                value={templateForm.script}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, script: e.target.value }))}
                placeholder="Type the voicemail message script…"
                className="text-sm min-h-[100px]"
              />
              <p className="text-[10px] text-muted-foreground">
                Estimated duration: ~{Math.max(8, Math.min(60, Math.round(templateForm.script.length / 15)))}s
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVmTemplateOpen(false)}>Cancel</Button>
            <Button onClick={saveTemplate} disabled={!templateForm.name.trim() || !templateForm.script.trim()}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supervisor screen-pop */}
      {screenPop && (
        <div className="fixed top-20 right-6 z-50 max-w-sm animate-in slide-in-from-right duration-300">
          <div className="rounded-xl border-2 border-accent/50 bg-card shadow-xl shadow-accent/10 p-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent shrink-0">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-accent flex items-center gap-1.5">
                  Supervisor Prompt
                </p>
                <p className="text-sm text-foreground mt-0.5">{screenPop.message}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => setScreenPop(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={() => { setRecordFields((prev) => ({ ...prev, notes: prev.notes ? `${prev.notes}\n[Supervisor] ${screenPop.message}` : `[Supervisor] ${screenPop.message}` })); setScreenPop(null); }}>
                <Save className="mr-1 h-3 w-3" /> Add to Notes
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setScreenPop(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
