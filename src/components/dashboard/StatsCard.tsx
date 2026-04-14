import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  imageUrl?: string;
  iconSize?: "default" | "large";
  className?: string;
  href?: string;
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
  href,
}: StatsCardProps) {
  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-primary bg-card p-2 md:p-3 transition-all duration-300 shadow-card hover:shadow-card-hover min-h-[80px] md:min-h-[100px]",
        href && "cursor-pointer",
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
                "text-[8px] md:text-[10px] font-medium",
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
          "flex items-center justify-center transition-all duration-300 group-hover:scale-105 overflow-hidden rounded-xl",
          imageUrl ? "" : "bg-primary/10 group-hover:bg-primary/15",
          iconSize === "large" ? "h-14 w-14 md:h-20 md:w-20" : "h-7 w-7 md:h-9 md:w-9"
        )}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-16 w-16 md:h-24 md:w-24 object-contain" />
          ) : (
            <Icon className={iconSize === "large" ? "h-5 w-5 md:h-6 md:w-6 text-primary" : "h-4 w-4 md:h-5 md:w-5 text-primary"} />
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
