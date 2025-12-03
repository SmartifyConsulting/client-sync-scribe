import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "text-sm font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent transition-colors group-hover:bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-primary/5 transition-transform duration-500 group-hover:scale-150" />
    </div>
  );
}
