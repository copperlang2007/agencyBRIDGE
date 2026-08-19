import { useState, type FormEvent } from "react";
import { useRole } from "@/lib/roleContext";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, Loader2, AlertCircle, Eye, EyeOff, PlayCircle } from "lucide-react";
import { BrandMark } from "@/components/shared/BrandMark";
import { Checkbox } from "@/components/ui/checkbox";
import { roleLabels, type RoleId } from "@/lib/permissions";

/** Roles the demo can be explored as, in the order they make sense to a visitor. */
const DEMO_ROLES: RoleId[] = ["admin", "supervisor", "agent", "retention", "readonly"];

export default function LoginPage() {
  const { login, enterDemo } = useRole();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // The demo gate. Entering is a deliberate act with an acknowledgement, not
  // the state the app falls into when nobody signs in — the server refuses the
  // request without it, so this checkbox is the gate rather than a label about
  // one.
  const [demoRole, setDemoRole] = useState<RoleId>("admin");
  const [acknowledged, setAcknowledged] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    setError(null);
    setDemoLoading(true);
    const result = await enterDemo(demoRole);
    if (!result.success) {
      setError(result.error || "Could not open the demo.");
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || "Login failed. Please try again.");
      setLoading(false);
    }
    // On success, RoleProvider state change re-renders App → routes to dashboard
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 p-4">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <BrandMark size={64} tone="light" className="mx-auto mb-4 shadow-lg shadow-blue-500/30 rounded-2xl" />
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">agencyBRIDGE</h1>
          <p className="text-sm text-blue-200/70 mt-1">Medicare Agency Management Platform</p>
        </div>

        <Card className="border-white/10 bg-white/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <h2 className="text-xl font-display font-bold text-foreground">Sign in to your account</h2>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <span className="text-destructive">{error}</span>
                </div>
              )}
              {info && (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/5 px-3.5 py-3 text-sm">
                  <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <span className="text-blue-700">{info}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@agencybridge.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    onClick={() => setInfo("Contact your administrator to reset your password.")}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/20"
                disabled={loading || demoLoading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Security notice */}
            <div className="mt-6 pt-4 border-t border-border/60">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Credentials are managed by your agency administrator. All login attempts are audit-logged and monitored.
              </p>
            </div>

            {/* ── Demo gate ────────────────────────────────────────────── */}
            <div className="mt-6 pt-5 border-t border-border/60">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-foreground">Explore the demo</h3>
                <span className="text-[11px] font-medium uppercase tracking-wide text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                  Read-only
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                A sample agency with invented clients, policies and commissions. No real
                beneficiary data, and nothing you do here changes it.
              </p>

              <Label htmlFor="demo-role" className="text-xs font-medium text-foreground">
                Sign in as
              </Label>
              <select
                id="demo-role"
                value={demoRole}
                onChange={(e) => setDemoRole(e.target.value as RoleId)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {DEMO_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>

              <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <Checkbox
                  id="demo-ack"
                  checked={acknowledged}
                  onCheckedChange={(v) => setAcknowledged(v === true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I understand this is sample data, not a live agency, and that changes are disabled.
                </span>
              </label>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-3"
                // Also disabled while a credential sign-in is in flight: two
                // concurrent requests both set the same session state, and
                // whichever answered last would decide who you are signed in as.
                disabled={!acknowledged || demoLoading || loading}
                onClick={handleDemo}
              >
                {demoLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening demo...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Enter demo as {roleLabels[demoRole]}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-blue-200/50 mt-6">
          SOC 2 evidence tracking · All actions are audit-logged
        </p>
      </div>
    </div>
  );
}
