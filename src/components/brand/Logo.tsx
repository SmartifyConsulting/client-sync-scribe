import { cn } from "@/lib/utils";
import logoAsset from "@/assets/elysian-logo.png.asset.json";
import markAsset from "@/assets/elysian-mark.png.asset.json";

/** Elysian lotus mark (teal tile). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={markAsset.url}
      alt="Elysian"
      className={cn("h-8 w-8 shrink-0 object-contain", className)}
    />
  );
}

const MARK_SIZE: Record<string, string> = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-11 w-11" };
const TEXT_SIZE: Record<string, string> = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };

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
      <span className={cn("inline-flex", className)}>
        <img src={logoAsset.url} alt="Elysian" className="h-16 w-auto sm:h-24 xl:h-28" />
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
          onDark ? "text-navy-foreground" : "text-foreground",
        )}
      >
        elysian
      </span>
    </span>
  );
}
