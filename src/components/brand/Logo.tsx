import { cn } from "@/lib/utils";
import logoAsset from "@/assets/elysian-logo.png.asset.json";

const HEIGHT: Record<string, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
  hero: "h-16 sm:h-24 xl:h-28",
};

/** Elysian lockup (lotus mark + wordmark), used everywhere the brand appears. */
export function Logo({
  className,
  onDark = false,
  size = "md",
}: {
  className?: string;
  onDark?: boolean;
  size?: "sm" | "md" | "lg" | "hero";
}) {
  return (
    <span className={cn("inline-flex", className)}>
      <img src={logoAsset.url} alt="Elysian" className={cn(HEIGHT[size], "w-auto")} />
    </span>
  );
}
