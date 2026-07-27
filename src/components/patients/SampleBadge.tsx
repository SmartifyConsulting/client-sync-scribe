import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const CRIMSON = "#DC143C";

interface SampleBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

/**
 * Crimson pill badge with white uppercase text marking a record as
 * sample/demo data — not a real person.
 */
export function SampleBadge({ size = "sm", className }: SampleBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label="Sample data — not a real patient"
            className={cn(
              "inline-flex items-center justify-center rounded-full align-middle font-semibold uppercase tracking-wide text-white select-none whitespace-nowrap leading-none",
              size === "md" ? "text-[10px] px-2 py-[3px]" : "text-[9px] px-1.5 py-[2px]",
              className,
            )}
            style={{ backgroundColor: CRIMSON, color: "#fff" }}
          >
            Sample data
          </span>
        </TooltipTrigger>
        <TooltipContent>Sample data — not a real patient</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
