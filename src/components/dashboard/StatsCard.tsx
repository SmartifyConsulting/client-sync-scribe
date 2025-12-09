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
        "group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-6 transition-all duration-300 shadow-card hover:shadow-card-hover hover:border-primary/20",
        className
      )}
    >
      {/* Teal accent bar */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-2xl" />
      
      {/* Subtle teal gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-4xl font-bold text-foreground tracking-tight">{value}</p>
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-105 group-hover:shadow-teal">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      </div>
    </div>
  );
}
