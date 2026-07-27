import { TestTube } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Bold orange — used for every dummy/sample data marker. */
const SAMPLE_ORANGE = "#EA6A00";

interface SampleBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

/**
 * Bold orange test-tube icon marking a record as sample/demo data —
 * not a real person. Rendered as a prefix next to the name.
 */
export function SampleBadge({ size = "sm", className }: SampleBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label="Sample data — not a real patient"
            className={cn("inline-flex shrink-0 items-center align-middle leading-none", className)}
          >
            <TestTube
              className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"}
              strokeWidth={2.75}
              style={{ color: SAMPLE_ORANGE }}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent>Sample data — not a real patient</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
