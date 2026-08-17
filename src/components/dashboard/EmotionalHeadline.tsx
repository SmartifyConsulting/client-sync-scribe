import { cn } from "@/lib/utils";

/**
 * Layer 1 of every dashboard card: what this means to the person,
 * shown above the evidence that supports it.
 */
export function EmotionalHeadline({
  emoji,
  title,
  sub,
  muted,
  className,
}: {
  emoji?: string;
  title: string;
  sub?: string;
  /** Rendered in the locked/preview state. */
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-3", className)}>
      <p
        className={cn(
          "text-sm font-semibold leading-snug",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {emoji ? <span className="mr-1.5">{emoji}</span> : null}
        {title}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{sub}</p>}
    </div>
  );
}

/** Consistent "See what's behind this →" style footer link. */
export function CardFooterLink({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline",
        className,
      )}
    >
      {label} <span aria-hidden>→</span>
    </button>
  );
}

export default EmotionalHeadline;
