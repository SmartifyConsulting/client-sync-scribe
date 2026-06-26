import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const CRIMSON = "#DC143C";

interface SampleBadgeProps {
  size?: "sm" | "md";
  className?: string;
}

/**
 * Small circled "s" mark (like the © symbol) in crimson red, indicating
 * the adjacent record is sample/demo data — not a real person.
 */
export function SampleBadge({ size = "sm", className }: SampleBadgeProps) {
  const dim = size === "md" ? 14 : 12;
  const fontSize = size === "md" ? 10 : 9;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label="Sample data — not a real patient"
            className={cn("inline-flex items-center justify-center rounded-full border align-middle leading-none font-bold select-none", className)}
            style={{
              width: dim,
              height: dim,
              borderColor: CRIMSON,
              color: CRIMSON,
              borderWidth: 1.25,
              fontSize,
              lineHeight: 1,
            }}
          >
            s
          </span>
        </TooltipTrigger>
        <TooltipContent>Sample data — not a real patient</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
