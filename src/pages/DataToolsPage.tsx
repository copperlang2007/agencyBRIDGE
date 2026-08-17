import { useState, useCallback, useRef } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRole } from "@/lib/roleContext";
import { useToast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/auditLog";
import { clients, policies, type Client, type Policy, type PlanType, type ClientStatus, type PolicyStatus, type LeadSource } from "@/lib/mockData";
import { scopedClients, scopedPolicies } from "@/lib/dataScope";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  FileDown,
  FileUp,
  ClipboardCheck,
} from "lucide-react";

// ── CSV helpers ────────────────────────────────────────────────────

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ",") {
          result.push(current);
          current = "";
        } else current += ch;
      }
    }
    result.push(current);
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Column definitions ─────────────────────────────────────────────

const clientHeaders = [
  "id", "name", "email", "phone", "status", "planType", "carrier",
  "enrollmentDate", "renewalDate", "premium", "commission", "agent", "age", "zip", "leadSource", "notes",
];

const policyHeaders = [
  "id", "client", "carrier", "planType", "status", "premium", "commission",
  "effectiveDate", "renewalDate", "agent",
];

const validPlanTypes: PlanType[] = ["MA", "MAPD", "CSNP", "DSNP", "MED SUPP", "PART D", "HOSPITAL INDEMNITY", "FINAL EXPENSE", "OTHER"];
const validClientStatuses: ClientStatus[] = ["Active", "Pending", "Lapsed", "Prospect"];
const validPolicyStatuses: PolicyStatus[] = ["Active", "Pending", "Lapsed", "Cancelled"];
const validLeadSources: LeadSource[] = ["Referral", "Online", "Walk-in", "Phone", "Event"];

// ── Validation ─────────────────────────────────────────────────────

interface ImportResult {
  total: number;
  valid: number;
  errors: number;
  warnings: number;
  errorRows: { row: number; field: string; message: string; value: string }[];
  warningRows: { row: number; field: string; message: string }[];
  data: Record<string, string>[];
}

function validateClientRow(row: Record<string, string>, rowNum: number): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.name?.trim()) errors.push("name is required");
  if (!row.email?.trim()) errors.push("email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push("invalid email format");
  if (!row.phone?.trim()) warnings.push("phone is empty");
  if (row.status && !validClientStatuses.includes(row.status as ClientStatus)) errors.push(`invalid status: "${row.status}"`);
  if (row.planType && !validPlanTypes.includes(row.planType as PlanType)) errors.push(`invalid planType: "${row.planType}"`);
  if (row.leadSource && !validLeadSources.includes(row.leadSource as LeadSource)) warnings.push(`invalid leadSource: "${row.leadSource}"`);
  if (row.premium && isNaN(Number(row.premium))) errors.push("premium must be numeric");
  if (row.commission && isNaN(Number(row.commission))) errors.push("commission must be numeric");
  if (row.age && (isNaN(Number(row.age)) || Number(row.age) < 0)) errors.push("age must be a positive number");
  if (!row.agent?.trim()) warnings.push("agent is empty");

  return { errors, warnings };
}

function validatePolicyRow(row: Record<string, string>, rowNum: number): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.client?.trim()) errors.push("client is required");
  if (!row.carrier?.trim()) errors.push("carrier is required");
  if (!row.planType?.trim()) errors.push("planType is required");
  else if (!validPlanTypes.includes(row.planType as PlanType)) errors.push(`invalid planType: "${row.planType}"`);
  if (row.status && !validPolicyStatuses.includes(row.status as PolicyStatus)) errors.push(`invalid status: "${row.status}"`);
  if (row.premium && isNaN(Number(row.premium))) errors.push("premium must be numeric");
  if (row.commission && isNaN(Number(row.commission))) errors.push("commission must be numeric");
  if (!row.agent?.trim()) warnings.push("agent is empty");

  return { errors, warnings };
}

function processImport(text: string, type: "clients" | "policies"): ImportResult {
  const { headers, rows } = parseCSV(text);
  const expectedHeaders = type === "clients" ? clientHeaders : policyHeaders;
  const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h));

  const result: ImportResult = {
    total: rows.length,
    valid: 0,
    errors: 0,
    warnings: 0,
    errorRows: [],
    warningRows: [],
    data: [],
  };

  if (missingHeaders.length > 0) {
    result.errorRows.push({
      row: 0,
      field: "headers",
      message: `Missing required columns: ${missingHeaders.join(", ")}`,
      value: "",
    });
    result.errors = 1;
    return result;
  }

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexed
    const validation = type === "clients" ? validateClientRow(row, rowNum) : validatePolicyRow(row, rowNum);

    if (validation.errors.length > 0) {
      result.errors++;
      validation.errors.forEach((msg) => {
        const fieldMatch = msg.match(/^(\w+)/);
        result.errorRows.push({
          row: rowNum,
          field: fieldMatch ? fieldMatch[1] : "unknown",
          message: msg,
          value: row[fieldMatch?.[1] ?? ""] ?? "",
        });
      });
    } else {
      result.valid++;
      result.data.push(row);
    }

    if (validation.warnings.length > 0) {
      result.warnings++;
      validation.warnings.forEach((msg) => {
        const fieldMatch = msg.match(/^(\w+)/);
        result.warningRows.push({
          row: rowNum,
          field: fieldMatch ? fieldMatch[1] : "unknown",
          message: msg,
        });
      });
    }
  });

  return result;
}

// ── Page component ─────────────────────────────────────────────────

export default function DataToolsPage() {
  const { user, can } = useRole();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"clients" | "policies">("clients");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const scopedClientsData = scopedClients(user);
  const scopedPoliciesData = scopedPolicies(user);

  const handleExport = useCallback(
    (type: "clients" | "policies") => {
      const data = type === "clients" ? scopedClientsData : scopedPoliciesData;
      const headers = type === "clients" ? clientHeaders : policyHeaders;
      const rows = data as unknown as Record<string, unknown>[];
      const csv = toCSV(rows, headers);
      const filename = `${type}_export_${new Date().toISOString().split("T")[0]}.csv`;

      downloadFile(csv, filename, "text/csv;charset=utf-8");

      logAudit({
        actor: user?.name ?? "Unknown",
        actorId: user?.id ?? "unknown",
        action: `Exported ${data.length} ${type} to CSV`,
        category: type === "clients" ? "client" : "policy",
        entity: type,
        entityId: filename,
        severity: "info",
      });

      toast({
        title: "Export complete",
        description: `${data.length} ${type} exported to ${filename}`,
      });
    },
    [scopedClientsData, scopedPoliciesData, user, toast]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        toast({ title: "Invalid file", description: "Please upload a .csv file", variant: "destructive" });
        return;
      }

      setImporting(true);
      setImportProgress(0);
      setImportResult(null);
      setShowPreview(false);

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setImportProgress(50);

        setTimeout(() => {
          const result = processImport(text, activeTab);
          setImportResult(result);
          setImportProgress(100);
          setImporting(false);
          setShowPreview(true);

          logAudit({
            actor: user?.name ?? "Unknown",
            actorId: user?.id ?? "unknown",
            action: `Imported ${file.name}: ${result.valid} valid, ${result.errors} errors, ${result.warnings} warnings`,
            category: activeTab === "clients" ? "client" : "policy",
            entity: activeTab,
            entityId: file.name,
            severity: result.errors > 0 ? "warning" : "info",
          });
        }, 300);
      };
      reader.readAsText(file);
    },
    [activeTab, user, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleConfirmImport = useCallback(() => {
    if (!importResult || importResult.valid === 0) return;

    logAudit({
      actor: user?.name ?? "Unknown",
      actorId: user?.id ?? "unknown",
      action: `Confirmed import of ${importResult.valid} ${activeTab}`,
      category: activeTab === "clients" ? "client" : "policy",
      entity: activeTab,
      entityId: "bulk-import",
      severity: "success",
    });

    toast({
      title: "Import committed",
      description: `${importResult.valid} ${activeTab} imported successfully. In production this writes to the database.`,
    });

    setImportResult(null);
    setShowPreview(false);
  }, [importResult, activeTab, user, toast]);

  const handleDownloadTemplate = useCallback(
    (type: "clients" | "policies") => {
      const headers = type === "clients" ? clientHeaders : policyHeaders;
      const sampleRow = type === "clients"
        ? {
            id: "CL-NEW1",
            name: "Jane Doe",
            email: "jane.doe@email.com",
            phone: "(305) 555-0100",
            status: "Prospect",
            planType: "MAPD",
            carrier: "UnitedHealthcare",
            enrollmentDate: "2026-01-15",
            renewalDate: "2026-12-31",
            premium: 0,
            commission: 350,
            agent: "Daniel Reyes",
            age: 67,
            zip: "33101",
            leadSource: "Referral",
            notes: "Sample row — replace with real data",
          }
        : {
            id: "PL-NEW1",
            client: "Jane Doe",
            carrier: "UnitedHealthcare",
            planType: "MAPD",
            status: "Pending",
            premium: 0,
            commission: 350,
            effectiveDate: "2026-01-15",
            renewalDate: "2026-12-31",
            agent: "Daniel Reyes",
          };

      const csv = toCSV([sampleRow as unknown as Record<string, unknown>], headers);
      downloadFile(csv, `${type}_template.csv`, "text/csv;charset=utf-8");

      toast({ title: "Template downloaded", description: `${type}_template.csv` });
    },
    [toast]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Import / Export"
        description="Bulk migrate clients and policies via CSV. Validate before committing."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "clients" | "policies")}>
        <TabsList>
          <TabsTrigger value="clients">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Clients ({scopedClientsData.length})
          </TabsTrigger>
          <TabsTrigger value="policies">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Policies ({scopedPoliciesData.length})
          </TabsTrigger>
        </TabsList>

        {(["clients", "policies"] as const).map((type) => (
          <TabsContent key={type} value={type} className="space-y-6">
            {/* Export section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  Export {type === "clients" ? "Clients" : "Policies"}
                </CardTitle>
                <CardDescription>
                  Download all {type} in your current scope as a CSV file for backup, migration, or external analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => handleExport(type)} variant="default">
                    <FileDown className="h-4 w-4 mr-2" />
                    Export {type === "clients" ? scopedClientsData.length : scopedPoliciesData.length} {type}
                  </Button>
                  <Button onClick={() => handleDownloadTemplate(type)} variant="outline">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Exported columns ({type === "clients" ? clientHeaders.length : policyHeaders.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(type === "clients" ? clientHeaders : policyHeaders).map((h) => (
                      <Badge key={h} variant="secondary" className="text-xs font-mono">
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Import section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Import {type === "clients" ? "Clients" : "Policies"}
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to bulk-import {type}. The file is validated row-by-row before any data is committed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                  <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {dragOver ? "Drop file here" : "Click to browse or drag a CSV file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 10,000 rows. Must match the template columns above.
                  </p>
                </div>

                {/* Progress */}
                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Validating file...</span>
                      <span className="font-mono">{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} className="h-2" />
                  </div>
                )}

                {/* Results */}
                {importResult && showPreview && (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-3">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">{importResult.total}</p>
                        <p className="text-xs text-muted-foreground">Total Rows</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center border-success/30 bg-success/5">
                        <p className="text-2xl font-bold text-success">{importResult.valid}</p>
                        <p className="text-xs text-muted-foreground">Valid</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center border-destructive/30 bg-destructive/5">
                        <p className="text-2xl font-bold text-destructive">{importResult.errors}</p>
                        <p className="text-xs text-muted-foreground">Errors</p>
                      </div>
                      <div className="rounded-lg border p-3 text-center border-warning/30 bg-warning/5">
                        <p className="text-2xl font-bold text-warning">{importResult.warnings}</p>
                        <p className="text-xs text-muted-foreground">Warnings</p>
                      </div>
                    </div>

                    {/* Error details */}
                    {importResult.errorRows.length > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold mb-2">{importResult.errorRows.length} error(s) found:</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {importResult.errorRows.slice(0, 20).map((err, i) => (
                              <div key={i} className="text-xs font-mono">
                                Row {err.row}: <span className="font-semibold">{err.field}</span> — {err.message}
                                {err.value && <span className="text-muted-foreground"> (value: "{err.value}")</span>}
                              </div>
                            ))}
                            {importResult.errorRows.length > 20 && (
                              <p className="text-xs text-muted-foreground">
                                ...and {importResult.errorRows.length - 20} more
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Warning details */}
                    {importResult.warningRows.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <p className="font-semibold mb-2">{importResult.warningRows.length} warning(s):</p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {importResult.warningRows.slice(0, 15).map((warn, i) => (
                              <div key={i} className="text-xs font-mono">
                                Row {warn.row}: <span className="font-semibold">{warn.field}</span> — {warn.message}
                              </div>
                            ))}
                            {importResult.warningRows.length > 15 && (
                              <p className="text-xs text-muted-foreground">
                                ...and {importResult.warningRows.length - 15} more
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Preview table */}
                    {importResult.valid > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4 text-success" />
                            Preview: {importResult.valid} valid rows ready to import
                          </h4>
                          <Button
                            onClick={handleConfirmImport}
                            disabled={!can(type === "clients" ? "client:create" : "policy:create")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Confirm Import
                          </Button>
                        </div>
                        <div className="rounded-lg border overflow-x-auto max-h-64 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-muted/50 backdrop-blur">
                              <tr>
                                {(type === "clients" ? clientHeaders : policyHeaders).map((h) => (
                                  <th key={h} className="px-2 py-1.5 text-left font-mono font-semibold whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {importResult.data.slice(0, 50).map((row, i) => (
                                <tr key={i} className="border-t hover:bg-muted/30">
                                  {(type === "clients" ? clientHeaders : policyHeaders).map((h) => (
                                    <td key={h} className="px-2 py-1 whitespace-nowrap max-w-[200px] truncate">
                                      {row[h] || <span className="text-muted-foreground">—</span>}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {importResult.data.length > 50 && (
                          <p className="text-xs text-muted-foreground text-center">
                            Showing first 50 of {importResult.data.length} valid rows
                          </p>
                        )}
                      </div>
                    )}

                    {importResult.valid === 0 && importResult.errors > 0 && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          No valid rows found. Fix the errors above and re-upload the file.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            How bulk import works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-mono text-primary shrink-0">1.</span>
              Download the CSV template for the data type you want to import.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-primary shrink-0">2.</span>
              Fill in your data — each row is one client or policy. Keep the header row exactly as-is.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-primary shrink-0">3.</span>
              Upload the file. Every row is validated against field types, enums (plan types, statuses), and required fields.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-primary shrink-0">4.</span>
              Review the preview, fix any errors (rows with errors are skipped), and confirm to commit.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-primary shrink-0">5.</span>
              All imports and exports are logged to the audit trail with actor, timestamp, and row counts.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
