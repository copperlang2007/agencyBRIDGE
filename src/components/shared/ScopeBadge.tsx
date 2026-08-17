import { useRole } from "@/lib/roleContext";
import { Shield, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Scoping indicator badge — shows agents whether they're viewing their own
 * filtered book of business or the full agency dataset.
 */
export function ScopeBadge({ className }: { className?: string }) {
  const { role } = useRole();

  if (!role) return null;

  const isScoped = role === "agent";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border",
        isScoped
          ? "bg-warning/10 text-warning border-warning/30"
          : "bg-accent/10 text-accent border-accent/30",
        className
      )}
    >
      {isScoped ? (
        <>
          <Shield className="h-3 w-3" />
          Viewing: My Book
        </>
      ) : (
        <>
          <Eye className="h-3 w-3" />
          Viewing: All
        </>
      )}
    </span>
  );
}
