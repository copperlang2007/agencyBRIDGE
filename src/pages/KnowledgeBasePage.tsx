import { useState, useMemo, useEffect } from "react";
import { Can } from "@/components/shared/Can";
import { logAudit } from "@/lib/auditLog";
import { useRole } from "@/lib/roleContext";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Save,
  X,
  RotateCcw,
  BookOpen,
  Tag,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  knowledgeCategories,
  getKnowledgeEntries,
  addKnowledgeEntry,
  updateKnowledgeEntry,
  removeKnowledgeEntry,
  resetKnowledgeBase,
  type KnowledgeEntry,
} from "@/lib/medicareKnowledge";
import { cn } from "@/lib/utils";

interface EditorState {
  id?: string;
  category: string;
  title: string;
  content: string;
  keywords: string;
}

const EMPTY_EDITOR: EditorState = {
  category: "",
  title: "",
  content: "",
  keywords: "",
};

export default function KnowledgeBasePage() {
  const { user } = useRole();
  useEffect(() => { logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "viewed_knowledge_base", category: "knowledge_base", entity: "Knowledge Base Admin", severity: "info" }); }, [user]);
  const { toast } = useToast();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);

  // Load entries from localStorage on mount
  useEffect(() => {
    setEntries(getKnowledgeEntries());
  }, []);

  const refresh = () => setEntries(getKnowledgeEntries());

  const allCategories = useMemo(() => {
    const set = new Set<string>(knowledgeCategories);
    entries.forEach((e) => set.add(e.category));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries
      .filter((e) => filterCat === "all" || e.category === filterCat)
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.toLowerCase().includes(q))
      )
      .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
  }, [entries, search, filterCat]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + 1));
    return map;
  }, [entries]);

  const openAdd = () => {
    setEditor({ ...EMPTY_EDITOR, category: allCategories[0] ?? "" });
  };

  const openEdit = (entry: KnowledgeEntry) => {
    setEditor({
      id: entry.id,
      category: entry.category,
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords.join(", "),
    });
  };

  const closeEditor = () => setEditor(null);

  const saveEditor = () => {
    if (!editor) return;
    if (!editor.title.trim() || !editor.content.trim() || !editor.category.trim()) {
      toast({ title: "Missing fields", description: "Category, title, and content are required.", variant: "destructive" });
      return;
    }
    const keywords = editor.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (editor.id) {
      updateKnowledgeEntry({
        id: editor.id,
        category: editor.category,
        title: editor.title.trim(),
        content: editor.content.trim(),
        keywords,
      });
      toast({ title: "Entry updated", description: `"${editor.title}" saved.` });
      logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "updated_kb_entry", category: "knowledge_base", entity: editor.title, entityId: editor.id, severity: "warning" });
    } else {
      addKnowledgeEntry({
        category: editor.category,
        title: editor.title.trim(),
        content: editor.content.trim(),
        keywords,
      });
      toast({ title: "Entry added", description: `"${editor.title}" created.` });
      logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "added_kb_entry", category: "knowledge_base", entity: editor.title, severity: "warning" });
    }
    refresh();
    closeEditor();
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    removeKnowledgeEntry(deleteId);
    logAudit({ actor: user?.name ?? "unknown", actorId: user?.id ?? "unknown", action: "deleted_kb_entry", category: "knowledge_base", entity: deleteId, severity: "critical" });
    refresh();
    setDeleteId(null);
    toast({ title: "Entry removed", variant: "destructive" });
  };

  const confirmReset = () => {
    resetKnowledgeBase();
    refresh();
    setShowReset(false);
    toast({ title: "Knowledge base reset", description: "All custom changes discarded." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base Admin"
        description="Manage Agent Assist's RAG knowledge entries — no code changes needed."
      />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-display font-bold text-foreground">{entries.length}</p>
          <p className="text-xs text-muted-foreground">Total Entries</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-display font-bold text-foreground">{allCategories.length}</p>
          <p className="text-xs text-muted-foreground">Categories</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-display font-bold text-foreground">
            {entries.filter((e) => !e.id.match(/^(comm|med|lis|ma|car|ep|sep|na)-\d+$/)).length}
          </p>
          <p className="text-xs text-muted-foreground">Custom Entries</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-2xl font-display font-bold text-foreground">
            {entries.reduce((s, e) => s + e.keywords.length, 0)}
          </p>
          <p className="text-xs text-muted-foreground">Keywords Indexed</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entries, content, keywords…"
              className="pl-9"
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-[200px] shrink-0">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat} ({categoryCounts.get(cat) ?? 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 shrink-0">
          <Can action="kb:manage">
            <Button variant="outline" size="sm" onClick={() => setShowReset(true)}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
            </Button>
          </Can>
          <Can action="kb:edit">
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Entry
            </Button>
          </Can>
        </div>
      </div>

      {/* Entry list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No entries match your search.</p>
          </div>
        ) : (
          filtered.map((entry) => {
            const isCustom = !entry.id.match(/^(comm|med|lis|ma|car|ep|sep|na)-\d+$/);
            return (
              <div
                key={entry.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-accent/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="secondary" className="text-[10px]">
                        <Tag className="h-2.5 w-2.5 mr-1" />
                        {entry.category}
                      </Badge>
                      {isCustom && (
                        <Badge variant="outline" className="text-[10px] text-accent border-accent/40">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-display font-semibold text-sm text-foreground mb-1">
                      {entry.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {entry.content}
                    </p>
                    {entry.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entry.keywords.slice(0, 6).map((kw) => (
                          <span
                            key={kw}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                          >
                            {kw}
                          </span>
                        ))}
                        {entry.keywords.length > 6 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{entry.keywords.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <Can action="kb:edit">
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(entry)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:text-destructive"
                        onClick={() => setDeleteId(entry.id)}
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Can>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Editor dialog */}
      {editor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeEditor}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-display font-semibold text-foreground">
                {editor.id ? "Edit Entry" : "New Knowledge Entry"}
              </h2>
              <Button variant="ghost" size="icon" onClick={closeEditor} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={editor.category}
                  onValueChange={(v) => setEditor({ ...editor, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="mt-2"
                  value={editor.category}
                  onChange={(e) => setEditor({ ...editor, category: e.target.value })}
                  placeholder="…or type a new category name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                  placeholder="e.g. How Medicare Advantage commissions work"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  value={editor.content}
                  onChange={(e) => setEditor({ ...editor, content: e.target.value })}
                  placeholder="Full knowledge text the assistant will use to answer questions…"
                  rows={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Keywords (comma-separated)</Label>
                <Input
                  value={editor.keywords}
                  onChange={(e) => setEditor({ ...editor, keywords: e.target.value })}
                  placeholder="commission, ma, advantage, pepm, renewal"
                />
                <p className="text-[11px] text-muted-foreground">
                  Keywords improve RAG matching — add terms an agent might ask about.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <Button variant="outline" onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={saveEditor}>
                <Save className="h-4 w-4 mr-1.5" /> Save Entry
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              The entry will be permanently removed from the knowledge base. The Agent Assist will no longer reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirm */}
      <AlertDialog open={showReset} onOpenChange={setShowReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset knowledge base?</AlertDialogTitle>
            <AlertDialogDescription className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span>
                This discards all custom entries and edits, restoring the original seeded knowledge base. This cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset to Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
