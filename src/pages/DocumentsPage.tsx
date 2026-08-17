import { useState, useEffect, useMemo } from "react";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText, Upload, Search, Download, Eye, History, FolderOpen,
  FileCheck, FileX, FileClock, Lock,
} from "lucide-react";
import { mockClientDocuments, type ClientDocument } from "@/lib/workflowData";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, React.ElementType> = {
  "Enrollment Form": FileCheck,
  "SOA": FileText,
  "Medical Record": FileText,
  "Carrier Correspondence": FileText,
  "EOB": FileText,
  "Tax Document": FileText,
  "Authorization": FileText,
  "Other": FolderOpen,
};

export default function DocumentsPage() {
  const { user } = useRole();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_documents", category: "system", entity: "Document Management", severity: "info" });
  }, [user]);

  const visibleDocs = useMemo(() => {
    let docs = mockClientDocuments;
    if (user?.role === "agent") docs = docs.filter(d => d.agentName === user.name);
    if (filterCat !== "all") docs = docs.filter(d => d.category === filterCat);
    if (search) docs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.clientName.toLowerCase().includes(search.toLowerCase()));
    return docs;
  }, [user, search, filterCat]);

  const categories = ["all", "Enrollment Form", "SOA", "Medical Record", "Carrier Correspondence", "EOB", "Tax Document", "Authorization", "Other"];

  return (
    <div className="space-y-6">
      <PageHeader title="Document Management" description="Secure client document storage with version history, access logging, and role-based access control" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-accent" /><span className="text-xs text-muted-foreground">Total Documents</span></div>
          <div className="text-2xl font-bold">{mockClientDocuments.length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><FileCheck className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Enrollment Forms</span></div>
          <div className="text-2xl font-bold">{mockClientDocuments.filter(d => d.category === "Enrollment Form").length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><History className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">With Versions</span></div>
          <div className="text-2xl font-bold">{mockClientDocuments.filter(d => d.version > 1).length}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-1"><Lock className="h-4 w-4 text-navy-600" /><span className="text-xs text-muted-foreground">Access Logged</span></div>
          <div className="text-2xl font-bold">{mockClientDocuments.filter(d => d.accessLog.length > 0).length}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Client Documents</CardTitle>
              <CardDescription>Secure storage with version history and access audit trail</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowUpload(!showUpload)}><Upload className="h-4 w-4 mr-1" /> Upload</Button>
          </div>
        </CardHeader>
        <CardContent>
          {showUpload && (
            <div className="mb-4 rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-accent/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 10MB · PHI-encrypted at rest</p>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="max-w-xs" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilterCat(cat)}
                  className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors capitalize",
                    filterCat === cat ? "bg-accent text-accent-foreground border-accent" : "border-border text-muted-foreground hover:bg-muted/50")}>
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {visibleDocs.map((doc) => <DocRow key={doc.id} doc={doc} />)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DocRow({ doc }: { doc: ClientDocument }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = categoryIcons[doc.category] || FileText;
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-3 hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4 text-muted-foreground" /></div>
          <div>
            <div className="text-sm font-medium">{doc.name}</div>
            <div className="text-xs text-muted-foreground">{doc.clientName} · {doc.category} · {doc.fileSizeKB}KB · v{doc.version}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}</span>
          <Button variant="ghost" size="sm" className="h-7"><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="sm" className="h-7"><Download className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Version History</div>
            <div className="space-y-1">
              {doc.versionHistory.map((v, i) => (
                <div key={i} className="text-xs flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">v{v.version}</Badge>
                  <span className="text-muted-foreground">{format(new Date(v.uploadedAt), "MMM d, yyyy")}</span>
                  <span>{v.note}</span>
                  <span className="text-muted-foreground">— {v.uploadedBy}</span>
                </div>
              ))}
            </div>
          </div>
          {doc.accessLog.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Access Log</div>
              <div className="space-y-1">
                {doc.accessLog.map((a, i) => (
                  <div key={i} className="text-xs flex items-center gap-2">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{format(new Date(a.timestamp), "MMM d HH:mm")}</span>
                    <span>{a.accessedBy}</span>
                    <Badge variant="outline" className="text-[10px]">{a.action}</Badge>
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
