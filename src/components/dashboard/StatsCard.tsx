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
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs md:text-xs font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-base md:text-xl font-bold text-foreground tracking-tight truncate">{value}</p>
          {change && (
            <p
              className={cn(
                "text-[8px] md:text-xs font-medium",
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
          "flex items-center justify-center transition-all duration-300 group-hover:scale-105 overflow-hidden",
          imageUrl ? "" : "bg-primary/10 group-hover:bg-primary/15 rounded-xl",
          iconSize === "large" ? "h-12 w-12 md:h-14 md:w-14" : "h-7 w-7 md:h-9 md:w-9"
        )}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-[40px] w-auto md:h-[50px] object-contain" />
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
