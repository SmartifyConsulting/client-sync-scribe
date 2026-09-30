import { cn } from "@/lib/utils";
import { useBrandMode } from "@/hooks/useBrandMode";

/** Holarc Wealth mark: a teal rounded tile holding a simple navy "H". */
function HolarcMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8 shrink-0", className)}
      role="img"
      aria-label="Holarc Wealth"
    >
      <rect width="32" height="32" rx="8" fill="#2DB0A6" />
      <rect x="9" y="8" width="4" height="16" rx="1.5" fill="#1E2A44" />
      <rect x="19" y="8" width="4" height="16" rx="1.5" fill="#1E2A44" />
      <rect x="11" y="14" width="10" height="4" rx="1.5" fill="#1E2A44" />
    </svg>
  );
}

/**
 * indigro mark: a teal rounded tile holding a stylised "i" (stem plus dot) whose dot is
 * lifted into an upward-pointing tick — copied from Indigro's own brand mark.
 */
function IndigroMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8 shrink-0", className)}
      role="img"
      aria-label="indigro"
    >
      <rect width="32" height="32" rx="8" fill="#44d0c1" />
      <rect x="13.5" y="13" width="5" height="12" rx="2.5" fill="#111418" />
      <path d="M13 8.6 L16 5.6 L19 8.6 L16 11.6 Z" fill="#111418" />
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  const { mode } = useBrandMode();
  return mode === "indigro" ? <IndigroMark className={className} /> : <HolarcMark className={className} />;
}

const MARK_SIZE: Record<string, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-11 w-11",
  hero: "h-16 w-16 sm:h-20 sm:w-20",
};

const TEXT_SIZE: Record<string, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  hero: "text-4xl sm:text-5xl",
};

export function Logo({
  className,
  onDark = false,
  size = "md",
}: {
  className?: string;
  onDark?: boolean;
  size?: "sm" | "md" | "lg" | "hero";
}) {
  const { mode } = useBrandMode();
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={MARK_SIZE[size]} />
      <span
        className={cn(
          "font-display font-bold leading-none tracking-tight",
          TEXT_SIZE[size],
          onDark ? (mode === "indigro" ? "text-[#44d0c1]" : "text-white") : "text-foreground",
        )}
      >
        {mode === "indigro" ? "indigro" : "Holarc Wealth"}
      </span>
    </span>
  );
}
