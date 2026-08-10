import { cn } from "@/lib/utils";

interface SampleBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

/**
 * Plain-text marker showing a record is sample/demo data — not a real
 * person. Rendered as "(Demo Data)" next to the name.
 */
export function SampleBadge({ size = "sm", className }: SampleBadgeProps) {
  return (
    <span
      role="img"
      aria-label="Sample data — not a real patient"
      className={cn(
        "shrink-0 align-middle font-normal text-muted-foreground",
        size === "md" ? "text-sm" : "text-xs",
        className,
      )}
    >
      (Demo Data)
    </span>
  );
}
