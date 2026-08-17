import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; positive?: boolean };
  accent?: "navy" | "blue" | "success" | "warning" | "destructive";
  className?: string;
}

const accentStyles = {
  navy: "from-navy-700 to-navy-900 text-white",
  blue: "from-navy-500 to-navy-700 text-white",
  success: "from-success to-success text-white",
  warning: "from-warning to-warning text-white",
  destructive: "from-destructive to-destructive text-white",
};

const iconBgStyles = {
  navy: "bg-white/15 text-white",
  blue: "bg-white/15 text-white",
  success: "bg-white/15 text-white",
  warning: "bg-white/15 text-white",
  destructive: "bg-white/15 text-white",
};

export function StatCard({ label, value, icon: Icon, trend, accent = "navy", className }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden border-0 bg-gradient-to-br p-5 shadow-md", accentStyles[accent], className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/70 mb-1">{label}</p>
          <p className="font-display text-3xl font-bold tracking-tight">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              {trend.positive ? (
                <TrendingUp className="h-4 w-4 text-white/80" />
              ) : (
                <TrendingDown className="h-4 w-4 text-white/80" />
              )}
              <span className="text-white/80">
                {trend.positive ? "+" : ""}{trend.value}% <span className="text-white/50">vs last month</span>
              </span>
            </div>
          )}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", iconBgStyles[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
