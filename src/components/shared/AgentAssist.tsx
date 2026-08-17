import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import {
  Sparkles, X, Send, Bot, GripVertical, Minimize2,
  BookOpen, ChevronRight, Search, Mic, Loader2, MapPin,
  ClipboardCopy, Check, Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";
import {
  knowledgeCategories,
  generateAssistResponse,
  getKnowledgeCategories,
  searchKnowledge,
  responseStyleLabels,
  responseStyleDescriptions,
  type AgentAssistMessage,
  type KnowledgeEntry,
  type ResponseStyle,
} from "@/lib/medicareKnowledge";
import { cn } from "@/lib/utils";

// Route → context-aware prompt mapping
interface RouteContext {
  label: string;
  prompts: string[];
  searchTerms: string[];
}

const ROUTE_CONTEXT: Record<string, RouteContext> = {
  "/": {
    label: "Dashboard",
    prompts: [
      "What are the 2025 Medicare Advantage commission rates?",
      "Explain Medicaid dual-eligible rules",
      "What is the Low Income Subsidy income limit?",
    ],
    searchTerms: ["commission", "medicaid", "lis", "election period"],
  },
  "/clients": {
    label: "Clients CRM",
    prompts: [
      "What questions should I ask during needs analysis?",
      "What is the Scope of Appointment requirement?",
      "How do I verify a drug formulary before enrolling?",
    ],
    searchTerms: ["needs analysis", "fact finding", "soa", "scope of appointment", "formulary"],
  },
  "/calendar": {
    label: "Calendar",
    prompts: [
      "When is the Annual Enrollment Period?",
      "What is the MA Open Enrollment Period?",
      "What are the Special Election Period triggers?",
    ],
    searchTerms: ["aep", "oep", "election period", "sep", "annual enrollment"],
  },
  "/policies": {
    label: "Policies & Commissions",
    prompts: [
      "How do Medicare Advantage commissions work?",
      "What are the chargeback and clawback rules?",
      "What are the 2025 FMV commission rates?",
    ],
    searchTerms: ["commission", "chargeback", "clawback", "fmv", "advance", "renewal"],
  },
  "/agents": {
    label: "Agents",
    prompts: [
      "How do Medicare Advantage commissions work?",
      "What are the carrier appointment requirements?",
      "What is the advance vs as-earned commission?",
    ],
    searchTerms: ["commission", "appointment", "carrier", "advance", "comp"],
  },
  "/admin": {
    label: "Admin",
    prompts: [
      "What are the SOA compliance requirements?",
      "How do Medicare commissions work?",
      "What are the CMS documentation retention rules?",
    ],
    searchTerms: ["soa", "compliance", "commission", "cms", "retention", "audit"],
  },
  "/retention": {
    label: "Retention",
    prompts: [
      "What questions should I ask during needs analysis?",
      "What is the MA Open Enrollment Period?",
      "How do I verify a provider network?",
    ],
    searchTerms: ["needs analysis", "oep", "provider network", "retention", "disenroll"],
  },
  "/compliance": {
    label: "Compliance",
    prompts: [
      "What is the Scope of Appointment requirement?",
      "What documents are required for enrollment?",
      "What are the CMS retention rules for SOA?",
    ],
    searchTerms: ["soa", "compliance", "scope of appointment", "cms", "document", "retention", "audit"],
  },
  "/dialer": {
    label: "Dialer",
    prompts: [
      "What questions should I ask during needs analysis?",
      "What is the Scope of Appointment requirement?",
      "What are the essential fact-finding questions for MA enrollment?",
    ],
    searchTerms: ["needs analysis", "fact finding", "soa", "scope of appointment", "enrollment"],
  },
  "/knowledge-base": {
    label: "Knowledge Base",
    prompts: [
      "What are the 2025 Medicare Advantage commission rates?",
      "Explain Medicaid dual-eligible rules",
      "What is the Low Income Subsidy income limit?",
    ],
    searchTerms: ["commission", "medicaid", "lis", "election period"],
  },
  "/reconciliation": {
    label: "Reconciliation",
    prompts: [
      "What is the CMS FMV commission framework under 42 CFR 422.2274?",
      "How do I dispute a carrier short-pay or chargeback?",
      "How does the treasury feed map commissions to QuickBooks accounts?",
      "What variance classifications does the reconciliation engine detect?",
    ],
    searchTerms: ["commission", "reconciliation", "dispute", "variance", "chargeback", "fmv", "422.2274", "short pay", "split", "1099", "treasury", "quickbooks", "sage", "accounting", "journal entry"],
  },
  "/compliance-center": {
    label: "Compliance Center",
    prompts: [
      "What is the Scope of Appointment requirement?",
      "What is PEWC and when is it required?",
      "How long must call recordings be retained?",
    ],
    searchTerms: ["soa", "pewc", "call recording", "retention", "e-signature", "compliance", "tpmo", "42 cfr"],
  },
  "/pipeline": {
    label: "Sales Pipeline",
    prompts: [
      "What questions should I ask during needs analysis?",
      "What is the Scope of Appointment requirement?",
      "How do I move a deal through the pipeline stages?",
    ],
    searchTerms: ["needs analysis", "pipeline", "lead routing", "soa", "conversion"],
  },
  "/quoting": {
    label: "Quoting Engine",
    prompts: [
      "How do I compare MA plans side by side?",
      "What is MOOP and why does it matter?",
      "How do I check if a drug is on the formulary?",
    ],
    searchTerms: ["plan comparison", "formulary", "moop", "premium", "star rating", "provider network", "quoting"],
  },
  "/documents": {
    label: "Documents",
    prompts: [
      "What documents are required for enrollment?",
      "What is the SOA and how is it stored?",
      "What are the CMS document retention requirements?",
    ],
    searchTerms: ["document", "enrollment form", "soa", "eob", "retention", "hipaa", "version history"],
  },
  "/workflows": {
    label: "Workflow Automation",
    prompts: [
      "How do automated workflows create tasks?",
      "What triggers are available?",
      "How do I set up a renewal reminder workflow?",
    ],
    searchTerms: ["workflow", "automation", "trigger", "task", "reminder", "aep", "lapsing"],
  },
  "/reporting": {
    label: "Reporting",
    prompts: [
      "How do I generate an agent production report?",
      "What is the renewal forecast based on?",
      "How are chargebacks tracked?",
    ],
    searchTerms: ["reporting", "production", "renewal forecast", "chargeback", "hierarchy", "override"],
  },
  "/client-portal": {
    label: "Client Portal",
    prompts: [
      "How does the client portal work?",
      "Is the client portal HIPAA compliant?",
      "What can clients do in the self-service portal?",
    ],
    searchTerms: ["client portal", "self-service", "hipaa", "messaging", "documents", "appointments"],
  },
};

const DEFAULT_CONTEXT: RouteContext = {
  label: "Medicare",
  prompts: [
    "What are the 2025 Medicare Advantage commission rates?",
    "Explain Medicaid dual-eligible rules",
    "What is the Low Income Subsidy income limit?",
    "What's the difference between HMO and PPO?",
  ],
  searchTerms: [],
};

export function AgentAssist() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<AgentAssistMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your Medicare Agent Assistant. Ask me about commissions, Medicaid rules, LIS, MA plan types, carrier details, election periods, or needs analysis.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceFinalTextRef = useRef("");
  const [showCategories, setShowCategories] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [liveCategories, setLiveCategories] = useState<string[]>(knowledgeCategories);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle>(() => {
    try {
      return (localStorage.getItem("assist_response_style") as ResponseStyle) || "concise";
    } catch {
      return "concise";
    }
  });

  const handleStyleChange = (style: ResponseStyle) => {
    setResponseStyle(style);
    try { localStorage.setItem("assist_response_style", style); } catch {}
  };
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Context-aware: detect current page and surface relevant KB entries
  const routeContext = useMemo<RouteContext>(() => {
    const path = location.pathname;
    // Handle /agents/:agentId
    if (path.startsWith("/agents")) return ROUTE_CONTEXT["/agents"];
    return ROUTE_CONTEXT[path] ?? DEFAULT_CONTEXT;
  }, [location.pathname]);

  const [contextEntries, setContextEntries] = useState<KnowledgeEntry[]>([]);

  // Fetch relevant KB entries based on current route context
  useEffect(() => {
    if (!open) return;
    const all = searchKnowledge(routeContext.searchTerms.join(" "), 4);
    setContextEntries(all);
  }, [open, routeContext]);

  // Show context suggestions when panel opens on a new page
  const [showContextBanner, setShowContextBanner] = useState(false);
  useEffect(() => {
    if (open) {
      setShowContextBanner(true);
    }
  }, [open, routeContext.label]);

  // Track active client from CRM for "copy to notes"
  const [activeClientName, setActiveClientName] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setActiveClientName(detail?.name ?? null);
    };
    window.addEventListener("crm:active-client", handler);
    return () => window.removeEventListener("crm:active-client", handler);
  }, []);

  // Default to bottom-right
  useEffect(() => {
    const updateDefault = () => {
      if (!hasMoved && avatarRef.current) {
        const w = avatarRef.current.offsetWidth;
        const h = avatarRef.current.offsetHeight;
        setPosition({ x: window.innerWidth - w - 24, y: window.innerHeight - h - 24 });
      }
    };
    updateDefault();
    window.addEventListener("resize", updateDefault);
    return () => window.removeEventListener("resize", updateDefault);
  }, [hasMoved]);

  // When opening the panel, reposition so the full panel stays on-screen
  const ensurePanelInView = useCallback(() => {
    const panelW = Math.min(380, window.innerWidth - 16);
    const panelH = Math.min(window.innerHeight * 0.7, window.innerHeight - 16);
    setPosition((prev) => ({
      x: Math.max(8, Math.min(window.innerWidth - panelW - 8, prev.x)),
      y: Math.max(8, Math.min(window.innerHeight - panelH - 8, prev.y)),
    }));
    setHasMoved(true);
  }, []);

  useEffect(() => {
    if (open && !minimized && scrollRef.current) {
      // Use requestAnimationFrame to ensure DOM is updated before scrolling
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages, open, minimized, isTyping]);

  // Refresh categories from localStorage whenever the panel opens
  useEffect(() => {
    if (open) setLiveCategories(getKnowledgeCategories());
  }, [open]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (open) return; // only drag when closed
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
    setIsDragging(true);
  }, [open, position.x, position.y]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = dragRef.current.origX + dx;
      const newY = dragRef.current.origY + dy;
      const w = avatarRef.current?.offsetWidth ?? 64;
      const h = avatarRef.current?.offsetHeight ?? 64;
      const clampedX = Math.max(8, Math.min(window.innerWidth - w - 8, newX));
      const clampedY = Math.max(8, Math.min(window.innerHeight - h - 8, newY));
      setPosition({ x: clampedX, y: clampedY });
      setHasMoved(true);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Voice / speech-to-text
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) {
        voiceFinalTextRef.current = (voiceFinalTextRef.current + final).trim();
        setInput(voiceFinalTextRef.current);
      } else {
        setInput((voiceFinalTextRef.current + interim).trim());
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceError("Microphone access denied");
        setVoiceSupported(false);
      } else if (e.error === "no-speech") {
        // ignore
      } else {
        setVoiceError("Voice error: " + e.error);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.abort(); } catch {}
    };
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    setVoiceError(null);
    voiceFinalTextRef.current = input ? input + " " : "";
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // already started
    }
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    logAudit({ actor: "agent", action: "assist_query", category: "knowledge_base", entity: "Agent Assist", severity: "info", details: trimmed.slice(0, 120) });

    const userMsg: AgentAssistMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowCategories(false);
    setIsTyping(true);

    // Simulate RAG retrieval response
    setTimeout(() => {
      const { content, sources } = generateAssistResponse(trimmed, responseStyle);
      const assistantMsg: AgentAssistMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content,
        sources,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 450);
  };

  const handleCategoryClick = (cat: string) => {
    setShowCategories(false);
    sendMessage(`Tell me about ${cat}`);
  };

  const handleCopyToNotes = (content: string, msgId: string) => {
    navigator.clipboard?.writeText(content).catch(() => {});
    window.dispatchEvent(new CustomEvent("assist:copy-to-notes", { detail: { content } }));
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
    if (activeClientName) {
      toast.success(`Added to ${activeClientName}'s notes`);
    } else {
      toast.success("Copied to clipboard", {
        description: "Open a client record to paste directly into notes",
      });
    }
  };

  return (
    <>
      {/* Floating avatar button */}
      <div
        ref={avatarRef}
        className={cn(
          "fixed z-[100] select-none",
          isDragging ? "cursor-grabbing" : open ? "cursor-default" : "cursor-grab",
        )}
        style={{ left: position.x, top: position.y }}
        onMouseDown={handleMouseDown}
      >
        {open && !minimized ? (
          /* ── Chat panel ── */
          <div className="w-[380px] max-w-[calc(100vw-16px)] rounded-2xl border border-border bg-card shadow-2xl shadow-navy-900/30 overflow-hidden flex flex-col" style={{ maxHeight: "70vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-navy-gradient text-navy-50">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-9 w-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-navy-100" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-navy-800" />
                </div>
                <div>
                  <p className="text-sm font-semibold font-display leading-tight">Medicare Agent Assist</p>
                  <p className="text-[10px] text-navy-200 leading-tight flex items-center gap-1">
                    {responseStyleLabels[responseStyle]} · RAG online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    showSettings ? "bg-white/20" : "hover:bg-white/10"
                  )}
                  title="Response style settings"
                >
                  <Settings2 className="h-4 w-4 text-navy-100" />
                </button>
                <button
                  onClick={() => setMinimized(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Minimize"
                >
                  <Minimize2 className="h-4 w-4 text-navy-100" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X className="h-4 w-4 text-navy-100" />
                </button>
              </div>
            </div>

            {/* Settings popover */}
            {showSettings && (
              <div className="px-3 py-3 border-b border-border bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-foreground">Response Style</p>
                  <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(responseStyleLabels) as ResponseStyle[]).map((style) => (
                    <button
                      key={style}
                      onClick={() => handleStyleChange(style)}
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-left transition-colors",
                        responseStyle === style
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-muted/40 text-foreground hover:border-accent/40"
                      )}
                    >
                      <p className="text-xs font-medium">{responseStyleLabels[style]}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                        {responseStyleDescriptions[style]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin p-3 space-y-3 bg-muted/30 min-h-[200px]">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[90%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "bg-card border border-border text-foreground"
                  )}>
                    {/* Render content with proper line breaks and bullet formatting */}
                    <div className="whitespace-pre-wrap break-words leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0">
                      {msg.content.split("\n").map((line, i) => {
                        const trimmed = line.trim();
                        if (trimmed === "") return <div key={i} className="h-1.5" />;
                        if (trimmed.startsWith("• ")) {
                          return (
                            <div key={i} className="flex gap-1.5 mb-0.5">
                              <span className="text-accent shrink-0">•</span>
                              <span>{trimmed.slice(2)}</span>
                            </div>
                          );
                        }
                        return <p key={i} className="mb-0.5">{trimmed}</p>;
                      })}
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/60 space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> Sources
                        </p>
                        {msg.sources.map((src) => (
                          <div key={src.id} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                            <span className="font-medium text-accent">{src.category}</span>
                            <span className="text-muted-foreground/60">— {src.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" && msg.id !== "welcome" && (
                      <button
                        onClick={() => handleCopyToNotes(msg.content, msg.id)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors"
                      >
                        {copiedId === msg.id ? (
                          <><Check className="h-3 w-3" /> Copied to notes</>
                        ) : (
                          <><ClipboardCopy className="h-3 w-3" /> Copy to client notes</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Context-aware suggestions (only when 1 message) */}
            {messages.length === 1 && (
              <div className="px-3 pb-2 space-y-2">
                {/* Context banner */}
                {showContextBanner && contextEntries.length > 0 && (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-accent flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Relevant for {routeContext.label}
                      </p>
                      <button
                        onClick={() => setShowContextBanner(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      {contextEntries.slice(0, 3).map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => { sendMessage(`Tell me about ${entry.title}`); setShowContextBanner(false); }}
                          className="w-full text-left flex items-start gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent/10 transition-colors group"
                        >
                          <ChevronRight className="h-3 w-3 mt-0.5 text-accent shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground group-hover:text-accent truncate">
                              {entry.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {entry.category}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Context-aware prompts */}
                <p className="text-[10px] text-muted-foreground px-1">
                  Suggested for {routeContext.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {routeContext.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-colors text-muted-foreground"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category browser */}
            {showCategories && (
              <div className="px-3 pb-2 border-t border-border bg-card">
                <div className="flex items-center justify-between pt-2 pb-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Search className="h-3 w-3" /> Knowledge categories
                  </p>
                  <button onClick={() => setShowCategories(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto scrollbar-thin pb-1">
                {liveCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryClick(cat)}
                      className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-muted/40 hover:bg-accent/10 hover:border-accent/40 hover:text-accent transition-colors text-foreground"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3 bg-card space-y-2">
              {isListening && (
                <div className="flex items-center gap-2 text-xs text-accent animate-pulse">
                  <span className="flex gap-0.5 items-end h-3">
                    <span className="w-0.5 bg-accent rounded-full animate-pulse" style={{ height: "40%" }} />
                    <span className="w-0.5 bg-accent rounded-full animate-pulse" style={{ height: "80%", animationDelay: "0.15s" }} />
                    <span className="w-0.5 bg-accent rounded-full animate-pulse" style={{ height: "55%", animationDelay: "0.3s" }} />
                    <span className="w-0.5 bg-accent rounded-full animate-pulse" style={{ height: "90%", animationDelay: "0.45s" }} />
                  </span>
                  Listening… tap mic to send
                </div>
              )}
              {voiceError && (
                <p className="text-xs text-destructive">{voiceError}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className={cn(
                    "p-2 rounded-lg border transition-colors shrink-0",
                    showCategories
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title="Browse categories"
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                {voiceSupported && (
                  <button
                    onClick={toggleVoice}
                    className={cn(
                      "p-2 rounded-lg border transition-colors shrink-0 relative",
                      isListening
                        ? "bg-destructive/10 border-destructive/40 text-destructive"
                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={isListening ? "Stop & send" : "Voice input"}
                  >
                    {isListening ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                    {isListening && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive animate-ping" />
                    )}
                  </button>
                )}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); if (!isListening) voiceFinalTextRef.current = e.target.value; }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (isListening) { recognitionRef.current?.stop(); setIsListening(false); } sendMessage(input); } }}
                  placeholder={isListening ? "Listening…" : "Ask about Medicare, Medicaid, LIS…"}
                  className="flex-1 min-w-0 h-9 rounded-lg border border-border bg-muted/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40"
                />
                <button
                  onClick={() => { if (isListening) { recognitionRef.current?.stop(); setIsListening(false); } sendMessage(input); }}
                  disabled={!input.trim()}
                  className="p-2 rounded-lg bg-accent text-accent-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                  title="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Avatar bubble (closed or minimized) ── */
          <button
            onClick={() => { ensurePanelInView(); setOpen(true); setMinimized(false); }}
            className="group relative h-14 w-14 rounded-full bg-navy-gradient shadow-xl shadow-navy-900/40 border border-navy-600/50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            title="Open Medicare Agent Assist"
          >
            <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-60 group-hover:opacity-0 transition-opacity" />
            <Sparkles className="h-6 w-6 text-navy-50 relative z-10" />
            {/* Drag handle hint */}
            {!isDragging && (
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            {/* Notification dot */}
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-success border-2 border-navy-900 flex items-center justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          </button>
        )}
      </div>
    </>
  );
}
