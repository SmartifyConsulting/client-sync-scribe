import { cn } from "@/lib/utils";
import elysianMark from "@/assets/brand/elysian-mark.png";

/**
 * Elysian mark: a teal rounded tile holding a white lotus flower with a
 * diamond bud. Source image is a wide export with the square mark on the
 * left followed by blank space, so it's cropped via CSS to just the mark.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block h-8 w-8 shrink-0 overflow-hidden rounded-[22%]", className)} role="img" aria-label="Elysian">
      <img
        src={elysianMark}
        alt=""
        className="absolute left-0 top-0 h-full w-auto max-w-none select-none"
        draggable={false}
      />
    </span>
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
          Elysian
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
        Elysian
      </span>
    </span>
  );
}
