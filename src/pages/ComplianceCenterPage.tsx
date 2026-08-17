import { useState, useEffect, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ShieldAlert, FileSignature, PhoneCall, Lock, CheckCircle2, XCircle,
  Clock, AlertTriangle, FileText, Plus, Search, Download, Eye,
} from "lucide-react";
import {
  TPMO_DISCLAIMER, LANGUAGE_ASSISTANCE_NOTICE, PEWC_DISCLOSURE,
  mockSOAs, mockPEWCs, mockCallRecordings, mockEnrollmentDocs,
  type SOARecord, type PEWCRecord, type CallRecordingRecord, type EnrollmentDoc,
} from "@/lib/complianceData";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function ComplianceCenterPage() {
  const { user } = useRole();
  const [tab, setTab] = useState("soa");

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_compliance_center", category: "compliance", entity: "Compliance Center", severity: "info" });
  }, [user]);

  const stats = useMemo(() => ({
    soaPending: mockSOAs.filter(s => s.signatureStatus === "pending").length,
    soaExpired: mockSOAs.filter(s => s.signatureStatus === "expired").length,
    soaSigned: mockSOAs.filter(s => s.signatureStatus === "signed").length,
    pewcActive: mockPEWCs.filter(p => p.consentGiven && p.status === "active").length,
    pewcDenied: mockPEWCs.filter(p => !p.consentGiven).length,
    pewcWithdrawn: mockPEWCs.filter(p => p.status === "withdrawn").length,
    recordingsStored: mockCallRecordings.filter(r => r.storageStatus === "stored").length,
    recordingsProcessing: mockCallRecordings.filter(r => r.storageStatus === "processing").length,
    recordingsTotalRetention: mockCallRecordings.length,
    docsSigned: mockEnrollmentDocs.filter(d => d.status === "signed" || d.status === "submitted" || d.status === "carrier_approved").length,
    docsPending: mockEnrollmentDocs.filter(d => d.status === "draft" || d.status === "sent").length,
    docsApproved: mockEnrollmentDocs.filter(d => d.status === "carrier_approved").length,
  }), []);

  return (
    <div className="space-y-6">
      <PageHeader title="Compliance Center" description="TPMO compliance: SOA tracking, PEWC capture, call recording retention, and e-signature enrollment documents" />

      {/* TPMO Disclaimer Banner */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">CMS TPMO Required Disclaimer</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">{TPMO_DISCLAIMER}</p>
              <p className="text-[10px] text-muted-foreground mt-2 italic">{LANGUAGE_ASSISTANCE_NOTICE}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileSignature className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">SOA Tracking</span>
            </div>
            <div className="text-2xl font-bold">{stats.soaSigned}</div>
            <div className="text-xs text-muted-foreground">{stats.soaPending} pending · {stats.soaExpired} expired</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">PEWC Capture</span>
            </div>
            <div className="text-2xl font-bold">{stats.pewcActive}</div>
            <div className="text-xs text-muted-foreground">{stats.pewcDenied} denied · {stats.pewcWithdrawn} withdrawn</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <PhoneCall className="h-4 w-4 text-navy-600" />
              <span className="text-xs text-muted-foreground">Call Retention (10yr)</span>
            </div>
            <div className="text-2xl font-bold">{stats.recordingsStored}</div>
            <div className="text-xs text-muted-foreground">{stats.recordingsProcessing} processing</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">E-Signature Docs</span>
            </div>
            <div className="text-2xl font-bold">{stats.docsSigned}</div>
            <div className="text-xs text-muted-foreground">{stats.docsPending} pending · {stats.docsApproved} approved</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="soa">SOA Tracking</TabsTrigger>
          <TabsTrigger value="pewc">PEWC Capture</TabsTrigger>
          <TabsTrigger value="recordings">Call Retention</TabsTrigger>
          <TabsTrigger value="esign">E-Signature</TabsTrigger>
        </TabsList>

        {/* SOA Tab */}
        <TabsContent value="soa">
          <SOATab />
        </TabsContent>

        {/* PEWC Tab */}
        <TabsContent value="pewc">
          <PEWCTab />
        </TabsContent>

        {/* Call Recordings Tab */}
        <TabsContent value="recordings">
          <RecordingsTab />
        </TabsContent>

        {/* E-Signature Tab */}
        <TabsContent value="esign">
          <ESignTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── SOA Tab ──────────────────────────────────────────────────────────
function SOATab() {
  const [showCreate, setShowCreate] = useState(false);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scope of Appointment Records</CardTitle>
            <CardDescription>CMS requires a documented SOA before every Medicare Advantage sales appointment (42 CFR §422.2267)</CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> New SOA</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockSOAs.map((soa) => <SOARow key={soa.id} soa={soa} />)}
        </div>
      </CardContent>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Scope of Appointment</DialogTitle>
            <DialogDescription>Document beneficiary consent before conducting a Medicare sales appointment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select the products that will be discussed during the appointment:</p>
            {["Medicare Advantage (MA)", "Medicare Advantage Prescription Drug (MAPD)", "Medicare Supplement (Medigap)", "Part D Prescription Drug", "Hospital Indemnity", "Final Expense", "Dental/Vision/Hearing"].map(p => (
              <label key={p} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" /> {p}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => setShowCreate(false)}>Create SOA</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SOARow({ soa }: { soa: SOARecord }) {
  const statusConfig = {
    signed: { color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle2, label: "Signed" },
    pending: { color: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock, label: "Pending" },
    expired: { color: "text-red-600 bg-red-50 border-red-200", icon: XCircle, label: "Expired" },
  };
  const cfg = statusConfig[soa.signatureStatus];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-full p-1.5 border", cfg.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-medium">{soa.clientName}</div>
          <div className="text-xs text-muted-foreground">Agent: {soa.agentName} · Appt: {format(new Date(soa.appointmentDate), "MMM d, yyyy")}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            {soa.productsDiscussed.map(p => (
              <Badge key={p} variant="outline" className="text-[10px] font-normal">{p}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge variant="outline" className={cn("text-xs", cfg.color)}>{cfg.label}</Badge>
          <div className="text-[10px] text-muted-foreground mt-1">Expires {format(new Date(soa.expiresAt), "MMM d")}</div>
        </div>
      </div>
    </div>
  );
}

// ── PEWC Tab ─────────────────────────────────────────────────────────
function PEWCTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prior Express Written Consent</CardTitle>
        <CardDescription>Required before sharing beneficiary info with another TPMO or agent (effective Oct 1, 2024). Pre-checked boxes and blanket consent do NOT qualify.</CardDescription>
      </CardHeader>
      <CardContent>
        <Card className="border-blue-500/20 bg-blue-500/5 mb-4">
          <CardContent className="pt-4">
            <p className="text-xs text-blue-900 leading-relaxed">{PEWC_DISCLOSURE}</p>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {mockPEWCs.map((pewc) => <PEWCRow key={pewc.id} pewc={pewc} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function PEWCRow({ pewc }: { pewc: PEWCRecord }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-full p-1.5 border", pewc.consentGiven ? "text-green-600 bg-green-50 border-green-200" : "text-red-600 bg-red-50 border-red-200")}>
          {pewc.consentGiven ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        </div>
        <div>
          <div className="text-sm font-medium">{pewc.clientName}</div>
          <div className="text-xs text-muted-foreground">Agent: {pewc.agentName} · {format(new Date(pewc.consentTimestamp), "MMM d, yyyy")}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Response: <span className="italic">"{pewc.consentResponse}"</span></div>
        </div>
      </div>
      <div className="text-right">
        {pewc.consentGiven ? (
          <Badge variant="outline" className="text-xs text-green-600 border-green-200">Consent Given</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-red-600 border-red-200">Consent Denied</Badge>
        )}
        {pewc.status === "withdrawn" && (
          <div className="text-[10px] text-amber-600 mt-1">Withdrawn {formatDistanceToNow(new Date(pewc.withdrawnAt!), { addSuffix: true })}</div>
        )}
        {pewc.consentGiven && pewc.status === "active" && (
          <div className="text-[10px] text-muted-foreground mt-1">Shared: {pewc.contactInfoShared}</div>
        )}
      </div>
    </div>
  );
}

// ── Call Recordings Tab ──────────────────────────────────────────────
function RecordingsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Recording Retention</CardTitle>
        <CardDescription>CMS requires TPMO sales call recordings to be retained for 10 years. All recordings are encrypted, access-logged, and chain-of-custody tracked.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockCallRecordings.map((rec) => <RecordingRow key={rec.id} rec={rec} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function RecordingRow({ rec }: { rec: CallRecordingRecord }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = {
    stored: { color: "text-green-600 bg-green-50 border-green-200", label: "Stored" },
    processing: { color: "text-amber-600 bg-amber-50 border-amber-200", label: "Processing" },
    failed: { color: "text-red-600 bg-red-50 border-red-200", label: "Failed" },
  };
  const cfg = statusConfig[rec.storageStatus];
  const mins = Math.floor(rec.durationSec / 60);
  const secs = rec.durationSec % 60;
  return (
    <div className="rounded-lg border">
      <button className="w-full flex items-center justify-between p-3 hover:bg-muted/30" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <PhoneCall className="h-4 w-4 text-navy-600" />
          <div>
            <div className="text-sm font-medium">{rec.clientName} · {rec.agentName}</div>
            <div className="text-xs text-muted-foreground">{format(new Date(rec.date), "MMM d, yyyy · h:mm a")} · {mins}m {secs}s · {rec.fileSizeMB}MB</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", cfg.color)}>{cfg.label}</Badge>
          {rec.encryptionStatus === "encrypted" ? (
            <Lock className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Retention</div>
            <div className="text-xs">Expires: {format(new Date(rec.retentionExpires), "MMM d, yyyy")} (10-year CMS requirement)</div>
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Chain of Custody</div>
            <div className="space-y-1">
              {rec.chainOfCustody.map((c, i) => (
                <div key={i} className="text-xs flex items-center gap-2">
                  <span className="text-muted-foreground">{format(new Date(c.timestamp), "MMM d HH:mm")}</span>
                  <span>{c.action}</span>
                  <span className="text-muted-foreground">— {c.actor}</span>
                </div>
              ))}
            </div>
          </div>
          {rec.accessLog.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Access Log</div>
              <div className="space-y-1">
                {rec.accessLog.map((a, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{format(new Date(a.timestamp), "MMM d HH:mm")}</span>
                    <span>{a.accessedBy}</span>
                    <span className="text-muted-foreground">— {a.purpose}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── E-Signature Tab ──────────────────────────────────────────────────
function ESignTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment Documents & E-Signature</CardTitle>
        <CardDescription>Generate, send, and track signed enrollment applications, SOAs, and authorization forms with audit trail.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockEnrollmentDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function DocRow({ doc }: { doc: EnrollmentDoc }) {
  const statusConfig = {
    draft: { color: "text-muted-foreground bg-muted/50 border-border", label: "Draft" },
    sent: { color: "text-blue-600 bg-blue-50 border-blue-200", label: "Sent" },
    signed: { color: "text-green-600 bg-green-50 border-green-200", label: "Signed" },
    submitted: { color: "text-purple-600 bg-purple-50 border-purple-200", label: "Submitted" },
    carrier_approved: { color: "text-green-700 bg-green-100 border-green-300", label: "Carrier Approved" },
    rejected: { color: "text-red-600 bg-red-50 border-red-200", label: "Rejected" },
  };
  const cfg = statusConfig[doc.status];
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{doc.clientName} — {doc.docType}</div>
          <div className="text-xs text-muted-foreground">{doc.carrier} · {doc.planType} · Created {format(new Date(doc.createdAt), "MMM d")}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Badge variant="outline" className={cn("text-xs", cfg.color)}>{cfg.label}</Badge>
          <div className="text-[10px] text-muted-foreground mt-1">{doc.signatureCount}/{doc.requiredSignatures} signatures</div>
        </div>
      </div>
    </div>
  );
}
