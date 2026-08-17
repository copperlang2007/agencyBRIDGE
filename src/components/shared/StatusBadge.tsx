import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type StatusType = "Active" | "Pending" | "Lapsed" | "Prospect" | "Compliant" | "Expiring" | "Overdue" | "Missing" | "Confirmed" | "Completed" | "Cancelled" | "Paid" | "On Leave" | "Terminated";

const statusStyles: Record<StatusType, string> = {
  Active: "bg-success/15 text-success border-success/20",
  Compliant: "bg-success/15 text-success border-success/20",
  Confirmed: "bg-success/15 text-success border-success/20",
  Completed: "bg-success/15 text-success border-success/20",
  Paid: "bg-success/15 text-success border-success/20",
  Pending: "bg-warning/15 text-warning border-warning/20",
  Expiring: "bg-warning/15 text-warning border-warning/20",
  Prospect: "bg-accent/15 text-accent border-accent/20",
  Lapsed: "bg-destructive/15 text-destructive border-destructive/20",
  Overdue: "bg-destructive/15 text-destructive border-destructive/20",
  Missing: "bg-destructive/15 text-destructive border-destructive/20",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  "On Leave": "bg-muted text-muted-foreground border-border",
  Terminated: "bg-destructive/15 text-destructive border-destructive/20",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status as StatusType] || "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={cn("font-medium", style, className)}>
      {status}
    </Badge>
  );
}
