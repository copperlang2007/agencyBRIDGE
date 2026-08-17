import { useState, useEffect, useRef, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import {
  Headphones, Radio, Send, Ban, CheckCircle2,
  PhoneCall, PhoneIncoming, PhoneOutgoing, Activity, Users2,
  TrendingUp, TrendingDown, Minus, Volume2, Monitor,
  ChevronRight, X, AlertTriangle, Zap, Archive, Search,
  CalendarDays, DollarSign, Star, PlayCircle, Clock, ArrowUpRight, ArrowDownRight,
  Mic, MicOff, Square, BellRing, Gauge, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { CallRecordingPlayer } from "@/components/shared/CallRecordingPlayer";
import { agents, clients, type Agent, type Client } from "@/lib/mockData";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

type AgentCallStatus = "available" | "on-call" | "wrap-up" | "suspended";
type DealHeat = "hot" | "warm" | "cold";

interface LiveCall {
  agentId: string;
  client: Client;
  direction: "inbound" | "outbound";
  startedAt: number; // epoch ms
  seconds: number;
  transcript: { id: string; speaker: "agent" | "client"; text: string; t: number; sentiment: Sentiment }[];
  dealScore: number; // 0-100
  heat: DealHeat;
}

type Sentiment = "positive" | "excited" | "neutral" | "concerned" | "negative";

interface SentimentConfig {
  label: string;
  color: string;
  bg: string;
  dot: string;
  bar: string;
  emoji: string;
}

const sentimentConfig: Record<Sentiment, SentimentConfig> = {
  excited: { label: "Excited", color: "text-success", bg: "bg-success/15", dot: "bg-success", bar: "bg-success", emoji: "😄" },
  positive: { label: "Positive", color: "text-accent", bg: "bg-accent/15", dot: "bg-accent", bar: "bg-accent", emoji: "🙂" },
  neutral: { label: "Neutral", color: "text-muted-foreground", bg: "bg-muted/40", dot: "bg-muted-foreground", bar: "bg-muted-foreground", emoji: "😐" },
  concerned: { label: "Concerned", color: "text-warning", bg: "bg-warning/15", dot: "bg-warning", bar: "bg-warning", emoji: "😟" },
  negative: { label: "Negative", color: "text-destructive", bg: "bg-destructive/15", dot: "bg-destructive", bar: "bg-destructive", emoji: "😠" },
};

// Keyword-based sentiment analyzer (simulated NLP)
const sentimentKeywords: Record<Sentiment, string[]> = {
  excited: ["great", "perfect", "exactly", "amazing", "love", "wonderful", "fantastic", "enroll", "yes", "sounds great", "that's exactly", "hoping for"],
  positive: ["happy", "good", "interested", "help", "glad", "thank", "appreciate", "nice", "sure", "okay", "ok", "sounds good", "looking for"],
  concerned: ["not sure", "worried", "concerned", "confused", "don't understand", "how does", "what about", "wait", "hmm", "maybe", "spouse", "discuss"],
  negative: ["no", "not interested", "don't want", "wrong", "bad", "terrible", "cancel", "stop", "do not call", "happy with current", "not interested in switching", "objection"],
  neutral: [],
};

function analyzeSentiment(text: string, speaker: "agent" | "client"): Sentiment {
  const lower = text.toLowerCase();
  // Check negative first (strongest signal)
  for (const kw of sentimentKeywords.negative) if (lower.includes(kw)) return "negative";
  // Then concerned
  for (const kw of sentimentKeywords.concerned) if (lower.includes(kw)) return "concerned";
  // Then excited
  for (const kw of sentimentKeywords.excited) if (lower.includes(kw)) return "excited";
  // Then positive
  for (const kw of sentimentKeywords.positive) if (lower.includes(kw)) return "positive";
  // Agents tend to be neutral/positive, clients default to neutral
  return speaker === "agent" ? "positive" : "neutral";
}

interface AgentState {
  agent: Agent;
  status: AgentCallStatus;
  callsToday: number;
  avgHandleTime: number; // seconds
  dealScore: number;
  heat: DealHeat;
  whisperQueue: string[];
}

// ── Helpers ─────────────────────────────────────────────────────

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function heatFromScore(score: number): DealHeat {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

const heatConfig: Record<DealHeat, { label: string; ring: string; bg: string; text: string; dot: string; icon: typeof TrendingUp; bar: string }> = {
  hot: { label: "Hot", ring: "ring-success/50", bg: "bg-success/10", text: "text-success", dot: "bg-success", icon: TrendingUp, bar: "bg-success" },
  warm: { label: "Warm", ring: "ring-warning/50", bg: "bg-warning/10", text: "text-warning", dot: "bg-warning", icon: Minus, bar: "bg-warning" },
  cold: { label: "Cold", ring: "ring-destructive/50", bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive", icon: TrendingDown, bar: "bg-destructive" },
};

const statusConfig: Record<AgentCallStatus, { label: string; dot: string; text: string }> = {
  available: { label: "Available", dot: "bg-success", text: "text-success" },
  "on-call": { label: "On Call", dot: "bg-accent animate-pulse", text: "text-accent" },
  "wrap-up": { label: "Wrap-up", dot: "bg-warning", text: "text-warning" },
  suspended: { label: "Suspended", dot: "bg-destructive", text: "text-destructive" },
};

// Simulated transcript lines for live calls
const simLines: { speaker: "agent" | "client"; text: string }[] = [
  { speaker: "client", text: "Hi, I'm calling about my Medicare Advantage options." },
  { speaker: "agent", text: "Absolutely, I'd be happy to help. Are you currently on Original Medicare?" },
  { speaker: "client", text: "Yes, I have Parts A and B. I'm looking for something with dental and vision." },
  { speaker: "agent", text: "Great — several MA plans include those. What's your zip code?" },
  { speaker: "client", text: "I'm in 33139, and I'd like a $0 premium plan if possible." },
  { speaker: "agent", text: "We have a few $0 premium options in Miami-Dade. Let me pull up the details." },
  { speaker: "client", text: "Does the plan include a fitness benefit like SilverSneakers?" },
  { speaker: "agent", text: "Yes, this plan includes SilverSneakers plus an OTC card for health products." },
  { speaker: "client", text: "That sounds great. What about prescription drug coverage?" },
  { speaker: "agent", text: "Part D is built in — let me check the formulary for your current medications." },
  { speaker: "client", text: "I take Lisinopril and Metformin, both generics." },
  { speaker: "agent", text: "Both are covered on Tier 1 with a $0 copay on this plan." },
  { speaker: "client", text: "That's exactly what I was hoping for. How do I enroll?" },
];

// ── Archived Calls ─────────────────────────────────────────────

type DealOutcome = "Enrolled" | "Interested" | "Callback" | "Not Interested" | "No Answer" | "DNC";

interface ArchivedCall {
  id: string;
  agentId: string;
  agentName: string;
  client: Client;
  direction: "inbound" | "outbound";
  date: string; // ISO
  duration: number; // seconds
  outcome: DealOutcome;
  dealScore: number;
  heat: DealHeat;
  dealValue: number; // estimated annual commission
  notes: string;
  hasRecording: boolean;
}

const outcomeConfig: Record<DealOutcome, { label: string; color: string; bg: string; icon: typeof Star }> = {
  Enrolled: { label: "Enrolled", color: "text-success", bg: "bg-success/10", icon: CheckCircle2 },
  Interested: { label: "Interested", color: "text-accent", bg: "bg-accent/10", icon: Star },
  Callback: { label: "Callback", color: "text-warning", bg: "bg-warning/10", icon: Clock },
  "Not Interested": { label: "Not Interested", color: "text-muted-foreground", bg: "bg-muted/40", icon: ArrowDownRight },
  "No Answer": { label: "No Answer", color: "text-muted-foreground", bg: "bg-muted/40", icon: X },
  DNC: { label: "Do Not Call", color: "text-destructive", bg: "bg-destructive/10", icon: Ban },
};

const archivedCalls: ArchivedCall[] = [
  { id: "AR-001", agentId: "AG-001", agentName: "Daniel Reyes", client: clients[0], direction: "inbound", date: new Date(Date.now() - 1000*60*45).toISOString(), duration: 342, outcome: "Enrolled", dealScore: 88, heat: "hot", dealValue: 5400, notes: "Client enrolled in UHC MA $0 premium plan with dental and vision. Part D formulary verified for Lisinopril and Metformin.", hasRecording: true },
  { id: "AR-002", agentId: "AG-002", agentName: "Sarah Chen", client: clients[1], direction: "outbound", date: new Date(Date.now() - 1000*60*60*2).toISOString(), duration: 540, outcome: "Interested", dealScore: 72, heat: "hot", dealValue: 4200, notes: "Client interested in Humana MA plan. Wants to discuss with spouse before enrolling. Callback scheduled for Friday.", hasRecording: true },
  { id: "AR-003", agentId: "AG-003", agentName: "Michael Torres", client: clients[2], direction: "outbound", date: new Date(Date.now() - 1000*60*60*4).toISOString(), duration: 195, outcome: "Not Interested", dealScore: 28, heat: "cold", dealValue: 0, notes: "Client happy with current Medigap plan. Not interested in switching to MA. Objection around network restrictions.", hasRecording: true },
  { id: "AR-004", agentId: "AG-004", agentName: "Emily Johnson", client: clients[3], direction: "inbound", date: new Date(Date.now() - 1000*60*60*6).toISOString(), duration: 420, outcome: "Callback", dealScore: 61, heat: "warm", dealValue: 3600, notes: "Client asked about Dual Eligible plans. Needs to gather Medicaid info before we can proceed. Callback Tuesday.", hasRecording: true },
  { id: "AR-005", agentId: "AG-001", agentName: "Daniel Reyes", client: clients[4], direction: "outbound", date: new Date(Date.now() - 1000*60*60*9).toISOString(), duration: 780, outcome: "Enrolled", dealScore: 91, heat: "hot", dealValue: 6200, notes: "Enrolled in Aetna MA D-SNP. Client qualifies for Extra Help. OTC card and transportation benefits highlighted.", hasRecording: true },
  { id: "AR-006", agentId: "AG-005", agentName: "Robert Kim", client: clients[5], direction: "outbound", date: new Date(Date.now() - 1000*60*60*26).toISOString(), duration: 0, outcome: "No Answer", dealScore: 15, heat: "cold", dealValue: 0, notes: "No answer. Voicemail drop: General Follow-up template. Will retry tomorrow.", hasRecording: false },
  { id: "AR-007", agentId: "AG-002", agentName: "Sarah Chen", client: clients[6], direction: "inbound", date: new Date(Date.now() - 1000*60*60*28).toISOString(), duration: 310, outcome: "Interested", dealScore: 68, heat: "warm", dealValue: 3800, notes: "Client comparing BCBS vs UHC MA plans. Wants dental coverage. Sent plan comparison via email.", hasRecording: true },
  { id: "AR-008", agentId: "AG-006", agentName: "Jessica Martinez", client: clients[7], direction: "outbound", date: new Date(Date.now() - 1000*60*60*30).toISOString(), duration: 85, outcome: "DNC", dealScore: 5, heat: "cold", dealValue: 0, notes: "Client requested to be added to Do Not Call list. Compliance flag updated. Removed from dialer.", hasRecording: true },
  { id: "AR-009", agentId: "AG-001", agentName: "Daniel Reyes", client: clients[8], direction: "inbound", date: new Date(Date.now() - 1000*60*60*48).toISOString(), duration: 450, outcome: "Enrolled", dealScore: 84, heat: "hot", dealValue: 5800, notes: "Enrolled in WellCare Part D standalone. Client has Original Medicare + Medigap. Tier 1 formulary covers all 4 medications.", hasRecording: true },
  { id: "AR-010", agentId: "AG-004", agentName: "Emily Johnson", client: clients[9], direction: "outbound", date: new Date(Date.now() - 1000*60*60*50).toISOString(), duration: 260, outcome: "Callback", dealScore: 55, heat: "warm", dealValue: 3100, notes: "Client needs to verify income for LIS application. Sent checklist. Callback Wednesday with documents.", hasRecording: true },
  { id: "AR-011", agentId: "AG-003", agentName: "Michael Torres", client: clients[0], direction: "outbound", date: new Date(Date.now() - 1000*60*60*72).toISOString(), duration: 380, outcome: "Not Interested", dealScore: 32, heat: "cold", dealValue: 0, notes: "Client on employer group plan, not eligible for MA until retirement. Added to future contact list for Q4.", hasRecording: true },
  { id: "AR-012", agentId: "AG-002", agentName: "Sarah Chen", client: clients[2], direction: "inbound", date: new Date(Date.now() - 1000*60*60*74).toISOString(), duration: 620, outcome: "Enrolled", dealScore: 89, heat: "hot", dealValue: 6800, notes: "Enrolled in Cigna MA plan with SilverSneakers. Spouse also enrolled. Combined premium $0. OTC $120/quarter.", hasRecording: true },
];

function dispatchScreenPop(agentId: string, message: string) {
  window.dispatchEvent(new CustomEvent("supervisor-screen-pop", { detail: { agentId, message } }));
}

// ── Component ───────────────────────────────────────────────────

export default function SupervisorPage() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_supervisor_dashboard", category: "supervisor", entity: "Supervisor Console", severity: "warning" }); }, [user]);
  const [agentStates, setAgentStates] = useState<AgentState[]>(() =>
    agents.slice(0, 8).map((a, i) => {
      const score = [82, 65, 38, 71, 55, 28, 48, 90][i] ?? 50;
      return {
        agent: a,
        status: (["available", "on-call", "available", "on-call", "wrap-up", "available", "suspended", "on-call"][i] ?? "available") as AgentCallStatus,
        callsToday: [12, 8, 15, 6, 10, 14, 0, 9][i] ?? 5,
        avgHandleTime: [240, 310, 195, 420, 280, 165, 0, 350][i] ?? 250,
        dealScore: score,
        heat: heatFromScore(score),
        whisperQueue: [],
      };
    })
  );

  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [whisperText, setWhisperText] = useState("");
  const [promptText, setPromptText] = useState("");
  const [whisperLog, setWhisperLog] = useState<{ agentId: string; text: string; time: number }[]>([]);
  const [popLog, setPopLog] = useState<{ agentId: string; text: string; time: number }[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lineIdxRef = useRef<Record<string, number>>({});

  // Voice coaching state
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceVolume, setVoiceVolume] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const voiceTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [voiceLog, setVoiceLog] = useState<{ agentId: string; duration: number; time: number }[]>([]);

  // Intervention alert queue state
  const [alertThreshold, setAlertThreshold] = useState(30);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const belowSinceRef = useRef<Record<string, number>>({});
  const alertThresholdRef = useRef(alertThreshold);
  useEffect(() => { alertThresholdRef.current = alertThreshold; }, [alertThreshold]);

  // Archive state
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveAgent, setArchiveAgent] = useState<string>("all");
  const [archiveOutcome, setArchiveOutcome] = useState<string>("all");
  const [archiveHeat, setArchiveHeat] = useState<string>("all");
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  const filteredArchive = useMemo(() => {
    const q = archiveSearch.toLowerCase();
    return archivedCalls.filter((c) => {
      if (q && !c.client.name.toLowerCase().includes(q) && !c.agentName.toLowerCase().includes(q) && !c.notes.toLowerCase().includes(q)) return false;
      if (archiveAgent !== "all" && c.agentId !== archiveAgent) return false;
      if (archiveOutcome !== "all" && c.outcome !== archiveOutcome) return false;
      if (archiveHeat !== "all" && c.heat !== archiveHeat) return false;
      return true;
    });
  }, [archiveSearch, archiveAgent, archiveOutcome, archiveHeat]);

  const archiveStats = useMemo(() => {
    const total = filteredArchive.length;
    const enrolled = filteredArchive.filter(c => c.outcome === "Enrolled").length;
    const totalValue = filteredArchive.filter(c => c.outcome === "Enrolled").reduce((s, c) => s + c.dealValue, 0);
    const avgScore = total > 0 ? Math.round(filteredArchive.reduce((s, c) => s + c.dealScore, 0) / total) : 0;
    const withRec = filteredArchive.filter(c => c.hasRecording).length;
    return { total, enrolled, totalValue, avgScore, withRec };
  }, [filteredArchive]);

  // Initialize live calls for agents currently on-call
  useEffect(() => {
    const initial: LiveCall[] = agentStates
      .filter((s) => s.status === "on-call")
      .map((s, idx) => {
        const client = clients[idx % clients.length];
        const startedAt = Date.now() - (s.avgHandleTime * 1000 * 0.4);
        return {
          agentId: s.agent.id,
          client,
          direction: idx % 2 === 0 ? "inbound" : "outbound",
          startedAt,
          seconds: Math.floor((Date.now() - startedAt) / 1000),
          transcript: [],
          dealScore: s.dealScore,
          heat: s.heat,
        };
      });
    setLiveCalls(initial);
  }, []); // eslint-disable-line

  // Live tick: advance call timers + append transcript lines
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setLiveCalls((prev) =>
        prev.map((call) => {
          const newSeconds = call.seconds + 1;
          let newTranscript = call.transcript;
          const idx = lineIdxRef.current[call.agentId] ?? 0;
          // Add a new line every ~4 seconds
          if (newSeconds % 4 === 0 && idx < simLines.length) {
            const line = simLines[idx];
            newTranscript = [
              ...call.transcript,
              { id: `T-${call.agentId}-${idx}`, speaker: line.speaker, text: line.text, t: newSeconds, sentiment: analyzeSentiment(line.text, line.speaker) },
            ];
            lineIdxRef.current[call.agentId] = idx + 1;
          }
          // Drift deal score slightly
          const drift = (Math.random() - 0.45) * 2;
          const newScore = Math.max(5, Math.min(98, call.dealScore + drift));
          return {
            ...call,
            seconds: newSeconds,
            transcript: newTranscript,
            dealScore: newScore,
            heat: heatFromScore(newScore),
          };
        })
      );
      // Update agent deal scores from live calls
      setAgentStates((prev) =>
        prev.map((s) => {
          const call = liveCallsRef.current.find((c) => c.agentId === s.agent.id);
          if (!call) return s;
          return { ...s, dealScore: Math.round(call.dealScore), heat: call.heat };
        })
      );
      // Track calls dropping below the intervention threshold
      liveCallsRef.current.forEach((c) => {
        if (c.dealScore < alertThresholdRef.current) {
          if (!belowSinceRef.current[c.agentId]) {
            belowSinceRef.current[c.agentId] = Date.now();
            // New alert — clear any prior dismissal so it re-surfaces
            setDismissedAlerts((prev) => {
              if (!prev.has(c.agentId)) return prev;
              const next = new Set(prev);
              next.delete(c.agentId);
              return next;
            });
          }
        } else {
          delete belowSinceRef.current[c.agentId];
        }
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // Ref to access latest liveCalls inside interval
  const liveCallsRef = useRef(liveCalls);
  useEffect(() => { liveCallsRef.current = liveCalls; }, [liveCalls]);

  // ── Actions ───────────────────────────────────────────────────

  const toggleSuspend = (agentId: string) => {
    const agent = agentStates.find(s => s.agent.id === agentId);
    const willSuspend = agent?.status !== "suspended";
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: willSuspend ? "suspended_agent" : "reactivated_agent", category: "supervisor", entity: agent?.agent.name ?? agentId, entityId: agentId, severity: willSuspend ? "critical" : "warning" });
    setAgentStates((prev) =>
      prev.map((s) => {
        if (s.agent.id !== agentId) return s;
        if (s.status === "suspended") {
          return { ...s, status: "available" };
        }
        // Suspend: end their live call too
        setLiveCalls((calls) => calls.filter((c) => c.agentId !== agentId));
        delete belowSinceRef.current[agentId];
        return { ...s, status: "suspended" };
      })
    );
  };



  const sendWhisper = () => {
    if (!selectedAgentId || !whisperText.trim()) return;
    const entry = { agentId: selectedAgentId, text: whisperText.trim(), time: Date.now() };
    setWhisperLog((prev) => [...prev, entry]);
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "sent_whisper", category: "supervisor", entity: selectedAgentId, severity: "warning", details: whisperText.trim().slice(0, 100) });
    setAgentStates((prev) =>
      prev.map((s) =>
        s.agent.id === selectedAgentId
          ? { ...s, whisperQueue: [...s.whisperQueue, whisperText.trim()] }
          : s
      )
    );
    // Clear whisper queue after 5s (simulated agent heard it)
    setTimeout(() => {
      setAgentStates((prev) =>
        prev.map((s) =>
          s.agent.id === selectedAgentId
            ? { ...s, whisperQueue: s.whisperQueue.slice(1) }
            : s
        )
      );
    }, 5000);
    setWhisperText("");
  };

  const sendPrompt = () => {
    if (!selectedAgentId || !promptText.trim()) return;
    dispatchScreenPop(selectedAgentId, promptText.trim());
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "injected_screen_pop", category: "supervisor", entity: selectedAgentId, severity: "critical", details: promptText.trim().slice(0, 100) });
    setPopLog((prev) => [...prev, { agentId: selectedAgentId, text: promptText.trim(), time: Date.now() }]);
    setPromptText("");
  };

  // Voice coaching controls
  const toggleVoice = () => {
    if (voiceActive) {
      // Stop session
      if (voiceTickRef.current) clearInterval(voiceTickRef.current);
      if (voiceDuration > 0 && selectedAgentId) {
        setVoiceLog((prev) => [...prev, { agentId: selectedAgentId, duration: voiceDuration, time: Date.now() }]);
      }
      setVoiceActive(false);
      setVoiceVolume(0);
      setVoiceDuration(0);
    } else {
      // Start session
      setVoiceActive(true);
      setVoiceDuration(0);
      voiceTickRef.current = setInterval(() => {
        setVoiceDuration((d) => d + 1);
        setVoiceVolume(() => {
          if (voiceMuted) return 0;
          // Simulated mic volume: random fluctuation 20-95
          return 20 + Math.random() * 75;
        });
      }, 1000);
    }
  };

  const toggleVoiceMute = () => {
    setVoiceMuted((m) => !m);
    if (!voiceMuted) setVoiceVolume(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (voiceTickRef.current) clearInterval(voiceTickRef.current); };
  }, []);

  const simulateInbound = (agentId: string) => {
    const agentState = agentStates.find((s) => s.agent.id === agentId);
    if (!agentState || agentState.status !== "available") return;
    const client = clients[Math.floor(Math.random() * clients.length)];
    setAgentStates((prev) =>
      prev.map((s) => (s.agent.id === agentId ? { ...s, status: "on-call" } : s))
    );
    setLiveCalls((prev) => [
      ...prev,
      {
        agentId,
        client,
        direction: "inbound",
        startedAt: Date.now(),
        seconds: 0,
        transcript: [],
        dealScore: 50,
        heat: "warm",
      },
    ]);
    lineIdxRef.current[agentId] = 0;
  };

  const endLiveCall = (agentId: string) => {
    setLiveCalls((prev) => prev.filter((c) => c.agentId !== agentId));
    delete belowSinceRef.current[agentId];
    setAgentStates((prev) =>
      prev.map((s) =>
        s.agent.id === agentId
          ? { ...s, status: "wrap-up", callsToday: s.callsToday + 1 }
          : s
      )
    );
    // Auto-recover from wrap-up after 8s
    setTimeout(() => {
      setAgentStates((prev) =>
        prev.map((s) => (s.agent.id === agentId && s.status === "wrap-up" ? { ...s, status: "available" } : s))
      );
    }, 8000);
  };

  // ── Derived ───────────────────────────────────────────────────

  const selectedAgent = agentStates.find((s) => s.agent.id === selectedAgentId);
  const selectedCall = liveCalls.find((c) => c.agentId === selectedAgentId);

  const stats = useMemo(() => {
    const online = agentStates.filter((s) => s.status !== "suspended").length;
    const onCall = agentStates.filter((s) => s.status === "on-call").length;
    const available = agentStates.filter((s) => s.status === "available").length;
    const suspended = agentStates.filter((s) => s.status === "suspended").length;
    const avgScore = Math.round(agentStates.reduce((sum, s) => sum + s.dealScore, 0) / agentStates.length);
    return { online, onCall, available, suspended, avgScore };
  }, [agentStates]);

  // Auto-surfaced alerts: live calls below threshold, not dismissed
  const activeAlerts = useMemo(() => {
    return liveCalls
      .filter((c) => c.dealScore < alertThreshold && !dismissedAlerts.has(c.agentId))
      .map((c) => {
        const since = belowSinceRef.current[c.agentId];
        return {
          agentId: c.agentId,
          clientName: c.client.name,
          dealScore: Math.round(c.dealScore),
          seconds: since ? Math.floor((Date.now() - since) / 1000) : 0,
        };
      })
      .sort((a, b) => a.dealScore - b.dealScore);
  }, [liveCalls, alertThreshold, dismissedAlerts]);

  return (
    <div className="space-y-6">
      <PageHeader title="Supervisor Dashboard" description="Live call floor, whisper coaching, prompt injection, and call recording archive">
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-success">Live</span>
        </Badge>
      </PageHeader>

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="live" className="gap-1.5">
            <Headphones className="h-4 w-4" /> Live Floor
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-1.5">
            <Archive className="h-4 w-4" /> Call Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
      {/* Intervention alert queue */}
      <Card className={cn(activeAlerts.length > 0 && "border-destructive/40 ring-1 ring-destructive/20")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BellRing className={cn("h-4 w-4", activeAlerts.length > 0 ? "text-destructive animate-pulse" : "text-muted-foreground")} />
              <CardTitle className="font-display text-base">Intervention Queue</CardTitle>
              {activeAlerts.length > 0 && (
                <Badge className="bg-destructive text-destructive-foreground gap-1">
                  {activeAlerts.length} alert{activeAlerts.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            {/* Threshold control */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Threshold
              </span>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(Number(e.target.value))}
                className="w-24 accent-destructive"
              />
              <span className="text-xs font-mono font-semibold text-destructive w-9 text-right">{alertThreshold}%</span>
            </div>
          </div>
          <CardDescription className="text-xs">
            Calls dropping below {alertThreshold}% deal score are auto-flagged for supervisor intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeAlerts.length === 0 ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> All live calls are above threshold — no intervention needed
            </div>
          ) : (
            <div className="space-y-2">
              {activeAlerts.map((a) => {
                const agentState = agentStates.find((s) => s.agent.id === a.agentId);
                return (
                  <div key={a.agentId} className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive shrink-0">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{agentState?.agent.name ?? a.agentId}</p>
                        <span className="text-xs text-muted-foreground truncate">· {a.clientName}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                        <span className="flex items-center gap-1 text-destructive font-medium">
                          <TrendingDown className="h-3 w-3" /> {a.dealScore}% deal score
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> Below for {fmt(a.seconds)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setSelectedAgentId(a.agentId)}
                      >
                        <Eye className="h-3 w-3" /> Intervene
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setDismissedAlerts((prev) => new Set(prev).add(a.agentId))}
                      >
                        <X className="h-3 w-3" /> Dismiss
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Users2, label: "Agents Online", value: stats.online, color: "text-accent" },
          { icon: PhoneCall, label: "Active Calls", value: stats.onCall, color: "text-success" },
          { icon: CheckCircle2, label: "Available", value: stats.available, color: "text-accent" },
          { icon: Ban, label: "Suspended", value: stats.suspended, color: "text-destructive" },
          { icon: Activity, label: "Avg Deal Score", value: `${stats.avgScore}%`, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
              <div>
                <p className="text-2xl font-display font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Agent grid */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-base flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-accent" /> Agent Floor
                </CardTitle>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Hot</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Warm</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Cold</span>
                </div>
              </div>
              <CardDescription className="text-xs">Click an agent to view live call, whisper, or inject prompts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agentStates.map((s) => {
                  const heat = heatConfig[s.heat];
                  const call = liveCalls.find((c) => c.agentId === s.agent.id);
                  const isSelected = selectedAgentId === s.agent.id;
                  const HeatIcon = heat.icon;
                  return (
                    <div
                      key={s.agent.id}
                      onClick={() => setSelectedAgentId(s.agent.id)}
                      className={cn(
                        "relative rounded-xl border p-4 cursor-pointer transition-all",
                        isSelected ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/40 hover:bg-muted/30",
                        s.status === "suspended" && "opacity-60"
                      )}
                    >
                      {/* Heat indicator stripe */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", heat.bar)} />

                      <div className="flex items-start gap-3 pl-1">
                        <div className="relative shrink-0">
                          <Avatar className="h-11 w-11 border-2 border-border">
                            <AvatarFallback className="bg-navy-100 text-navy-700 text-sm font-display font-semibold">
                              {s.agent.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={cn("absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background", statusConfig[s.status].dot)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate">{s.agent.name}</p>
                            <span className={cn("flex items-center gap-1 text-xs font-medium", heat.text)}>
                              <HeatIcon className="h-3 w-3" />
                              {s.dealScore}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn("flex items-center gap-1 text-[11px] font-medium", statusConfig[s.status].text)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig[s.status].dot)} />
                              {statusConfig[s.status].label}
                            </span>
                            <span className="text-[11px] text-muted-foreground">· {s.callsToday} calls today</span>
                          </div>

                          {/* Deal score bar */}
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700", heat.bar)}
                              style={{ width: `${s.dealScore}%` }}
                            />
                          </div>

                          {/* Live call mini info */}
                          {call && (
                            <div className="mt-2 flex items-center gap-2 text-[11px]">
                              <Badge variant="outline" className="h-4 px-1.5 text-[9px] gap-1 font-mono">
                                {call.direction === "inbound" ? <PhoneIncoming className="h-2.5 w-2.5" /> : <PhoneOutgoing className="h-2.5 w-2.5" />}
                                {fmt(call.seconds)}
                              </Badge>
                              <span className="text-muted-foreground truncate">{call.client.name}</span>
                            </div>
                          )}

                          {/* Whisper active indicator */}
                          {s.whisperQueue.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-accent animate-pulse">
                              <Radio className="h-3 w-3" /> Whispering…
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick actions on selected */}
                      {isSelected && (
                        <div className="mt-3 flex items-center gap-1.5 pt-3 border-t border-border">
                          {s.status === "available" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); simulateInbound(s.agent.id); }}>
                              <PhoneIncoming className="h-3 w-3" /> Simulate Call
                            </Button>
                          )}
                          {call && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={(e) => { e.stopPropagation(); endLiveCall(s.agent.id); }}>
                              <X className="h-3 w-3" /> End Call
                            </Button>
                          )}
                          {s.status !== "suspended" ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-destructive" onClick={(e) => { e.stopPropagation(); toggleSuspend(s.agent.id); }}>
                              <Ban className="h-3 w-3" /> Suspend
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-success" onClick={(e) => { e.stopPropagation(); toggleSuspend(s.agent.id); }}>
                              <CheckCircle2 className="h-3 w-3" /> Reactivate
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Selected agent detail */}
        <div className="lg:col-span-5 space-y-4">
          {selectedAgent ? (
            <>
              {/* Agent detail header */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-navy-700 text-white font-display font-semibold">
                        {selectedAgent.agent.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="font-display text-base">{selectedAgent.agent.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("flex items-center gap-1 text-xs font-medium", statusConfig[selectedAgent.status].text)}>
                          <span className={cn("h-2 w-2 rounded-full", statusConfig[selectedAgent.status].dot)} />
                          {statusConfig[selectedAgent.status].label}
                        </span>
                        <span className="text-xs text-muted-foreground">· {selectedAgent.agent.role}</span>
                      </div>
                    </div>
                    <div className={cn("flex flex-col items-end gap-1 px-3 py-1.5 rounded-lg", heatConfig[selectedAgent.heat].bg)}>
                      <span className={cn("text-lg font-display font-bold leading-none", heatConfig[selectedAgent.heat].text)}>
                        {selectedAgent.dealScore}%
                      </span>
                      <span className={cn("text-[10px] font-medium", heatConfig[selectedAgent.heat].text)}>
                        {heatConfig[selectedAgent.heat].label} deal
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-sm font-display font-bold">{selectedAgent.callsToday}</p>
                      <p className="text-[10px] text-muted-foreground">Calls Today</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-sm font-display font-bold">{fmt(selectedAgent.avgHandleTime)}</p>
                      <p className="text-[10px] text-muted-foreground">Avg Handle</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-sm font-display font-bold">{selectedAgent.agent.bookSize}</p>
                      <p className="text-[10px] text-muted-foreground">Book Size</p>
                    </div>
                  </div>

                  {/* Deal prediction breakdown */}
                  <div className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-accent" /> Deal Prediction Analysis
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { label: "Sentiment", val: Math.min(100, selectedAgent.dealScore + 8) },
                        { label: "Intent Signals", val: Math.max(10, selectedAgent.dealScore - 5) },
                        { label: "Objection Risk", val: Math.max(5, 100 - selectedAgent.dealScore - 10) },
                      ].map((m) => (
                        <div key={m.label} className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground w-24 shrink-0">{m.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", m.label === "Objection Risk" ? "bg-destructive" : heatConfig[selectedAgent.heat].bar)}
                              style={{ width: `${m.val}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono w-8 text-right">{Math.round(m.val)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Live call transcript */}
              {selectedCall ? (
                <Card className="ring-1 ring-accent/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-base flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-accent" /> Live Call
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs gap-1">
                          {selectedCall.direction === "inbound" ? <PhoneIncoming className="h-3 w-3" /> : <PhoneOutgoing className="h-3 w-3" />}
                          {fmt(selectedCall.seconds)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{selectedCall.client.name}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Sentiment timeline strip */}
                    {selectedCall.transcript.length > 0 && (
                      <div className="mb-3 rounded-lg border border-border p-2.5 bg-muted/20">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Sentiment Timeline
                          </p>
                          <div className="flex items-center gap-2">
                            {(["excited", "positive", "neutral", "concerned", "negative"] as Sentiment[]).map((s) => (
                              <span key={s} className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                                <span className={cn("h-1.5 w-1.5 rounded-full", sentimentConfig[s].dot)} />
                                {sentimentConfig[s].label}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* Timeline bar */}
                        <div className="relative flex items-end gap-0.5 h-8">
                          {selectedCall.transcript.map((line) => {
                            const sc = sentimentConfig[line.sentiment];
                            return (
                              <div
                                key={line.id}
                                className="group relative flex-1 min-w-[6px] rounded-sm transition-all hover:scale-y-110 cursor-default"
                                style={{ height: `${30 + (line.text.length / 3)}%`, maxHeight: "100%" }}
                              >
                                <div className={cn("absolute inset-0 rounded-sm", sc.bar)} />
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-max max-w-[200px]">
                                  <div className="rounded-md bg-popover border border-border px-2 py-1.5 shadow-md">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      <span>{sc.emoji}</span>
                                      <span className={cn("text-[10px] font-semibold", sc.color)}>{sc.label}</span>
                                      <span className="text-[9px] text-muted-foreground">· {line.speaker}</span>
                                    </div>
                                    <p className="text-[10px] text-foreground leading-tight line-clamp-2">{line.text}</p>
                                    <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">{fmt(line.t)}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Current sentiment summary */}
                        {(() => {
                          const recent = selectedCall.transcript.slice(-5);
                          const counts: Record<Sentiment, number> = { excited: 0, positive: 0, neutral: 0, concerned: 0, negative: 0 };
                          recent.forEach((l) => counts[l.sentiment]++);
                          const dominant = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as Sentiment;
                          const dc = sentimentConfig[dominant];
                          return (
                            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border">
                              <span className="text-[10px] text-muted-foreground">Recent mood</span>
                              <span className={cn("flex items-center gap-1 text-[11px] font-medium", dc.color)}>
                                <span>{dc.emoji}</span> {dc.label}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    <ScrollArea className="h-[200px] pr-2">
                      {selectedCall.transcript.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 animate-pulse" /> Listening…
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {selectedCall.transcript.map((line) => {
                            const sc = sentimentConfig[line.sentiment];
                            return (
                              <div key={line.id} className={cn("flex gap-2", line.speaker === "agent" ? "justify-end" : "justify-start")}>
                                {line.speaker === "client" && (
                                  <div className="h-6 w-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-semibold shrink-0">
                                    {selectedCall.client.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                  </div>
                                )}
                                <div className={cn(
                                  "max-w-[78%] rounded-xl px-3 py-1.5",
                                  line.speaker === "agent" ? "bg-navy-700 text-white" : "bg-muted text-foreground"
                                )}>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[10px] leading-none">{sc.emoji}</span>
                                    <span className={cn("text-[9px] font-medium leading-none", line.speaker === "agent" ? "text-white/60" : sc.color)}>
                                      {sc.label}
                                    </span>
                                  </div>
                                  <p className="text-xs leading-snug">{line.text}</p>
                                  <p className={cn("text-[9px] mt-0.5", line.speaker === "agent" ? "text-white/50" : "text-muted-foreground")}>
                                    {fmt(line.t)}
                                  </p>
                                </div>
                                {line.speaker === "agent" && (
                                  <div className="h-6 w-6 rounded-full bg-navy-700 text-white flex items-center justify-center text-[10px] font-semibold shrink-0">
                                    {selectedAgent.agent.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                      <PhoneCall className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {selectedAgent.status === "suspended" ? "Agent is suspended" : "No active call"}
                    </p>
                    {selectedAgent.status === "available" && (
                      <Button size="sm" variant="outline" className="mt-3" onClick={() => simulateInbound(selectedAgent.agent.id)}>
                        <PhoneIncoming className="mr-1.5 h-4 w-4" /> Simulate Inbound
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Whisper bar */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Radio className="h-4 w-4 text-accent" /> Whisper Mode
                  </CardTitle>
                  <CardDescription className="text-xs">Send a message only the agent hears — the caller cannot hear this</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={whisperText}
                      onChange={(e) => setWhisperText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendWhisper()}
                      placeholder="Coach the agent…"
                      className="h-9 text-sm"
                      disabled={!selectedCall}
                    />
                    <Button size="sm" className="shrink-0" onClick={sendWhisper} disabled={!whisperText.trim() || !selectedCall}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {!selectedCall && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Whisper is only available during an active call
                    </p>
                  )}
                  {whisperLog.filter((w) => w.agentId === selectedAgentId).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Recent Whispers</p>
                      {whisperLog.filter((w) => w.agentId === selectedAgentId).slice(-3).reverse().map((w, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-accent/5 px-2.5 py-1.5">
                          <Radio className="h-3 w-3 text-accent mt-0.5 shrink-0" />
                          <p className="text-xs text-foreground">{w.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Voice coaching channel */}
              <Card className={cn(voiceActive && "ring-1 ring-success/30")}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-display text-base flex items-center gap-2">
                        <Mic className="h-4 w-4 text-accent" /> Voice Coaching
                      </CardTitle>
                      <CardDescription className="text-xs">Live verbal coaching channel — the agent hears you, the caller does not</CardDescription>
                    </div>
                    {voiceActive && (
                      <Badge variant="outline" className="gap-1.5 border-success/40 text-success">
                        <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                        Live
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status / timer display */}
                  <div className={cn(
                    "flex items-center justify-between rounded-xl p-3 transition-colors",
                    voiceActive ? "bg-success/10 border border-success/20" : "bg-muted/40 border border-border"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                        voiceActive ? "bg-success/20" : "bg-muted"
                      )}>
                        <Mic className={cn("h-5 w-5 transition-colors", voiceActive ? "text-success" : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className="text-sm font-display font-semibold">
                          {voiceActive ? "Coaching Live" : "Channel Idle"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {voiceActive
                            ? `Connected to ${selectedAgent?.agent.name ?? "agent"}`
                            : "Press talk to start a voice session"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-display font-bold font-mono">{fmt(voiceDuration)}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Session</p>
                    </div>
                  </div>

                  {/* Volume meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Volume2 className="h-3 w-3" /> Mic Level
                      </span>
                      {voiceActive && (
                        <span className={cn("text-[10px] font-medium", voiceMuted ? "text-destructive" : "text-success")}>
                          {voiceMuted ? "MUTED" : "ACTIVE"}
                        </span>
                      )}
                    </div>
                    {/* Volume bars */}
                    <div className="flex items-end gap-0.5 h-10">
                      {Array.from({ length: 24 }).map((_, i) => {
                        const threshold = (i + 1) * (100 / 24);
                        const active = voiceActive && !voiceMuted && voiceVolume >= threshold;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 rounded-sm transition-all duration-150",
                              active
                                ? i < 16 ? "bg-success" : i < 20 ? "bg-warning" : "bg-destructive"
                                : "bg-muted/60"
                            )}
                            style={{ height: `${20 + (i / 24) * 80}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className={cn("flex-1 gap-1.5", voiceActive ? "bg-destructive hover:bg-destructive/90" : "")}
                      onClick={toggleVoice}
                      disabled={!selectedAgent}
                    >
                      {voiceActive ? (
                        <><Square className="h-4 w-4" /> Stop Coaching</>
                      ) : (
                        <><Mic className="h-4 w-4" /> Start Talking</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={toggleVoiceMute}
                      disabled={!voiceActive}
                    >
                      {voiceMuted ? <><MicOff className="h-4 w-4 text-destructive" /> Unmute</> : <><MicOff className="h-4 w-4" /> Mute</>}
                    </Button>
                  </div>

                  {!selectedAgent && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Select an agent to begin voice coaching
                    </p>
                  )}

                  {/* Coaching session log */}
                  {voiceLog.filter((v) => v.agentId === selectedAgentId).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Coaching Sessions</p>
                      {voiceLog.filter((v) => v.agentId === selectedAgentId).slice(-4).reverse().map((v, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-accent/5 px-2.5 py-1.5">
                          <Mic className="h-3 w-3 text-accent shrink-0" />
                          <span className="text-xs text-foreground flex-1">Voice coaching session</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{fmt(v.duration)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Prompt injection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-accent" /> Prompt Injection
                  </CardTitle>
                  <CardDescription className="text-xs">Send a screen popup that appears on the agent's dialer instantly</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Type a prompt to pop on the agent's screen…"
                    className="text-sm min-h-[60px]"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {["Mention the $0 premium plan", "Ask about current medications", "Offer SilverSneakers benefit", "Verify zip code for network"].map((q) => (
                      <button
                        key={q}
                        onClick={() => setPromptText(q)}
                        className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" className="w-full" onClick={sendPrompt} disabled={!promptText.trim()}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Send Screen Pop
                  </Button>
                  {popLog.filter((p) => p.agentId === selectedAgentId).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sent Prompts</p>
                      {popLog.filter((p) => p.agentId === selectedAgentId).slice(-3).reverse().map((p, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5">
                          <Monitor className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-foreground">{p.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50 mb-4">
                  <Headphones className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Select an agent to monitor</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  View live transcripts, whisper coaching tips, inject screen prompts, and manage agent availability.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
        </TabsContent>

        {/* ── Archive Tab ─────────────────────────────────────── */}
        <TabsContent value="archive" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
          {/* Archive stat strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: Archive, label: "Total Calls", value: archiveStats.total, color: "text-accent" },
              { icon: CheckCircle2, label: "Enrolled", value: archiveStats.enrolled, color: "text-success" },
              { icon: DollarSign, label: "Deal Value", value: `$${(archiveStats.totalValue / 1000).toFixed(1)}k`, color: "text-success" },
              { icon: Activity, label: "Avg Deal Score", value: `${archiveStats.avgScore}%`, color: "text-warning" },
              { icon: PlayCircle, label: "With Recording", value: archiveStats.withRec, color: "text-accent" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-3 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                    <s.icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold leading-none">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={archiveSearch}
                    onChange={(e) => setArchiveSearch(e.target.value)}
                    placeholder="Search by client, agent, or notes…"
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={archiveAgent} onValueChange={setArchiveAgent}>
                  <SelectTrigger className="w-full md:w-[180px] h-9">
                    <SelectValue placeholder="Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.slice(0, 8).map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={archiveOutcome} onValueChange={setArchiveOutcome}>
                  <SelectTrigger className="w-full md:w-[180px] h-9">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Outcomes</SelectItem>
                    {(Object.keys(outcomeConfig) as DealOutcome[]).map((o) => (
                      <SelectItem key={o} value={o}>{outcomeConfig[o].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={archiveHeat} onValueChange={setArchiveHeat}>
                  <SelectTrigger className="w-full md:w-[140px] h-9">
                    <SelectValue placeholder="Deal Heat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Heat</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Call list */}
          <div className="space-y-2">
            {filteredArchive.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Archive className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No calls match your filters</p>
                </CardContent>
              </Card>
            ) : (
              filteredArchive.map((call) => {
                const heat = heatConfig[call.heat];
                const outcome = outcomeConfig[call.outcome];
                const OutcomeIcon = outcome.icon;
                const agent = agents.find(a => a.id === call.agentId);
                const isExpanded = expandedCall === call.id;
                const callDate = new Date(call.date);
                return (
                  <Card key={call.id} className={cn("overflow-hidden transition-all", isExpanded && "ring-1 ring-accent/30")}>
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedCall(isExpanded ? null : call.id)}
                    >
                      {/* Heat stripe */}
                      <div className={cn("w-1 self-stretch rounded-full shrink-0", heat.bar)} />

                      {/* Direction icon */}
                      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", call.direction === "inbound" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground")}>
                        {call.direction === "inbound" ? <PhoneIncoming className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">{call.client.name}</p>
                          <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] gap-1 font-medium shrink-0", outcome.color, outcome.bg, "border-transparent")}>
                            <OutcomeIcon className="h-2.5 w-2.5" />
                            {outcome.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="truncate">{call.agentName}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {callDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} {callDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="h-3 w-3" />{fmt(call.duration)}
                          </span>
                        </div>
                      </div>

                      {/* Deal score + value */}
                      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-sm font-display font-bold", heat.text)}>{call.dealScore}%</span>
                          <heat.icon className={cn("h-3.5 w-3.5", heat.text)} />
                        </div>
                        {call.dealValue > 0 ? (
                          <span className="flex items-center gap-0.5 text-xs text-success font-medium">
                            <DollarSign className="h-3 w-3" />{(call.dealValue / 1000).toFixed(1)}k
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      {/* Recording badge */}
                      {call.hasRecording && (
                        <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                          <PlayCircle className="h-3 w-3 text-accent" /> REC
                        </Badge>
                      )}

                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isExpanded && "rotate-90")} />
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                        {/* Deal outcome annotation banner */}
                        <div className={cn("flex items-center gap-3 rounded-lg p-3", outcome.bg)}>
                          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full bg-background", outcome.color)}>
                            <OutcomeIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className={cn("text-sm font-semibold", outcome.color)}>{outcome.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Deal score {call.dealScore}% · {heat.label} lead · Est. value {call.dealValue > 0 ? `$${call.dealValue.toLocaleString()}` : "N/A"}
                            </p>
                          </div>
                          {/* Deal score gauge */}
                          <div className="hidden md:flex flex-col items-center gap-1">
                            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                              <div className={cn("h-full rounded-full", heat.bar)} style={{ width: `${call.dealScore}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">Deal Probability</span>
                          </div>
                        </div>

                        {/* Agent + client info grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Agent</p>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-navy-100 text-navy-700 text-[10px] font-semibold">
                                  {call.agentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium truncate">{call.agentName}</span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Plan Type</p>
                            <p className="text-xs font-medium truncate">{call.client.planType}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Carrier</p>
                            <p className="text-xs font-medium truncate">{call.client.carrier}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-2.5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Direction</p>
                            <p className="text-xs font-medium capitalize flex items-center gap-1">
                              {call.direction === "inbound" ? <ArrowDownRight className="h-3 w-3 text-accent" /> : <ArrowUpRight className="h-3 w-3 text-muted-foreground" />}
                              {call.direction}
                            </p>
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Supervisor Notes</p>
                          <div className="rounded-lg border border-border p-3 text-sm text-foreground leading-relaxed">
                            {call.notes}
                          </div>
                        </div>

                        {/* Recording player */}
                        {call.hasRecording ? (
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Call Recording</p>
                            <CallRecordingPlayer
                              callId={call.id}
                              duration={call.duration}
                              callerName={call.client.name}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                            <X className="h-4 w-4" /> No recording available for this call
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
