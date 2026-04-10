import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  imageUrl?: string;
  iconSize?: "default" | "large";
  className?: string;
}

export function StatsCard({
  title,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  imageUrl,
  iconSize = "default",
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-primary bg-card p-2 md:p-3 transition-all duration-300 shadow-card hover:shadow-card-hover",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-base md:text-xl font-bold text-foreground tracking-tight">{value}</p>
          {change && (
            <p
              className={cn(
                "text-[9px] md:text-xs font-medium",
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
          "flex items-center justify-center transition-all duration-300 group-hover:scale-105 overflow-hidden rounded-xl bg-primary/10 group-hover:bg-primary/15",
          iconSize === "large" ? "h-9 w-9 md:h-11 md:w-11" : "h-7 w-7 md:h-9 md:w-9"
        )}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className={iconSize === "large" ? "h-5 w-5 md:h-7 md:w-7 object-contain" : "h-4 w-4 md:h-5 md:w-5 object-contain"} />
          ) : (
            <Icon className={iconSize === "large" ? "h-5 w-5 md:h-6 md:w-6 text-primary" : "h-4 w-4 md:h-5 md:w-5 text-primary"} />
          )}
        </div>
      </div>
    </div>
  );
}
