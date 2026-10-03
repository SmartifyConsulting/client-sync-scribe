import type { LucideIcon } from "lucide-react";
import { ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's standard content frame: rounded card, icon + title header with an
 * optional action/chevron, used for every self-contained block of content
 * (dashboard tiles, profile sections, list frames, etc). Reuse this instead
 * of hand-rolling a bordered <section> so frames stay visually consistent.
 */
export function Panel({
  title,
  icon: Icon,
  unlocked = true,
  action,
  onClick,
  children,
  className,
}: {
  title?: string;
  icon?: LucideIcon;
  unlocked?: boolean;
  action?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4 h-full",
        unlocked ? "border-primary bg-card" : "border-border bg-muted/30 opacity-60",
        className,
      )}
    >
      {title && (
        <header
          className={cn("flex items-center justify-between gap-2 mb-3", onClick && "cursor-pointer")}
          onClick={onClick}
        >
          <div className="flex items-center gap-2">
            {Icon && (
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  unlocked ? "bg-primary/10" : "bg-muted",
                )}
              >
                <Icon className={cn("h-4 w-4", unlocked ? "text-primary" : "text-muted-foreground")} />
              </span>
            )}
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          </div>
          {action ?? (onClick ? (unlocked ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />) : null)}
        </header>
      )}
      {children}
    </section>
  );
}

export default Panel;
