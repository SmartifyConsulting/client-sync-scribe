/**
 * LoadingSpinner â€” shared loading indicator.
 * Replaces ad-hoc <Loader2 className="animate-spin" /> blocks.
 */

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
  label?: string;
  showDefaultLabel?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const;

export function LoadingSpinner({ label, showDefaultLabel, className, size = "md" }: LoadingSpinnerProps) {
  const { t } = useTranslation();
  const displayLabel = label || (showDefaultLabel ? t("common.loading") : undefined);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground", className)}>
      <Loader2 className={cn("animate-spin text-primary", SIZE_MAP[size])} />
      {displayLabel && <span className="text-sm">{displayLabel}</span>}
    </div>
  );
}

