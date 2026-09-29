import { cn } from "@/lib/utils";

type Props = {
  number?: string | null;
  className?: string;
  /** Kept for back-compat; all sizes now render the same compact green chip. */
  size?: "sm" | "md" | "lg";
  /** Kept for back-compat. */
  showCopy?: boolean;
  label?: string;
};

/**
 * Compact green pill that visually matches the "AUTO-ASSIGNED" / "ASSIGNED"
 * chips used on the incident detail screen.
 */
export function IncidentNumberBadge({
  number,
  className,
  label = "Incident",
}: Props) {
  if (!number) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-semibold text-primary dark:bg-primary/15 dark:text-emerald-100",
        className,
      )}
    >
      {label} {number}
    </span>
  );
}
