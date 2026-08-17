/**
 * Drag-and-drop visual email builder for non-technical users.
 * Outputs HTML compatible with the emailCampaignData template system.
 * Blocks: heading, text, button, image, divider, spacer, social, columns.
 */

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Type,
  Heading,
  MousePointerClick,
  Image as ImageIcon,
  Minus,
  Maximize2,
  Share2,
  Columns,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Plus,
  GripVertical,
  Eye,
  Code,
  Palette,
} from "lucide-react";

// ── Block types ────────────────────────────────────────────────────

export type BlockType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "divider"
  | "spacer"
  | "social"
  | "columns";

export interface EmailBlock {
  id: string;
  type: BlockType;
  // common
  padding: number;
  align: "left" | "center" | "right";
  background: string;
  // heading
  headingText?: string;
  headingLevel?: 1 | 2 | 3;
  headingColor?: string;
  headingSize?: number;
  // text
  textContent?: string;
  textColor?: string;
  textSize?: number;
  // button
  buttonText?: string;
  buttonUrl?: string;
  buttonBg?: string;
  buttonColor?: string;
  buttonRadius?: number;
  // image
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  // spacer
  spacerHeight?: number;
  // social
  socialLinks?: { label: string; url: string }[];
  socialColor?: string;
  // columns
  columns?: EmailBlock[][];
  columnCount?: 2 | 3;
}

// ── Block palette ───────────────────────────────────────────────────

const blockPalette: { type: BlockType; label: string; icon: typeof Type; color: string }[] = [
  { type: "heading", label: "Heading", icon: Heading, color: "bg-navy-100 text-navy-700" },
  { type: "text", label: "Text Block", icon: Type, color: "bg-accent/15 text-accent-foreground" },
  { type: "button", label: "Button", icon: MousePointerClick, color: "bg-success/15 text-success" },
  { type: "image", label: "Image", icon: ImageIcon, color: "bg-warning/15 text-warning-foreground" },
  { type: "divider", label: "Divider", icon: Minus, color: "bg-muted text-muted-foreground" },
  { type: "spacer", label: "Spacer", icon: Maximize2, color: "bg-muted text-muted-foreground" },
  { type: "social", label: "Social Links", icon: Share2, color: "bg-accent/15 text-accent-foreground" },
  { type: "columns", label: "Columns", icon: Columns, color: "bg-navy-100 text-navy-700" },
];

// ── Default blocks ──────────────────────────────────────────────────

function makeBlock(type: BlockType): EmailBlock {
  const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const base: EmailBlock = { id, type, padding: 16, align: "left", background: "#ffffff" };
  switch (type) {
    case "heading":
      return { ...base, headingText: "Your Heading Here", headingLevel: 2, headingColor: "#0f1b3d", headingSize: 24, align: "left" };
    case "text":
      return { ...base, textContent: "Start writing your message here. You can edit this text by clicking on it.", textColor: "#333333", textSize: 14, align: "left" };
    case "button":
      return { ...base, buttonText: "Click Here", buttonUrl: "https://", buttonBg: "#1e3a5f", buttonColor: "#ffffff", buttonRadius: 6, align: "center" };
    case "image":
      return { ...base, imageUrl: "", imageAlt: "Image", imageWidth: 100, align: "center" };
    case "divider":
      return { ...base, padding: 10, align: "center" };
    case "spacer":
      return { ...base, spacerHeight: 40, padding: 0 };
    case "social":
      return { ...base, socialLinks: [{ label: "Facebook", url: "https://facebook.com" }, { label: "Twitter", url: "https://twitter.com" }], socialColor: "#1e3a5f", align: "center" };
    case "columns":
      return {
        ...base,
        columnCount: 2,
        columns: [
          [{ id: `blk_${Date.now()}_a`, type: "text", padding: 12, align: "left", background: "#ffffff", textContent: "Left column text.", textColor: "#333333", textSize: 14 }],
          [{ id: `blk_${Date.now()}_b`, type: "text", padding: 12, align: "left", background: "#ffffff", textContent: "Right column text.", textColor: "#333333", textSize: 14 }],
        ],
      };
    default:
      return base;
  }
}

// ── Block → HTML ────────────────────────────────────────────────────

function blockToHtml(block: EmailBlock): string {
  const pad = `padding:${block.padding}px;`;
  const bg = block.background !== "#ffffff" ? `background:${block.background};` : "";
  const align = `text-align:${block.align};`;

  switch (block.type) {
    case "heading": {
      const tag = `h${block.headingLevel || 2}`;
      return `<div style="${pad}${bg}${align}"><${tag} style="color:${block.headingColor || "#0f1b3d"};font-size:${block.headingSize || 24}px;margin:0;font-family:Outfit,sans-serif;font-weight:700;">${block.headingText || ""}</${tag}></div>`;
    }
    case "text": {
      const lines = (block.textContent || "").split("\n").map((l) => l.trim() ? `<p style="margin:0 0 8px 0;color:${block.textColor || "#333"};font-size:${block.textSize || 14}px;font-family:Figtree,sans-serif;line-height:1.6;">${l}</p>` : "").join("");
      return `<div style="${pad}${bg}${align}">${lines}</div>`;
    }
    case "button": {
      return `<div style="${pad}${bg}${align}"><a href="${block.buttonUrl || "#"}" style="display:inline-block;padding:12px 28px;background:${block.buttonBg || "#1e3a5f"};color:${block.buttonColor || "#fff"};text-decoration:none;border-radius:${block.buttonRadius || 6}px;font-family:Figtree,sans-serif;font-weight:600;font-size:15px;">${block.buttonText || "Click Here"}</a></div>`;
    }
    case "image": {
      return `<div style="${pad}${bg}${align}"><img src="${block.imageUrl || ""}" alt="${block.imageAlt || ""}" style="max-width:${block.imageWidth || 100}%;height:auto;border-radius:4px;" /></div>`;
    }
    case "divider": {
      return `<div style="${pad}${bg}"><hr style="border:none;border-top:1px solid #e0e0e0;margin:0;" /></div>`;
    }
    case "spacer": {
      return `<div style="height:${block.spacerHeight || 40}px;line-height:${block.spacerHeight || 40}px;font-size:1px;">&nbsp;</div>`;
    }
    case "social": {
      const links = (block.socialLinks || []).map((s) =>
        `<a href="${s.url}" style="display:inline-block;margin:0 8px;color:${block.socialColor || "#1e3a5f"};text-decoration:none;font-family:Figtree,sans-serif;font-size:13px;font-weight:500;">${s.label}</a>`
      ).join("");
      return `<div style="${pad}${bg}${align}">${links}</div>`;
    }
    case "columns": {
      const cols = (block.columns || []).map((col) => {
        const inner = col.map((b) => blockToHtml(b)).join("");
        return `<td style="vertical-align:top;width:${Math.floor(100 / (block.columnCount || 2))}%;">${inner}</td>`;
      }).join("");
      return `<div style="${pad}${bg}"><table style="width:100%;border-collapse:collapse;"><tr>${cols}</tr></table></div>`;
    }
    default:
      return "";
  }
}

export function blocksToHtml(blocks: EmailBlock[]): string {
  return blocks.map((b) => blockToHtml(b)).join("\n");
}

// ── HTML → Blocks (basic parser) ────────────────────────────────────

function htmlToBlocks(html: string): EmailBlock[] {
  // If no HTML or very short, return a default starter block
  if (!html || html.trim().length < 20) {
    return [makeBlock("heading"), makeBlock("text"), makeBlock("button")];
  }
  // Simple approach: wrap as a single text block for now
  // (Full reverse parsing is complex; this gives users a starting point)
  return [{
    ...makeBlock("text"),
    textContent: html.replace(/<[^>]+>/g, "").trim().slice(0, 500) || "Imported content",
  }];
}

// ── Block Editor Panel ──────────────────────────────────────────────

function BlockEditor({ block, onChange }: { block: EmailBlock; onChange: (b: EmailBlock) => void }) {
  const update = (patch: Partial<EmailBlock>) => onChange({ ...block, ...patch });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border">
        <Palette className="h-4 w-4 text-accent-foreground" />
        <span className="text-sm font-semibold capitalize">{block.type} Block Settings</span>
      </div>

      {/* Common: alignment & padding */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Alignment</Label>
          <Select value={block.align} onValueChange={(v) => update({ align: v as EmailBlock["align"] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Padding: {block.padding}px</Label>
          <input type="range" min={0} max={48} step={4} value={block.padding} onChange={(e) => update({ padding: parseInt(e.target.value) })} className="w-full accent-accent-foreground mt-2" />
        </div>
      </div>

      {/* Type-specific fields */}
      {block.type === "heading" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Heading Text</Label>
            <Input value={block.headingText} onChange={(e) => update({ headingText: e.target.value })} className="text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Level</Label>
              <Select value={String(block.headingLevel)} onValueChange={(v) => update({ headingLevel: parseInt(v) as 1 | 2 | 3 })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Size: {block.headingSize}px</Label>
              <input type="range" min={16} max={48} step={2} value={block.headingSize} onChange={(e) => update({ headingSize: parseInt(e.target.value) })} className="w-full accent-accent-foreground mt-2" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <input type="color" value={block.headingColor} onChange={(e) => update({ headingColor: e.target.value })} className="h-8 w-full rounded border border-border" />
            </div>
          </div>
        </>
      )}

      {block.type === "text" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Text Content</Label>
            <Textarea value={block.textContent} onChange={(e) => update({ textContent: e.target.value })} rows={4} className="text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Font Size: {block.textSize}px</Label>
              <input type="range" min={10} max={24} step={1} value={block.textSize} onChange={(e) => update({ textSize: parseInt(e.target.value) })} className="w-full accent-accent-foreground mt-2" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Text Color</Label>
              <input type="color" value={block.textColor} onChange={(e) => update({ textColor: e.target.value })} className="h-8 w-full rounded border border-border" />
            </div>
          </div>
        </>
      )}

      {block.type === "button" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Button Text</Label>
            <Input value={block.buttonText} onChange={(e) => update({ buttonText: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link URL</Label>
            <Input value={block.buttonUrl} onChange={(e) => update({ buttonUrl: e.target.value })} className="text-sm" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">BG Color</Label>
              <input type="color" value={block.buttonBg} onChange={(e) => update({ buttonBg: e.target.value })} className="h-8 w-full rounded border border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Text Color</Label>
              <input type="color" value={block.buttonColor} onChange={(e) => update({ buttonColor: e.target.value })} className="h-8 w-full rounded border border-border" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Radius: {block.buttonRadius}px</Label>
              <input type="range" min={0} max={24} step={2} value={block.buttonRadius} onChange={(e) => update({ buttonRadius: parseInt(e.target.value) })} className="w-full accent-accent-foreground mt-2" />
            </div>
          </div>
        </>
      )}

      {block.type === "image" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Image URL</Label>
            <Input value={block.imageUrl} onChange={(e) => update({ imageUrl: e.target.value })} className="text-sm" placeholder="https://example.com/image.png" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alt Text</Label>
            <Input value={block.imageAlt} onChange={(e) => update({ imageAlt: e.target.value })} className="text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Width: {block.imageWidth}%</Label>
            <input type="range" min={20} max={100} step={5} value={block.imageWidth} onChange={(e) => update({ imageWidth: parseInt(e.target.value) })} className="w-full accent-accent-foreground mt-2" />
          </div>
        </>
      )}

      {block.type === "spacer" && (
        <div className="space-y-1">
          <Label className="text-xs">Height: {block.spacerHeight}px</Label>
          <input type="range" min={10} max={120} step={5} value={block.spacerHeight} onChange={(e) => update({ spacerHeight: parseInt(e.target.value) })} className="w-full accent-accent-foreground mt-2" />
        </div>
      )}

      {block.type === "social" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Social Links</Label>
            {(block.socialLinks || []).map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input value={link.label} onChange={(e) => {
                  const links = [...(block.socialLinks || [])];
                  links[i] = { ...links[i], label: e.target.value };
                  update({ socialLinks: links });
                }} className="text-xs h-8 w-24" placeholder="Label" />
                <Input value={link.url} onChange={(e) => {
                  const links = [...(block.socialLinks || [])];
                  links[i] = { ...links[i], url: e.target.value };
                  update({ socialLinks: links });
                }} className="text-xs h-8 flex-1" placeholder="https://..." />
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => {
                  const links = (block.socialLinks || []).filter((_, j) => j !== i);
                  update({ socialLinks: links });
                }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => {
              const links = [...(block.socialLinks || []), { label: "New Link", url: "https://" }];
              update({ socialLinks: links });
            }}>
              <Plus className="h-3.5 w-3.5 mr-1" />Add Link
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link Color</Label>
            <input type="color" value={block.socialColor} onChange={(e) => update({ socialColor: e.target.value })} className="h-8 w-full rounded border border-border" />
          </div>
        </>
      )}

      {block.type === "columns" && (
        <div className="space-y-1">
          <Label className="text-xs">Column Count</Label>
          <Select value={String(block.columnCount)} onValueChange={(v) => {
            const count = parseInt(v) as 2 | 3;
            const cols = (block.columns || []).slice(0, count);
            while (cols.length < count) {
              cols.push([{ id: `blk_${Date.now()}_${cols.length}`, type: "text", padding: 12, align: "left", background: "#ffffff", textContent: "Column text.", textColor: "#333333", textSize: 14 }]);
            }
            update({ columnCount: count, columns: cols });
          }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 Columns</SelectItem>
              <SelectItem value="3">3 Columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ── Block Preview (rendered in canvas) ──────────────────────────────

function BlockPreview({ block, isSelected, onClick }: { block: EmailBlock; isSelected: boolean; onClick: () => void }) {
  const alignClass = block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left";
  const padStyle = { padding: `${block.padding}px` };
  const bgStyle = block.background !== "#ffffff" ? { background: block.background } : {};

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer border-2 rounded-lg transition-all ${isSelected ? "border-accent-foreground shadow-md" : "border-transparent hover:border-border"}`}
      style={{ ...padStyle, ...bgStyle }}
    >
      {isSelected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-md bg-accent-foreground px-2 py-0.5 text-[10px] font-medium text-white">
          <GripVertical className="h-2.5 w-2.5" />
          {block.type}
        </div>
      )}
      <div className={alignClass}>
        {block.type === "heading" && (
          <span style={{ color: block.headingColor, fontSize: `${block.headingSize}px`, fontWeight: 700, fontFamily: "Outfit, sans-serif" }}>
            {block.headingText || "Heading"}
          </span>
        )}
        {block.type === "text" && (
          <div style={{ color: block.textColor, fontSize: `${block.textSize}px`, fontFamily: "Figtree, sans-serif", lineHeight: 1.6 }}>
            {(block.textContent || "").split("\n").map((line, i) => <p key={i} className="m-0 mb-1">{line || "\u00A0"}</p>)}
          </div>
        )}
        {block.type === "button" && (
          <span style={{ display: "inline-block", padding: "12px 28px", background: block.buttonBg, color: block.buttonColor, borderRadius: `${block.buttonRadius}px`, fontWeight: 600, fontSize: "15px", fontFamily: "Figtree, sans-serif" }}>
            {block.buttonText || "Click Here"}
          </span>
        )}
        {block.type === "image" && (
          block.imageUrl ? (
            <img src={block.imageUrl} alt={block.imageAlt || ""} style={{ maxWidth: `${block.imageWidth}%`, height: "auto", borderRadius: "4px" }} />
          ) : (
            <div className="flex items-center justify-center h-24 rounded-md bg-muted border-2 border-dashed border-border">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                <span className="text-xs text-muted-foreground">Click to add image URL</span>
              </div>
            </div>
          )
        )}
        {block.type === "divider" && (
          <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: 0 }} />
        )}
        {block.type === "spacer" && (
          <div style={{ height: `${block.spacerHeight}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Maximize2 className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        {block.type === "social" && (
          <div className="flex flex-wrap gap-3 justify-center">
            {(block.socialLinks || []).map((s, i) => (
              <span key={i} style={{ color: block.socialColor, fontSize: "13px", fontWeight: 500, fontFamily: "Figtree, sans-serif" }}>
                {s.label}
              </span>
            ))}
          </div>
        )}
        {block.type === "columns" && (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${block.columnCount}, 1fr)` }}>
            {(block.columns || []).map((col, ci) => (
              <div key={ci} className="rounded border border-border p-2 min-h-[40px]">
                {col.map((b) => <BlockPreview key={b.id} block={b} isSelected={false} onClick={() => {}} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Visual Builder ──────────────────────────────────────────────

export function VisualEmailBuilder({
  initialHtml,
  onChange,
}: {
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(() => htmlToBlocks(initialHtml));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedId) || null;

  const emitChange = useCallback((newBlocks: EmailBlock[]) => {
    setBlocks(newBlocks);
    onChange(blocksToHtml(newBlocks));
  }, [onChange]);

  const addBlock = (type: BlockType) => {
    const newBlock = makeBlock(type);
    const newBlocks = [...blocks, newBlock];
    emitChange(newBlocks);
    setSelectedId(newBlock.id);
  };

  const updateBlock = (updated: EmailBlock) => {
    emitChange(blocks.map((b) => (b.id === updated.id ? updated : b)));
  };

  const deleteBlock = (id: string) => {
    emitChange(blocks.filter((b) => b.id !== id));
    setSelectedId(null);
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const copy = { ...blocks[idx], id: `blk_${Date.now()}_copy` };
    const newBlocks = [...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)];
    emitChange(newBlocks);
    setSelectedId(copy.id);
  };

  const moveBlock = (id: string, dir: "up" | "down") => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
    emitChange(newBlocks);
  };

  // Drag-and-drop reordering
  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIndex(idx);
  };
  const handleDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(dragIndex, 1);
    newBlocks.splice(idx, 0, moved);
    emitChange(newBlocks);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Palette drag to canvas
  const handlePaletteDragStart = (e: React.DragEvent, type: BlockType) => {
    e.dataTransfer.setData("blockType", type);
  };
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("blockType") as BlockType;
    if (type) addBlock(type);
  };

  return (
    <div className="grid grid-cols-12 gap-4 min-h-[500px]">
      {/* Block Palette */}
      <div className="col-span-3 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Blocks</div>
        <div className="space-y-2">
          {blockPalette.map((item) => (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => handlePaletteDragStart(e, item.type)}
              onDoubleClick={() => addBlock(item.type)}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5 cursor-grab hover:border-accent-foreground/40 hover:shadow-sm transition-all active:cursor-grabbing"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-md ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-dashed border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Drag blocks to the canvas or double-click to add
          </p>
        </div>
      </div>

      {/* Canvas */}
      <div className="col-span-6">
        <div
          ref={canvasRef}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          className="min-h-[500px] rounded-lg border-2 border-dashed border-border bg-white p-4 space-y-1"
        >
          {blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <Plus className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Drag blocks here to build your email</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Or double-click a block from the left panel</p>
            </div>
          )}
          {blocks.map((block, idx) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`relative group ${dragOverIndex === idx && dragIndex !== null ? "border-t-2 border-accent-foreground" : ""}`}
            >
              {/* Hover toolbar */}
              <div className="absolute -top-3 right-2 z-20 flex items-center gap-0.5 rounded-md border border-border bg-card shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveBlock(block.id, "up")} className="p-1 hover:bg-muted rounded-l-md" title="Move up">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button onClick={() => moveBlock(block.id, "down")} className="p-1 hover:bg-muted" title="Move down">
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button onClick={() => duplicateBlock(block.id)} className="p-1 hover:bg-muted" title="Duplicate">
                  <Copy className="h-3 w-3" />
                </button>
                <button onClick={() => deleteBlock(block.id)} className="p-1 hover:bg-destructive/10 text-destructive rounded-r-md" title="Delete">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <BlockPreview
                block={block}
                isSelected={selectedId === block.id}
                onClick={() => setSelectedId(block.id)}
              />
            </div>
          ))}
          {blocks.length > 0 && (
            <button
              onClick={() => addBlock("text")}
              className="w-full rounded-lg border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-accent-foreground/40 hover:text-foreground transition-colors mt-2"
            >
              <Plus className="h-4 w-4 inline mr-1.5" />
              Add Block
            </button>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <div className="col-span-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Properties</div>
        {selectedBlock ? (
          <BlockEditor block={selectedBlock} onChange={updateBlock} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Palette className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Select a block in the canvas to edit its properties
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
