/**
 * LoadingSpinner — shared loading indicator.
 * Replaces ad-hoc <Loader2 className="animate-spin" /> blocks.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

export function LoadingSpinner({ label, className, size = "md" }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground", className)}>
      <Loader2 className={cn("animate-spin text-primary", SIZE_MAP[size])} />
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}
