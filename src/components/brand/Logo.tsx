import { cn } from "@/lib/utils";

/**
 * indigro mark: a teal rounded tile holding a stylised "i" whose dot is lifted
 * into an upward tick — growth and a checked, compliant record.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("h-8 w-8 shrink-0", className)} role="img" aria-label="indigro">
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <rect x="13.5" y="13" width="5" height="12" rx="2.5" className="fill-navy" />
      <path d="M13 8.6 L16 5.6 L19 8.6 L16 11.6 Z" className="fill-navy" />
    </svg>
  );
}

const MARK_SIZE: Record<string, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-11 w-11",
};

const TEXT_SIZE: Record<string, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
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
  if (size === "hero") {
    return (
      <span className={cn("inline-flex items-center gap-[0.1em] text-[51px] sm:text-[77px] lg:text-[80px] xl:text-[106px]", className)}>
        <LogoMark className="h-[1.33em] w-[1.33em]" />
        <span className={cn("font-display font-bold leading-none tracking-tight", onDark ? "text-brand" : "text-navy")}>
          indigro
        </span>
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={MARK_SIZE[size]} />
      <span
        className={cn(
          "font-display font-bold leading-none tracking-tight",
          TEXT_SIZE[size],
          onDark ? "text-brand" : "text-foreground",
        )}
      >
        indigro
      </span>
    </span>
  );
}
