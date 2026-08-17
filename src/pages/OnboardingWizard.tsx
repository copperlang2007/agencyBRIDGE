import { useState, useEffect, type FormEvent } from "react";
import { useRole, roleLabels, type RoleId } from "@/lib/roleContext";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ShieldCheck, CheckCircle2, ChevronRight, ChevronLeft, User2,
  Phone, Building2, Bell, Sparkles, MapPin, FileText, PhoneCall,
  CalendarClock, Users, DollarSign, Lock, Loader2,
} from "lucide-react";
import { logAudit } from "@/lib/auditLog";

const TOTAL_STEPS = 6;

interface OnboardingData {
  fullName: string;
  phone: string;
  state: string;
  zipCode: string;
  carriers: string[];
  ahipStatus: "completed" | "in_progress" | "not_started";
  notificationPrefs: {
    email: boolean;
    sms: boolean;
    renewals: boolean;
    compliance: boolean;
    commissions: boolean;
  };
  responseStyle: "concise" | "balanced" | "detailed" | "bullets";
  tourCompleted: boolean;
}

const CARRIER_OPTIONS = [
  "UnitedHealthcare", "Humana", "Aetna", "WellCare", "BCBS",
  "Cigna", "Kaiser Permanente", "Devoted Health", "Clover Health",
  "Molina Healthcare", "Alignment Health", "Centene",
];

const FEATURE_TOUR = [
  { icon: Users, title: "Clients CRM", desc: "Manage leads and clients with two-way SMS/email timelines." },
  { icon: PhoneCall, title: "Softphone Dialer", desc: "Inbound/outbound calls with live transcription and voicemail drops." },
  { icon: CalendarClock, title: "Calendar", desc: "Book and track client appointments with calendar views." },
  { icon: DollarSign, title: "Commissions", desc: "Track policies, carrier commissions, and reconciliation." },
  { icon: FileText, title: "Compliance", desc: "AHIP, carrier appointments, and certification tracking." },
  { icon: Sparkles, title: "AI Agent Assist", desc: "Floating RAG assistant for Medicare knowledge and compliance." },
];

export default function OnboardingWizard() {
  const { user, role } = useRole();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fullName: user?.name ?? "",
    phone: "",
    state: "",
    zipCode: "",
    carriers: [],
    ahipStatus: "not_started",
    notificationPrefs: {
      email: true,
      sms: false,
      renewals: true,
      compliance: true,
      commissions: true,
    },
    responseStyle: "concise",
    tourCompleted: false,
  });

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const update = <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCarrier = (carrier: string) => {
    setData((prev) => ({
      ...prev,
      carriers: prev.carriers.includes(carrier)
        ? prev.carriers.filter((c) => c !== carrier)
        : [...prev.carriers, carrier],
    }));
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleComplete = async () => {
    setSubmitting(true);
    // Simulate saving onboarding data
    await new Promise((r) => setTimeout(r, 800));
    try {
      localStorage.setItem("onboarding_completed", JSON.stringify({ ...data, completedAt: new Date().toISOString() }));
    } catch { /* ignore */ }
    // Wrap audit log in try/catch so a logging error never blocks completion
    try {
      logAudit({
        actor: user?.name ?? "unknown",
        actorId: user?.id ?? "unknown",
        action: "ONBOARDING_COMPLETED",
        category: "auth",
        entity: "user",
        entityId: user?.id ?? "unknown",
        severity: "info",
        details: `${user?.name ?? "User"} completed onboarding wizard (${role ? roleLabels[role] : "Unknown"}) — ${data.carriers.length} carriers, AHIP: ${data.ahipStatus}`,
      });
    } catch { /* audit logging failure should never block onboarding */ }
    setSubmitting(false);
    // Reset URL to root so BrowserRouter matches the Dashboard route
    // (the wizard renders outside of BrowserRouter, so the URL may still be /login)
    window.history.replaceState({}, "", "/");
    // Mark wizard complete — App will route to dashboard.
    setTimeout(() => window.dispatchEvent(new Event("onboarding-done")), 0);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 mb-3">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Welcome to agencyBRIDGE</h1>
          <p className="text-sm text-blue-200/70 mt-1">
            Let's set up your workspace — this takes about 2 minutes
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-5 px-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-200/80">
              Step {step + 1} of {TOTAL_STEPS}
            </span>
            <span className="text-xs text-blue-200/50">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-white/10" />
        </div>

        <Card className="border-white/10 bg-white/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-3">
            {/* Step indicator pills */}
            <div className="flex gap-1.5 mb-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-8 bg-blue-600" : i < step ? "w-4 bg-blue-400" : "w-4 bg-muted"
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {/* ── Step 0: Profile ── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <User2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">Your Profile</h2>
                    <CardDescription>Confirm your name and contact details</CardDescription>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="fullName"
                    value={data.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="Your full name"
                    className="max-w-md"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </Label>
                    <Input
                      id="phone"
                      value={data.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> State
                    </Label>
                    <Input
                      id="state"
                      value={data.state}
                      onChange={(e) => update("state", e.target.value)}
                      placeholder="TX"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-sm font-medium">ZIP Code</Label>
                  <Input
                    id="zip"
                    value={data.zipCode}
                    onChange={(e) => update("zipCode", e.target.value)}
                    placeholder="75001"
                    maxLength={5}
                    className="max-w-[200px]"
                  />
                </div>
              </div>
            )}

            {/* ── Step 1: Carrier Appointments ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">Carrier Appointments</h2>
                    <CardDescription>
                      Select carriers you're appointed with — we'll configure portals and certifications
                    </CardDescription>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {CARRIER_OPTIONS.map((carrier) => (
                    <label
                      key={carrier}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${
                        data.carriers.includes(carrier)
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                          : "border-border hover:border-blue-300 hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={data.carriers.includes(carrier)}
                        onCheckedChange={() => toggleCarrier(carrier)}
                      />
                      <span className="text-sm font-medium text-foreground">{carrier}</span>
                    </label>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground pt-1">
                  {data.carriers.length} carrier{data.carriers.length !== 1 ? "s" : ""} selected
                </p>
              </div>
            )}

            {/* ── Step 2: AHIP & Compliance ── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Lock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">AHIP & Compliance</h2>
                    <CardDescription>Annual certification status for the current plan year</CardDescription>
                  </div>
                </div>

                <RadioGroup
                  value={data.ahipStatus}
                  onValueChange={(v) => update("ahipStatus", v as OnboardingData["ahipStatus"])}
                  className="space-y-2.5"
                >
                  <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    data.ahipStatus === "completed" ? "border-success bg-success/5 ring-1 ring-success/20" : "border-border hover:bg-muted/50"
                  }`}>
                    <RadioGroupItem value="completed" className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-semibold text-foreground">AHIP Completed</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        I've completed AHIP certification for the current plan year
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    data.ahipStatus === "in_progress" ? "border-warning bg-warning/5 ring-1 ring-warning/20" : "border-border hover:bg-muted/50"
                  }`}>
                    <RadioGroupItem value="in_progress" className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 text-warning" />
                        <span className="text-sm font-semibold text-foreground">In Progress</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        I'm currently working on AHIP modules — we'll add this as an open task
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    data.ahipStatus === "not_started" ? "border-destructive bg-destructive/5 ring-1 ring-destructive/20" : "border-border hover:bg-muted/50"
                  }`}>
                    <RadioGroupItem value="not_started" className="mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-semibold text-foreground">Not Started</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        I haven't started yet — we'll flag this as a high-priority task
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            {/* ── Step 3: Notifications ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">Notifications</h2>
                    <CardDescription>Choose how you want to be alerted</CardDescription>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Email notifications</p>
                      <p className="text-xs text-muted-foreground">Daily digest and important alerts</p>
                    </div>
                    <Checkbox
                      checked={data.notificationPrefs.email}
                      onCheckedChange={(v) => update("notificationPrefs", { ...data.notificationPrefs, email: !!v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">SMS alerts</p>
                      <p className="text-xs text-muted-foreground">Time-sensitive reminders via text</p>
                    </div>
                    <Checkbox
                      checked={data.notificationPrefs.sms}
                      onCheckedChange={(v) => update("notificationPrefs", { ...data.notificationPrefs, sms: !!v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Renewal reminders</p>
                      <p className="text-xs text-muted-foreground">AEP, OEP, and policy renewal deadlines</p>
                    </div>
                    <Checkbox
                      checked={data.notificationPrefs.renewals}
                      onCheckedChange={(v) => update("notificationPrefs", { ...data.notificationPrefs, renewals: !!v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Compliance deadlines</p>
                      <p className="text-xs text-muted-foreground">AHIP, carrier certs, and W-9 reminders</p>
                    </div>
                    <Checkbox
                      checked={data.notificationPrefs.compliance}
                      onCheckedChange={(v) => update("notificationPrefs", { ...data.notificationPrefs, compliance: !!v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3.5">
                    <div>
                      <p className="text-sm font-medium text-foreground">Commission updates</p>
                      <p className="text-xs text-muted-foreground">New payments, variances, and dispute status</p>
                    </div>
                    <Checkbox
                      checked={data.notificationPrefs.commissions}
                      onCheckedChange={(v) => update("notificationPrefs", { ...data.notificationPrefs, commissions: !!v })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: AI Assistant preference ── */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">AI Assistant Style</h2>
                    <CardDescription>How should your Agent Assist respond?</CardDescription>
                  </div>
                </div>

                <RadioGroup
                  value={data.responseStyle}
                  onValueChange={(v) => update("responseStyle", v as OnboardingData["responseStyle"])}
                  className="grid grid-cols-2 gap-2.5"
                >
                  {([
                    { value: "concise", label: "Concise", desc: "Short, direct. 2-3 sentences max." },
                    { value: "balanced", label: "Balanced", desc: "Full answer with related topics linked." },
                    { value: "detailed", label: "Detailed", desc: "Complete answer with all context." },
                    { value: "bullets", label: "Bullet Points", desc: "Key points as a bulleted list." },
                  ] as const).map((opt) => (
                    <label
                      key={opt.value}
                      className={`rounded-lg border p-3.5 cursor-pointer transition-all ${
                        data.responseStyle === opt.value
                          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={opt.value} className="sr-only" />
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </label>
                  ))}
                </RadioGroup>

                <p className="text-xs text-muted-foreground pt-1">
                  You can change this anytime from the Agent Assist settings panel.
                </p>
              </div>
            )}

            {/* ── Step 5: Feature Tour ── */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">You're all set!</h2>
                    <CardDescription>Here's what you can do with agencyBRIDGE</CardDescription>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FEATURE_TOUR.map((f) => (
                    <div key={f.title} className="flex items-start gap-3 rounded-lg border border-border p-3.5 bg-muted/30">
                      <div className="p-2 rounded-lg bg-blue-50 shrink-0">
                        <f.icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{f.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mt-2">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Your AI Agent Assist is available on every page
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Click the floating assistant button (bottom-right) to ask about Medicare rules,
                        carrier details, election periods, and compliance — with voice input support.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-5 mt-2 border-t border-border/60">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={step === 0}
                className="text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              {step < TOTAL_STEPS - 1 ? (
                <Button
                  onClick={handleNext}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                >
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Enter Dashboard
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-blue-200/50 mt-5">
          Signed in as {user?.name ?? "User"} · {role ? roleLabels[role] : "Unknown"} · All actions are audit-logged
        </p>
      </div>
    </div>
  );
}
