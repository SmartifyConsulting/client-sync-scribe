import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  imageUrl?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  imageUrl,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-primary bg-card p-6 transition-all duration-300 shadow-card hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
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
        <div className={cn(
          "flex h-14 w-14 items-center justify-center transition-all duration-300 group-hover:scale-105 overflow-hidden",
          imageUrl ? "rounded-full" : "rounded-2xl bg-primary/10 group-hover:bg-primary/15"
        )}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-14 w-14 object-cover rounded-full" />
          ) : (
            <Icon className="h-7 w-7 text-primary" />
          )}
        </div>
      </div>
    </div>
  );
}
