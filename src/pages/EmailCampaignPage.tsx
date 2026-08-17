import { useState, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/lib/roleContext";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/auditLog";
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  getCampaigns,
  saveCampaign,
  deleteCampaign,
  getUnsubscribes,
  removeUnsubscribe,
  getSmsOptOuts,
  removeSmsOptOut,
  simulateSend,
  simulateABTestPhase,
  simulateABFullSend,
  pickABWinner,
  newTemplate,
  newCampaign,
  emailTemplateVariables,
  smsTemplateVariables,
  calculateSmsSegments,
  getDripSequences,
  saveDripSequence,
  deleteDripSequence,
  toggleDripSequence,
  newDripSequence,
  triggerLabels,
  type EmailTemplate,
  type EmailCampaign,
  type CampaignStatus,
  type CampaignChannel,
  type UnsubscribeEntry,
  type SmsOptOutEntry,
  type DripSequence,
  type DripStep,
  type LifecycleTrigger,
  type ABVariant,
  type ABTestConfig,
} from "@/lib/emailCampaignData";
import {
  Mail,
  MessageSquare,
  Plus,
  Send,
  Eye,
  MousePointerClick,
  Ban,
  Edit2,
  Trash2,
  Calendar,
  TrendingUp,
  FileText,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Variable,
  Smartphone,
  Hash,
  Zap,
  Clock,
  Users,
  ZapOff,
  ArrowRight,
  PlayCircle,
  PauseCircle,
  FlaskConical,
  Trophy,
  Sparkles,
  Wand2,
  LayoutTemplate,
  Code2,
} from "lucide-react";
import { VisualEmailBuilder } from "@/components/shared/VisualEmailBuilder";

const statusColors: Record<CampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-accent text-accent-foreground",
  sending: "bg-warning text-warning-foreground",
  sent: "bg-success text-success-foreground",
  paused: "bg-destructive/10 text-destructive",
};

const audienceLabels: Record<string, string> = {
  all_clients: "All Clients",
  active: "Active Clients",
  prospects: "Prospects",
  ma_only: "MA Clients Only",
  mapd_only: "MAPD Clients Only",
  custom: "Custom Segment",
};

// ── Mini Stat ──────────────────────────────────────────────────────

function MiniStat({ icon: Icon, label, value, color }: { icon: typeof Eye; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Channel Toggle ─────────────────────────────────────────────────

function ChannelToggle({ channel, onChange }: { channel: CampaignChannel; onChange: (c: CampaignChannel) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
      <button
        onClick={() => onChange("email")}
        className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          channel === "email" ? "bg-navy-100 text-navy-700" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Mail className="h-4 w-4" /> Email
      </button>
      <button
        onClick={() => onChange("sms")}
        className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
          channel === "sms" ? "bg-accent/15 text-accent-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <MessageSquare className="h-4 w-4" /> SMS
      </button>
    </div>
  );
}

// ── Email Template Editor ──────────────────────────────────────────

function EmailTemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: EmailTemplate;
  onSave: (tpl: EmailTemplate) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EmailTemplate>(template);
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");

  const insertVariable = (token: string) => {
    setDraft({ ...draft, bodyHtml: draft.bodyHtml + " " + token });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Template Name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as EmailTemplate["category"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["AEP", "OEP", "Retention", "Educational", "Welcome", "Custom"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Subject Line</Label>
        <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Your subject line..." />
      </div>
      <div className="space-y-2">
        <Label>Preheader (preview text)</Label>
        <Input value={draft.preheader} onChange={(e) => setDraft({ ...draft, preheader: e.target.value })} placeholder="Short preview shown in inbox..." />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Email Body</Label>
          <div className="flex items-center gap-2">
            {/* Mode toggle */}
            <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
              <button
                onClick={() => setEditorMode("visual")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  editorMode === "visual" ? "bg-navy-100 text-navy-700" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutTemplate className="h-3.5 w-3.5" /> Visual
              </button>
              <button
                onClick={() => setEditorMode("html")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  editorMode === "html" ? "bg-navy-100 text-navy-700" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="h-3.5 w-3.5" /> HTML
              </button>
            </div>
            {editorMode === "html" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Variable className="h-3.5 w-3.5 mr-1.5" />
                    Insert Variable
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {emailTemplateVariables.map((v) => (
                    <DropdownMenuItem key={v.token} onClick={() => insertVariable(v.token)}>
                      <span className="font-mono text-xs">{v.token}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{v.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {editorMode === "visual" ? (
          <div className="rounded-lg border border-border p-3 bg-muted/30">
            <VisualEmailBuilder
              initialHtml={draft.bodyHtml}
              onChange={(html) => setDraft({ ...draft, bodyHtml: html })}
            />
          </div>
        ) : (
          <Textarea
            value={draft.bodyHtml}
            onChange={(e) => setDraft({ ...draft, bodyHtml: e.target.value })}
            rows={12}
            className="font-mono text-xs"
            placeholder="<p>Hi {{first_name}},</p>..."
          />
        )}
      </div>

      {/* Live preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Preview</Label>
        <div className="rounded-lg border border-border bg-white p-4 text-sm">
          <div className="border-b border-border pb-2 mb-3">
            <p className="font-semibold text-navy-900">{draft.subject || "(no subject)"}</p>
            <p className="text-xs text-muted-foreground">{draft.preheader || ""}</p>
          </div>
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{
              __html: draft.bodyHtml
                .replace(/\{\{first_name\}\}/g, "John")
                .replace(/\{\{last_name\}\}/g, "Smith")
                .replace(/\{\{agency_name\}\}/g, "agencyBRIDGE")
                .replace(/\{\{agency_phone\}\}/g, "(555) 123-4567")
                .replace(/\{\{agent_name\}\}/g, "Sarah Chen")
                .replace(/\{\{plan_type\}\}/g, "MAPD")
                .replace(/\{\{carrier\}\}/g, "UnitedHealthcare")
                .replace(/\{\{unsubscribe_text\}\}/g, "You're receiving this because you're a client of agencyBRIDGE. Unsubscribe below."),
            }}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(draft)}>Save Template</Button>
      </div>
    </div>
  );
}

// ── SMS Template Editor ────────────────────────────────────────────

function SmsTemplateEditor({
  template,
  onSave,
  onCancel,
}: {
  template: EmailTemplate;
  onSave: (tpl: EmailTemplate) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EmailTemplate>(template);

  const insertVariable = (token: string) => {
    setDraft({ ...draft, bodyText: draft.bodyText + token });
  };

  const segments = calculateSmsSegments(draft.bodyText);
  const charCount = draft.bodyText.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Template Name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as EmailTemplate["category"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["AEP", "OEP", "Retention", "Educational", "Welcome", "Custom"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>SMS Message Body</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Variable className="h-3.5 w-3.5 mr-1.5" />
                Insert Variable
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {smsTemplateVariables.map((v) => (
                <DropdownMenuItem key={v.token} onClick={() => insertVariable(v.token)}>
                  <span className="font-mono text-xs">{v.token}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{v.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Textarea
          value={draft.bodyText}
          onChange={(e) => setDraft({ ...draft, bodyText: e.target.value })}
          rows={5}
          className="text-sm"
          placeholder="Hi {{first_name}}, it's {{agency_name}}..."
        />
        <div className="flex items-center justify-between text-xs">
          <span className={charCount > 160 ? "text-warning-foreground" : "text-muted-foreground"}>
            {charCount} characters · {segments} segment{segments !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">
            {segments === 1 ? "Standard SMS" : `Multipart SMS (${segments} × 153 chars)`}
          </span>
        </div>
      </div>

      {/* Phone preview */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Phone Preview</Label>
        <div className="flex justify-center">
          <div className="w-64 rounded-2xl border-2 border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">SMS Preview</span>
            </div>
            <div className="rounded-lg bg-navy-100 p-3 text-sm text-foreground">
              {draft.bodyText
                .replace(/\{\{first_name\}\}/g, "John")
                .replace(/\{\{agency_name\}\}/g, "agencyBRIDGE")
                .replace(/\{\{agency_phone\}\}/g, "(555) 123-4567")
                .replace(/\{\{agent_name\}\}/g, "Sarah Chen")
                .replace(/\{\{plan_type\}\}/g, "MAPD")
                .replace(/\{\{appointment_date\}\}/g, "Aug 20, 2:00 PM") || "(empty message)"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
        <strong className="text-warning-foreground">Compliance note:</strong> SMS messages must include an opt-out instruction (e.g., "Reply STOP to opt out"). TCPA consent is required before sending marketing SMS.
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(draft)}>Save Template</Button>
      </div>
    </div>
  );
}

// ── A/B Test Configurator ──────────────────────────────────────────

function ABTestConfigurator({
  abTest,
  recipientCount,
  template,
  onChange,
}: {
  abTest?: ABTestConfig;
  recipientCount: number;
  template?: EmailTemplate;
  onChange: (ab: ABTestConfig) => void;
}) {
  if (!abTest) return null;

  const updateVariant = (id: string, patch: Partial<ABVariant>) => {
    onChange({
      ...abTest,
      variants: abTest.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    });
  };

  const addVariant = () => {
    if (abTest.variants.length >= 4) return;
    const letter = String.fromCharCode(65 + abTest.variants.length);
    onChange({
      ...abTest,
      variants: [...abTest.variants, { id: `var_${Date.now()}`, label: `Variant ${letter}`, subject: "", preheader: "", testSize: 0, opens: 0, clicks: 0, sent: 0 }],
    });
  };

  const removeVariant = (id: string) => {
    if (abTest.variants.length <= 2) return;
    onChange({ ...abTest, variants: abTest.variants.filter((v) => v.id !== id) });
  };

  const testPoolSize = Math.floor((recipientCount || 0) * (abTest.testPercentage / 100));
  const perVariant = Math.floor(testPoolSize / abTest.variants.length);
  const remainingAudience = (recipientCount || 0) - testPoolSize;

  return (
    <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent-foreground" />
          <Label className="text-sm font-semibold cursor-pointer">A/B Test Subject Lines</Label>
        </div>
        <Switch
          checked={abTest.enabled}
          onCheckedChange={(enabled) => onChange({ ...abTest, enabled })}
        />
      </div>

      {abTest.enabled && (
        <>
          <p className="text-xs text-muted-foreground">
            Test different subject lines on a sample of your audience, automatically pick the winner by highest {abTest.winnerCriteria === "open_rate" ? "open rate" : "click rate"}, then send the winning variant to the rest.
          </p>

          {/* Test settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Test Sample Size: {abTest.testPercentage}%</Label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={abTest.testPercentage}
                onChange={(e) => onChange({ ...abTest, testPercentage: parseInt(e.target.value) })}
                className="w-full accent-accent-foreground"
              />
              <p className="text-xs text-muted-foreground">
                {testPoolSize} recipients in test pool · {perVariant} per variant · {remainingAudience} held for full send
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Winner Criteria</Label>
              <Select
                value={abTest.winnerCriteria}
                onValueChange={(v) => onChange({ ...abTest, winnerCriteria: v as "open_rate" | "click_rate" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_rate">Highest Open Rate</SelectItem>
                  <SelectItem value="click_rate">Highest Click Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-3">
            {abTest.variants.map((variant, i) => (
              <div key={variant.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-xs font-bold text-accent-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-xs font-medium">{variant.label}</span>
                  </div>
                  {abTest.variants.length > 2 && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => removeVariant(variant.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Input
                  value={variant.subject}
                  onChange={(e) => updateVariant(variant.id, { subject: e.target.value })}
                  placeholder={template?.subject ? template.subject : "Enter subject line..."}
                  className="text-sm"
                />
                <Input
                  value={variant.preheader}
                  onChange={(e) => updateVariant(variant.id, { preheader: e.target.value })}
                  placeholder={template?.preheader ? template.preheader : "Enter preheader (preview text)..."}
                  className="text-xs"
                />
              </div>
            ))}

            {abTest.variants.length < 4 && (
              <Button variant="outline" size="sm" onClick={addVariant} className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1.5" />Add Variant
              </Button>
            )}
          </div>

          {/* Test flow diagram */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5 rounded-md bg-card border border-border px-3 py-1.5">
              <Users className="h-3.5 w-3.5" />
              {recipientCount || 0} recipients
            </div>
            <ArrowRight className="h-3.5 w-3.5" />
            <div className="flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-3 py-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-accent-foreground" />
              Test {testPoolSize} ({abTest.testPercentage}%)
            </div>
            <ArrowRight className="h-3.5 w-3.5" />
            <div className="flex items-center gap-1.5 rounded-md bg-success/10 border border-success/20 px-3 py-1.5">
              <Trophy className="h-3.5 w-3.5 text-success" />
              Pick Winner
            </div>
            <ArrowRight className="h-3.5 w-3.5" />
            <div className="flex items-center gap-1.5 rounded-md bg-navy-100 border border-navy-200 px-3 py-1.5">
              <Send className="h-3.5 w-3.5 text-navy-700" />
              Full send {remainingAudience}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Campaign Builder ───────────────────────────────────────────────

function CampaignBuilder({
  campaign,
  templates,
  onSave,
  onCancel,
  onSend,
}: {
  campaign: EmailCampaign;
  templates: EmailTemplate[];
  onSave: (camp: EmailCampaign) => void;
  onCancel: () => void;
  onSend: (camp: EmailCampaign) => void;
}) {
  const [draft, setDraft] = useState<EmailCampaign>(campaign);
  const channelTemplates = templates.filter((t) => t.channel === draft.channel);
  const selectedTemplate = channelTemplates.find((t) => t.id === draft.templateId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Campaign Name</Label>
        <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Template</Label>
          <Select value={draft.templateId} onValueChange={(v) => setDraft({ ...draft, templateId: v })}>
            <SelectTrigger><SelectValue placeholder={`Select an ${draft.channel === "sms" ? "SMS" : "email"} template...`} /></SelectTrigger>
            <SelectContent>
              {channelTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Audience</Label>
          <Select value={draft.audience} onValueChange={(v) => setDraft({ ...draft, audience: v as EmailCampaign["audience"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(audienceLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Estimated Recipients</Label>
        <Input
          type="number"
          value={draft.recipientCount}
          onChange={(e) => setDraft({ ...draft, recipientCount: parseInt(e.target.value) || 0 })}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          {draft.channel === "sms"
            ? "Opted-out numbers are automatically excluded from sends."
            : "Unsubscribed contacts are automatically excluded from sends."}
        </p>
      </div>
      <div className="space-y-2">
        <Label>Schedule (optional)</Label>
        <Input
          type="datetime-local"
          value={draft.scheduledFor ? draft.scheduledFor.slice(0, 16) : ""}
          onChange={(e) => setDraft({ ...draft, scheduledFor: e.target.value ? new Date(e.target.value).toISOString() : null })}
        />
      </div>

      {/* A/B Subject Line Testing — email only */}
      {draft.channel === "email" && (
        <ABTestConfigurator
          abTest={draft.abTest}
          recipientCount={draft.recipientCount}
          template={selectedTemplate}
          onChange={(ab) => setDraft({ ...draft, abTest: ab })}
        />
      )}

      {selectedTemplate && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Template Preview</p>
          {draft.channel === "email" ? (
            <>
              <p className="font-semibold text-navy-900">
                {draft.abTest?.enabled && draft.abTest.winnerVariantId
                  ? draft.abTest.variants.find((v) => v.id === draft.abTest!.winnerVariantId)?.subject || selectedTemplate.subject
                  : selectedTemplate.subject}
              </p>
              <p className="text-xs text-muted-foreground">{selectedTemplate.preheader}</p>
            </>
          ) : (
            <p className="text-sm text-foreground">{selectedTemplate.bodyText.slice(0, 120)}{selectedTemplate.bodyText.length > 120 ? "..." : ""}</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button variant="outline" onClick={() => onSave(draft)}>Save Draft</Button>
        <Button onClick={() => onSend(draft)} disabled={!draft.templateId || draft.recipientCount === 0}>
          <Send className="h-4 w-4 mr-1.5" />
          {draft.scheduledFor ? "Schedule Send" : draft.abTest?.enabled ? "Start A/B Test" : "Send Now"}
        </Button>
      </div>
    </div>
  );
}

// ── Campaign Detail ────────────────────────────────────────────────

function CampaignDetail({ campaign, template, onBack }: { campaign: EmailCampaign; template?: EmailTemplate; onBack: () => void }) {
  const isSms = campaign.channel === "sms";
  const { sent, delivered, opens, clicks, bounces, unsubscribes, failed, optOuts } = campaign.stats;
  const openRate = sent > 0 ? ((opens / sent) * 100).toFixed(1) : "0";
  const clickRate = sent > 0 ? ((clicks / sent) * 100).toFixed(1) : "0";
  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0";
  const bounceRate = sent > 0 ? ((bounces / sent) * 100).toFixed(1) : "0";
  const unsubRate = sent > 0 ? ((unsubscribes / sent) * 100).toFixed(1) : "0";
  const failRate = sent > 0 ? ((failed / sent) * 100).toFixed(1) : "0";
  const optOutRate = sent > 0 ? ((optOuts / sent) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
        Back to Campaigns
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {isSms ? <MessageSquare className="h-5 w-5 text-accent-foreground" /> : <Mail className="h-5 w-5 text-navy-700" />}
            <h2 className="text-xl font-display font-semibold">{campaign.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {template?.name ?? "No template"} · {audienceLabels[campaign.audience]} · {campaign.recipientCount} recipients
          </p>
        </div>
        <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
      </div>

      {isSms ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat icon={Send} label="Sent" value={sent} color="bg-accent/15 text-accent-foreground" />
          <MiniStat icon={CheckCircle2} label="Delivered" value={`${delivered} (${deliveryRate}%)`} color="bg-success/15 text-success" />
          <MiniStat icon={MousePointerClick} label="Link Clicks" value={`${clicks} (${clickRate}%)`} color="bg-navy-100 text-navy-700" />
          <MiniStat icon={AlertCircle} label="Failed" value={`${failed} (${failRate}%)`} color="bg-destructive/10 text-destructive" />
          <MiniStat icon={Ban} label="Opt-Outs" value={`${optOuts} (${optOutRate}%)`} color="bg-warning/15 text-warning-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniStat icon={Send} label="Sent" value={sent} color="bg-navy-100 text-navy-700" />
          <MiniStat icon={CheckCircle2} label="Delivered" value={delivered} color="bg-success/15 text-success" />
          <MiniStat icon={Eye} label="Opens" value={`${opens} (${openRate}%)`} color="bg-accent/15 text-accent-foreground" />
          <MiniStat icon={MousePointerClick} label="Clicks" value={`${clicks} (${clickRate}%)`} color="bg-navy-100 text-navy-700" />
          <MiniStat icon={AlertCircle} label="Bounces" value={`${bounces} (${bounceRate}%)`} color="bg-warning/15 text-warning-foreground" />
          <MiniStat icon={Ban} label="Unsubs" value={`${unsubscribes} (${unsubRate}%)`} color="bg-destructive/10 text-destructive" />
        </div>
      )}

      {/* A/B Test Results */}
      {campaign.abTest?.enabled && campaign.abTest.status !== "none" && (
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-accent-foreground" />
              A/B Test Results
              {campaign.abTest.status === "completed" && campaign.abTest.winnerVariantId && (
                <Badge className="bg-success/15 text-success text-xs">
                  <Trophy className="h-3 w-3 mr-1" />
                  Winner: {campaign.abTest.variants.find((v) => v.id === campaign.abTest!.winnerVariantId)?.label}
                </Badge>
              )}
              {campaign.abTest.status === "testing" && (
                <Badge className="bg-warning/15 text-warning-foreground text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Testing in progress
                </Badge>
              )}
              {campaign.abTest.status === "winner_selected" && (
                <Badge className="bg-accent/15 text-accent-foreground text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Winner selected — full send pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {campaign.abTest.testPercentage}% test sample · Winner by {campaign.abTest.winnerCriteria === "open_rate" ? "open rate" : "click rate"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {campaign.abTest.variants.map((variant, i) => {
                const isWinner = variant.id === campaign.abTest!.winnerVariantId;
                const vOpenRate = variant.sent > 0 ? ((variant.opens / variant.sent) * 100).toFixed(1) : "0";
                const vClickRate = variant.sent > 0 ? ((variant.clicks / variant.sent) * 100).toFixed(1) : "0";
                const metricValue = campaign.abTest!.winnerCriteria === "open_rate" ? vOpenRate : vClickRate;
                const metricLabel = campaign.abTest!.winnerCriteria === "open_rate" ? "Open Rate" : "Click Rate";
                const maxMetric = Math.max(...campaign.abTest!.variants.map((v) =>
                  v.sent > 0 ? (campaign.abTest!.winnerCriteria === "open_rate" ? v.opens / v.sent : v.clicks / v.sent) * 100 : 0
                ));
                const barWidth = maxMetric > 0 ? (parseFloat(metricValue) / maxMetric) * 100 : 0;

                return (
                  <div key={variant.id} className={`rounded-lg border p-3 ${isWinner ? "border-success/40 bg-success/5" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${isWinner ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-sm font-medium">{variant.subject || "(no subject)"}</span>
                        {isWinner && <Trophy className="h-4 w-4 text-success" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{variant.sent} sent</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs w-20 text-muted-foreground">{metricLabel}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isWinner ? "bg-success" : "bg-accent"}`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className="text-xs font-semibold w-12 text-right">{metricValue}%</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span>{variant.opens} opens</span>
                      <span>{variant.clicks} clicks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {campaign.recipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipient Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {campaign.recipients.map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted-foreground">{isSms ? r.phone : r.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.clickedUrl && <span className="text-xs text-accent-foreground truncate max-w-[200px]">{r.clickedUrl}</span>}
                    <Badge variant="outline" className={
                      r.status === "clicked" ? "border-accent text-accent-foreground" :
                      r.status === "opened" ? "border-navy-400 text-navy-700" :
                      r.status === "delivered" ? "border-success text-success" :
                      r.status === "failed" ? "border-destructive text-destructive" :
                      r.status === "bounced" ? "border-destructive text-destructive" :
                      r.status === "opted_out" || r.status === "unsubscribed" ? "border-destructive text-destructive" :
                      "border-border text-muted-foreground"
                    }>
                      {r.status.replace(/_/g, " ")}
                    </Badge>
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

// ── Drip Sequence Editor ────────────────────────────────────────────

function DripSequenceEditor({
  sequence,
  templates,
  onSave,
  onCancel,
}: {
  sequence: DripSequence;
  templates: EmailTemplate[];
  onSave: (seq: DripSequence) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DripSequence>(sequence);

  const updateStep = (id: string, patch: Partial<DripStep>) => {
    setDraft({
      ...draft,
      steps: draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const addStep = () => {
    setDraft({
      ...draft,
      steps: [
        ...draft.steps,
        { id: `step_${Date.now()}`, delayDays: 7, templateId: "", channel: "email", subject: `Step ${draft.steps.length + 1}` },
      ],
    });
  };

  const removeStep = (id: string) => {
    setDraft({ ...draft, steps: draft.steps.filter((s) => s.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Sequence Name</Label>
          <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Trigger Event</Label>
          <Select
            value={draft.trigger}
            onValueChange={(v) => setDraft({ ...draft, trigger: v as LifecycleTrigger })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.entries(triggerLabels) as [LifecycleTrigger, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
        <Clock className="h-3.5 w-3.5 inline mr-1.5 text-accent-foreground" />
        This sequence automatically enrolls clients when the <strong>{triggerLabels[draft.trigger]}</strong> event occurs.
        Each step fires after the specified delay (in days) from the trigger date.
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Sequence Steps ({draft.steps.length})</Label>
          <Button variant="outline" size="sm" onClick={addStep}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Add Step
          </Button>
        </div>

        {draft.steps.map((step, i) => (
          <div key={step.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
              {draft.steps.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => removeStep(step.id)} className="text-destructive h-7 px-2">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Delay (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={step.delayDays}
                  onChange={(e) => updateStep(step.id, { delayDays: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Channel</Label>
                <Select
                  value={step.channel}
                  onValueChange={(v) => updateStep(step.id, { channel: v as CampaignChannel })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 space-y-1">
                <Label className="text-xs">Step Label</Label>
                <Input
                  value={step.subject}
                  onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                  placeholder="e.g. Welcome email"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Template</Label>
              <Select
                value={step.templateId}
                onValueChange={(v) => updateStep(step.id, { templateId: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                <SelectContent>
                  {templates
                    .filter((t) => t.channel === step.channel)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(draft)}>Save Sequence</Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function EmailCampaignPage() {
  const { user, can } = useRole();
  const { toast } = useToast();
  const [channel, setChannel] = useState<CampaignChannel>("email");
  const [tab, setTab] = useState("campaigns");
  const [templates, setTemplates] = useState<EmailTemplate[]>(getTemplates());
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(getCampaigns());
  const [unsubs, setUnsubs] = useState<UnsubscribeEntry[]>(getUnsubscribes());
  const [smsOptOuts, setSmsOptOuts] = useState<SmsOptOutEntry[]>(getSmsOptOuts());

  const [editingTpl, setEditingTpl] = useState<EmailTemplate | null>(null);
  const [buildingCamp, setBuildingCamp] = useState<EmailCampaign | null>(null);
  const [viewingCamp, setViewingCamp] = useState<EmailCampaign | null>(null);
  const [showTplDialog, setShowTplDialog] = useState(false);
  const [showCampDialog, setShowCampDialog] = useState(false);
  const [dripSequences, setDripSequences] = useState<DripSequence[]>(getDripSequences());
  const [editingDrip, setEditingDrip] = useState<DripSequence | null>(null);
  const [showDripDialog, setShowDripDialog] = useState(false);
  const actor = user?.name ?? "Unknown";

  // Channel-filtered data
  const channelCampaigns = useMemo(() => campaigns.filter((c) => c.channel === channel), [campaigns, channel]);
  const channelTemplates = useMemo(() => templates.filter((t) => t.channel === channel), [templates, channel]);

  // Aggregate stats per channel
  const aggStats = useMemo(() => {
    const list = channelCampaigns;
    const sent = list.reduce((s, c) => s + c.stats.sent, 0);
    const opens = list.reduce((s, c) => s + c.stats.opens, 0);
    const clicks = list.reduce((s, c) => s + c.stats.clicks, 0);
    const delivered = list.reduce((s, c) => s + c.stats.delivered, 0);
    const failed = list.reduce((s, c) => s + c.stats.failed, 0);
    const optOuts = list.reduce((s, c) => s + c.stats.optOuts, 0);
    const unsubs = list.reduce((s, c) => s + c.stats.unsubscribes, 0);

    if (channel === "sms") {
      return {
        sent, delivered, clicks, failed, optOuts,
        deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0",
        clickRate: sent > 0 ? ((clicks / sent) * 100).toFixed(1) : "0",
      };
    }
    return {
      sent, opens, clicks, unsubs,
      openRate: sent > 0 ? ((opens / sent) * 100).toFixed(1) : "0",
      clickRate: sent > 0 ? ((clicks / sent) * 100).toFixed(1) : "0",
    };
  }, [channelCampaigns, channel]);

  const handleSaveTemplate = useCallback((tpl: EmailTemplate) => {
    const updated = saveTemplate(tpl);
    setTemplates(updated);
    setEditingTpl(null);
    setShowTplDialog(false);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Saved ${tpl.channel.toUpperCase()} template "${tpl.name}"`, category: "campaign", entity: `${tpl.channel}_template`, entityId: tpl.id, severity: "info" });
    toast({ title: "Template saved", description: tpl.name });
  }, [actor, user, toast]);

  const handleDeleteTemplate = useCallback((id: string, name: string) => {
    const updated = deleteTemplate(id);
    setTemplates(updated);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Deleted template "${name}"`, category: "campaign", entity: "template", entityId: id, severity: "warning" });
    toast({ title: "Template deleted", description: name });
  }, [actor, user, toast]);

  const handleSaveCampaign = useCallback((camp: EmailCampaign) => {
    const updated = saveCampaign({ ...camp, status: "draft" });
    setCampaigns(updated);
    setBuildingCamp(null);
    setShowCampDialog(false);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Saved campaign draft "${camp.name}"`, category: "campaign", entity: `${camp.channel}_campaign`, entityId: camp.id, severity: "info" });
    toast({ title: "Campaign saved", description: camp.name });
  }, [actor, user, toast]);

  const handleSendCampaign = useCallback((camp: EmailCampaign) => {
    // A/B test flow: test phase → pick winner → full send
    if (camp.abTest?.enabled && camp.channel === "email") {
      const saved = saveCampaign({ ...camp, status: "sending", abTest: { ...camp.abTest, status: "testing" } });
      setCampaigns(saved);
      setBuildingCamp(null);
      setShowCampDialog(false);

      toast({ title: "A/B test phase running...", description: `Testing ${camp.abTest.variants.length} subject lines on ${Math.floor((camp.recipientCount || 20) * (camp.abTest.testPercentage / 100))} recipients` });

      // Phase 1: Run test after 2s
      setTimeout(() => {
        const tested = simulateABTestPhase(camp.id, actor);
        setCampaigns(tested);
        const updated = tested.find((c) => c.id === camp.id);
        const winner = updated?.abTest?.variants.find((v) => v.id === updated?.abTest?.winnerVariantId);
        toast({ title: "Winner selected!", description: `${winner?.label}: "${winner?.subject.slice(0, 50)}..." — sending to remaining audience` });

        // Phase 2: Full send after winner is picked (1.5s later)
        setTimeout(() => {
          const fullSent = simulateABFullSend(camp.id, actor);
          setCampaigns(fullSent);
          const finalCamp = fullSent.find((c) => c.id === camp.id);
          toast({ title: "A/B campaign sent", description: `${camp.name} delivered to ${finalCamp?.stats.sent || camp.recipientCount} total recipients` });
        }, 1500);
      }, 2000);

      logAudit({ actor, actorId: user?.id ?? "unknown", action: `Started A/B test for email campaign "${camp.name}" with ${camp.abTest.variants.length} variants`, category: "campaign", entity: "ab_test", entityId: camp.id, severity: "info" });
      return;
    }

    // Standard send flow
    const updated = saveCampaign({ ...camp, status: camp.scheduledFor ? "scheduled" : "sending" });
    setCampaigns(updated);
    setBuildingCamp(null);
    setShowCampDialog(false);

    if (!camp.scheduledFor) {
      setTimeout(() => {
        const sent = simulateSend(camp.id, actor);
        setCampaigns(sent);
        toast({ title: `${camp.channel === "sms" ? "SMS" : "Email"} campaign sent`, description: `${camp.name} delivered to ${camp.recipientCount || 20} recipients` });
      }, 1500);
      toast({ title: "Sending campaign...", description: camp.name });
    } else {
      toast({ title: "Campaign scheduled", description: `${camp.name} scheduled for ${new Date(camp.scheduledFor).toLocaleString()}` });
    }

    logAudit({ actor, actorId: user?.id ?? "unknown", action: `${camp.scheduledFor ? "Scheduled" : "Sent"} ${camp.channel.toUpperCase()} campaign "${camp.name}"`, category: "campaign", entity: `${camp.channel}_campaign`, entityId: camp.id, severity: "info" });
  }, [actor, user, toast]);

  const handleDeleteCampaign = useCallback((id: string, name: string) => {
    const updated = deleteCampaign(id);
    setCampaigns(updated);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Deleted campaign "${name}"`, category: "campaign", entity: "campaign", entityId: id, severity: "warning" });
    toast({ title: "Campaign deleted", description: name });
  }, [actor, user, toast]);

  const handleRemoveUnsub = useCallback((email: string) => {
    const updated = removeUnsubscribe(email);
    setUnsubs(updated);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Removed unsubscribe for ${email}`, category: "campaign", entity: "unsubscribe", entityId: email, severity: "warning" });
    toast({ title: "Re-subscribed", description: email });
  }, [actor, user, toast]);

  const handleRemoveSmsOptOut = useCallback((phone: string) => {
    const updated = removeSmsOptOut(phone);
    setSmsOptOuts(updated);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Removed SMS opt-out for ${phone}`, category: "campaign", entity: "sms_optout", entityId: phone, severity: "warning" });
    toast({ title: "Re-opted in", description: phone });
  }, [actor, user, toast]);

  const handleSaveDrip = useCallback((seq: DripSequence) => {
    const updated = saveDripSequence(seq);
    setDripSequences(updated);
    setEditingDrip(null);
    setShowDripDialog(false);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Saved drip sequence "${seq.name}"`, category: "campaign", entity: "drip_sequence", entityId: seq.id, severity: "info" });
    toast({ title: "Drip sequence saved", description: seq.name });
  }, [actor, user, toast]);

  const handleDeleteDrip = useCallback((id: string, name: string) => {
    const updated = deleteDripSequence(id);
    setDripSequences(updated);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `Deleted drip sequence "${name}"`, category: "campaign", entity: "drip_sequence", entityId: id, severity: "warning" });
    toast({ title: "Drip sequence deleted", description: name });
  }, [actor, user, toast]);

  const handleToggleDrip = useCallback((id: string) => {
    const updated = toggleDripSequence(id);
    setDripSequences(updated);
    const seq = updated.find((s) => s.id === id);
    logAudit({ actor, actorId: user?.id ?? "unknown", action: `${seq?.active ? "Activated" : "Paused"} drip sequence "${seq?.name}"`, category: "campaign", entity: "drip_sequence", entityId: id, severity: "info" });
    toast({ title: seq?.active ? "Sequence activated" : "Sequence paused", description: seq?.name });
  }, [actor, user, toast]);

  const canManage = can("campaign:manage");

  // ── Viewing a single campaign ────────────────────────────────────
  if (viewingCamp) {
    const tpl = templates.find((t) => t.id === viewingCamp.templateId);
    return (
      <div className="space-y-6 p-6">
        <CampaignDetail campaign={viewingCamp} template={tpl} onBack={() => setViewingCamp(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Omnichannel Marketing"
        description="Build email and SMS campaigns, track engagement, manage opt-outs."
      />

      {/* Channel toggle */}
      <div className="flex items-center justify-between">
        <ChannelToggle channel={channel} onChange={(c) => { setChannel(c); setTab("campaigns"); }} />
        <Badge variant="outline" className="text-xs">
          {channel === "sms" ? (
            <><MessageSquare className="h-3 w-3 mr-1" /> SMS Mode</>
          ) : (
            <><Mail className="h-3 w-3 mr-1" /> Email Mode</>
          )}
        </Badge>
      </div>

      {/* Aggregate stats */}
      {channel === "email" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat icon={Mail} label="Total Sent" value={(aggStats as any).sent} color="bg-navy-100 text-navy-700" />
          <MiniStat icon={Eye} label="Open Rate" value={`${(aggStats as any).openRate}%`} color="bg-accent/15 text-accent-foreground" />
          <MiniStat icon={MousePointerClick} label="Click Rate" value={`${(aggStats as any).clickRate}%`} color="bg-navy-100 text-navy-700" />
          <MiniStat icon={Ban} label="Unsubscribes" value={(aggStats as any).unsubs} color="bg-destructive/10 text-destructive" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat icon={MessageSquare} label="Total Sent" value={(aggStats as any).sent} color="bg-accent/15 text-accent-foreground" />
          <MiniStat icon={CheckCircle2} label="Delivery Rate" value={`${(aggStats as any).deliveryRate}%`} color="bg-success/15 text-success" />
          <MiniStat icon={MousePointerClick} label="Click Rate" value={`${(aggStats as any).clickRate}%`} color="bg-navy-100 text-navy-700" />
          <MiniStat icon={Ban} label="Opt-Outs" value={(aggStats as any).optOuts} color="bg-destructive/10 text-destructive" />
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="campaigns">
            {channel === "sms" ? <MessageSquare className="h-4 w-4 mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />Templates
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <TrendingUp className="h-4 w-4 mr-2" />Tracking
          </TabsTrigger>
          <TabsTrigger value="optouts">
            <Ban className="h-4 w-4 mr-2" />{channel === "sms" ? "SMS Opt-Outs" : "Unsubscribes"}
          </TabsTrigger>
          <TabsTrigger value="drips">
            <Zap className="h-4 w-4 mr-2" />Drip Sequences
          </TabsTrigger>
        </TabsList>

        {/* ── Campaigns Tab ─────────────────────────────────────────── */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            {canManage && (
              <Dialog open={showCampDialog} onOpenChange={setShowCampDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setBuildingCamp(newCampaign(actor, channel)); setShowCampDialog(true); }}>
                    <Plus className="h-4 w-4 mr-1.5" />New {channel === "sms" ? "SMS" : "Email"} Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create {channel === "sms" ? "SMS" : "Email"} Campaign</DialogTitle>
                  </DialogHeader>
                  {buildingCamp && (
                    <CampaignBuilder
                      campaign={buildingCamp}
                      templates={templates}
                      onSave={handleSaveCampaign}
                      onCancel={() => { setBuildingCamp(null); setShowCampDialog(false); }}
                      onSend={handleSendCampaign}
                    />
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-3">
            {channelCampaigns.map((camp) => {
              const tpl = templates.find((t) => t.id === camp.templateId);
              return (
                <Card key={camp.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewingCamp(camp)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${camp.channel === "sms" ? "bg-accent/15 text-accent-foreground" : "bg-navy-100 text-navy-700"}`}>
                          {camp.channel === "sms" ? <MessageSquare className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {camp.name}
                            {camp.abTest?.enabled && (
                              <Badge variant="outline" className="text-xs border-accent/40 text-accent-foreground">
                                <FlaskConical className="h-3 w-3 mr-1" />
                                A/B
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tpl?.name ?? "No template"} · {audienceLabels[camp.audience]} · {camp.recipientCount} recipients
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {camp.status === "sent" && (
                          <div className="hidden md:flex items-center gap-4 text-sm">
                            {camp.channel === "sms" ? (
                              <>
                                <span className="text-muted-foreground">{camp.stats.delivered} delivered</span>
                                <span className="text-muted-foreground">{camp.stats.clicks} clicks</span>
                              </>
                            ) : (
                              <>
                                <span className="text-muted-foreground">{camp.stats.opens} opens</span>
                                <span className="text-muted-foreground">{camp.stats.clicks} clicks</span>
                              </>
                            )}
                          </div>
                        )}
                        {camp.scheduledFor && camp.status === "scheduled" && (
                          <span className="flex items-center gap-1 text-xs text-accent-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(camp.scheduledFor).toLocaleDateString()}
                          </span>
                        )}
                        <Badge className={statusColors[camp.status]}>{camp.status}</Badge>
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">⋯</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => setViewingCamp(camp)}>
                                <Eye className="h-3.5 w-3.5 mr-2" />View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setBuildingCamp(camp); setShowCampDialog(true); }}>
                                <Edit2 className="h-3.5 w-3.5 mr-2" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteCampaign(camp.id, camp.name)} className="text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {channelCampaigns.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No {channel.toUpperCase()} campaigns yet.</p>
            )}
          </div>
        </TabsContent>

        {/* ── Templates Tab ────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            {canManage && (
              <Button onClick={() => { setEditingTpl(newTemplate(channel)); setShowTplDialog(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />New {channel === "sms" ? "SMS" : "Email"} Template
              </Button>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {channelTemplates.map((tpl) => (
              <Card key={tpl.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {channel === "sms" ? `${tpl.bodyText.slice(0, 60)}...` : tpl.subject}
                      </p>
                    </div>
                    <Badge variant="outline">{tpl.category}</Badge>
                  </div>
                  {channel === "sms" ? (
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Hash className="h-3.5 w-3.5" />
                      {calculateSmsSegments(tpl.bodyText)} segment(s) · {tpl.bodyText.length} chars
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tpl.preheader}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingTpl(tpl); setShowTplDialog(true); }}>
                      <Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit
                    </Button>
                    {canManage && (
                      <Button variant="outline" size="sm" onClick={() => handleDeleteTemplate(tpl.id, tpl.name)} className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {channelTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8 col-span-2">No {channel.toUpperCase()} templates yet.</p>
            )}
          </div>

          {/* Template editor dialog */}
          <Dialog open={showTplDialog} onOpenChange={setShowTplDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTpl?.name === "Untitled Template" ? `New ${channel === "sms" ? "SMS" : "Email"} Template` : "Edit Template"}</DialogTitle>
              </DialogHeader>
              {editingTpl && channel === "sms" ? (
                <SmsTemplateEditor
                  template={editingTpl}
                  onSave={handleSaveTemplate}
                  onCancel={() => { setEditingTpl(null); setShowTplDialog(false); }}
                />
              ) : editingTpl ? (
                <EmailTemplateEditor
                  template={editingTpl}
                  onSave={handleSaveTemplate}
                  onCancel={() => { setEditingTpl(null); setShowTplDialog(false); }}
                />
              ) : null}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Tracking Tab ──────────────────────────────────────────── */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{channel === "sms" ? "SMS" : "Email"} Campaign Performance</CardTitle>
              <CardDescription>
                {channel === "sms" ? "Delivery and click rates across all sent SMS campaigns" : "Open and click rates across all sent email campaigns"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {channelCampaigns.filter((c) => c.status === "sent").map((camp) => {
                  const deliveryRate = camp.stats.sent > 0 ? (camp.stats.delivered / camp.stats.sent) * 100 : 0;
                  const openRate = camp.stats.sent > 0 ? (camp.stats.opens / camp.stats.sent) * 100 : 0;
                  const clickRate = camp.stats.sent > 0 ? (camp.stats.clicks / camp.stats.sent) * 100 : 0;
                  return (
                    <div key={camp.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{camp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {camp.stats.sent} sent · {channel === "sms" ? `${camp.stats.delivered} delivered` : `${camp.stats.opens} opens`} · {camp.stats.clicks} clicks
                        </p>
                      </div>
                      <div className="space-y-1">
                        {channel === "sms" ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-16 text-muted-foreground">Delivery</span>
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-success rounded-full transition-all" style={{ width: `${deliveryRate}%` }} />
                            </div>
                            <span className="text-xs font-medium w-12 text-right">{deliveryRate.toFixed(1)}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-16 text-muted-foreground">Open Rate</span>
                            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${openRate}%` }} />
                            </div>
                            <span className="text-xs font-medium w-12 text-right">{openRate.toFixed(1)}%</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-16 text-muted-foreground">Click Rate</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full bg-navy-500 rounded-full transition-all" style={{ width: `${clickRate}%` }} />
                          </div>
                          <span className="text-xs font-medium w-12 text-right">{clickRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {channelCampaigns.filter((c) => c.status === "sent").length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No sent {channel.toUpperCase()} campaigns yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Recipient Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {channelCampaigns.filter((c) => c.status === "sent").flatMap((c) =>
                  c.recipients
                    .filter((r) => r.status === "clicked" || r.status === "opened" || r.status === "delivered")
                    .map((r, i) => (
                      <div key={`${c.id}-${i}`} className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          {r.status === "clicked" ? <MousePointerClick className="h-4 w-4 text-accent-foreground" /> :
                           r.status === "opened" ? <Eye className="h-4 w-4 text-navy-500" /> :
                           <CheckCircle2 className="h-4 w-4 text-success" />}
                          <span className="font-medium">{r.name}</span>
                          <span className="text-xs text-muted-foreground">{c.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {r.clickedAt ? new Date(r.clickedAt).toLocaleString() :
                           r.openedAt ? new Date(r.openedAt).toLocaleString() :
                           r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : ""}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Opt-Outs Tab ──────────────────────────────────────────── */}
        <TabsContent value="optouts" className="space-y-4">
          {channel === "sms" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SMS Opt-Out List ({smsOptOuts.length})</CardTitle>
                <CardDescription>
                  Contacts who replied STOP to SMS marketing. They are automatically excluded from all future SMS campaigns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {smsOptOuts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No SMS opt-outs.</p>
                  ) : (
                    smsOptOuts.map((o) => (
                      <div key={o.phone} className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted/50 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <Ban className="h-4 w-4 text-destructive" />
                          <div>
                            <p className="font-medium">{o.phone}</p>
                            <p className="text-xs text-muted-foreground">
                              {o.reason} · {new Date(o.optedOutAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {canManage && (
                          <Button variant="outline" size="sm" onClick={() => handleRemoveSmsOptOut(o.phone)}>
                            Re-opt In
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Unsubscribe List ({unsubs.length})</CardTitle>
                <CardDescription>
                  Contacts who opted out of email marketing. They are automatically excluded from all future email campaigns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {unsubs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No unsubscribes.</p>
                  ) : (
                    unsubs.map((u) => (
                      <div key={u.email} className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted/50 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <Ban className="h-4 w-4 text-destructive" />
                          <div>
                            <p className="font-medium">{u.email}</p>
                            <p className="text-xs text-muted-foreground">
                              {u.reason} · {new Date(u.unsubscribedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {canManage && (
                          <Button variant="outline" size="sm" onClick={() => handleRemoveUnsub(u.email)}>
                            Re-subscribe
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Drip Sequences Tab ────────────────────────────────────── */}
        <TabsContent value="drips" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent-foreground" />
                Automated Lifecycle Drip Sequences
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Trigger email/SMS sequences on enrollment, renewal, lapse, and other lifecycle events.
              </p>
            </div>
            {canManage && (
              <Button onClick={() => { setEditingDrip(newDripSequence()); setShowDripDialog(true); }}>
                <Plus className="h-4 w-4 mr-1.5" />New Sequence
              </Button>
            )}
          </div>

          {/* Trigger legend */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(triggerLabels) as [LifecycleTrigger, string][]).map(([key, label]) => {
              const count = dripSequences.filter((s) => s.trigger === key).length;
              return (
                <Badge key={key} variant="outline" className="text-xs">
                  <Zap className="h-3 w-3 mr-1 text-accent-foreground" />
                  {label}
                  <span className="ml-1.5 text-muted-foreground">({count})</span>
                </Badge>
              );
            })}
          </div>

          {/* Sequence cards */}
          <div className="grid gap-4">
            {dripSequences.map((seq) => (
              <Card key={seq.id} className={seq.active ? "border-success/30" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${seq.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {seq.active ? <PlayCircle className="h-5 w-5" /> : <PauseCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{seq.name}</p>
                          <Badge variant="outline" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            {triggerLabels[seq.trigger]}
                          </Badge>
                          {seq.active ? (
                            <Badge className="bg-success/15 text-success text-xs">Active</Badge>
                          ) : (
                            <Badge className="bg-muted text-muted-foreground text-xs">Paused</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""} · {seq.steps.filter(s => s.channel === "email").length} email, {seq.steps.filter(s => s.channel === "sms").length} SMS
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleToggleDrip(seq.id)}>
                            {seq.active ? <><PauseCircle className="h-3.5 w-3.5 mr-1.5" />Pause</> : <><PlayCircle className="h-3.5 w-3.5 mr-1.5" />Activate</>}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setEditingDrip(seq); setShowDripDialog(true); }}>
                            <Edit2 className="h-3.5 w-3.5 mr-1.5" />Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteDrip(seq.id, seq.name)} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Step flow */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {seq.steps.map((step, i) => {
                      const tpl = templates.find((t) => t.id === step.templateId);
                      return (
                        <div key={step.id} className="flex items-center gap-2">
                          {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <div className="rounded-lg border border-border bg-card px-3 py-2 min-w-[140px]">
                            <div className="flex items-center gap-1.5 mb-1">
                              {step.channel === "sms" ? (
                                <MessageSquare className="h-3 w-3 text-accent-foreground" />
                              ) : (
                                <Mail className="h-3 w-3 text-navy-700" />
                              )}
                              <span className="text-xs font-medium">
                                {step.delayDays === 0 ? "Immediate" : `+${step.delayDays}d`}
                              </span>
                            </div>
                            <p className="text-xs text-foreground truncate">{step.subject}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{tpl?.name ?? "No template"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">{seq.enrolledCount}</p>
                        <p className="text-[10px] text-muted-foreground">Enrolled</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-sm font-semibold">{seq.completedCount}</p>
                        <p className="text-[10px] text-muted-foreground">Completed</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-navy-500" />
                      <div>
                        <p className="text-sm font-semibold">{seq.openRate}%</p>
                        <p className="text-[10px] text-muted-foreground">Open Rate</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MousePointerClick className="h-4 w-4 text-accent-foreground" />
                      <div>
                        <p className="text-sm font-semibold">{seq.clickRate}%</p>
                        <p className="text-[10px] text-muted-foreground">Click Rate</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {dripSequences.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No drip sequences yet. Create one to automate lifecycle outreach.</p>
            )}
          </div>

          {/* Drip sequence editor dialog */}
          <Dialog open={showDripDialog} onOpenChange={setShowDripDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingDrip?.name === "Untitled Sequence" ? "New Drip Sequence" : "Edit Drip Sequence"}</DialogTitle>
              </DialogHeader>
              {editingDrip && (
                <DripSequenceEditor
                  sequence={editingDrip}
                  templates={templates}
                  onSave={handleSaveDrip}
                  onCancel={() => { setEditingDrip(null); setShowDripDialog(false); }}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {/* Campaign builder dialog (for edit) */}
      <Dialog open={showCampDialog && !!buildingCamp} onOpenChange={setShowCampDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{buildingCamp?.status === "draft" && buildingCamp?.name !== "Untitled Campaign" ? "Edit Campaign" : `Create ${channel === "sms" ? "SMS" : "Email"} Campaign`}</DialogTitle>
          </DialogHeader>
          {buildingCamp && (
            <CampaignBuilder
              campaign={buildingCamp}
              templates={templates}
              onSave={handleSaveCampaign}
              onCancel={() => { setBuildingCamp(null); setShowCampDialog(false); }}
              onSend={handleSendCampaign}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
