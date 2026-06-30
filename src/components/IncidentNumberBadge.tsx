import { useState } from "react";
import { Copy, Check, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  number?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
  showCopy?: boolean;
  label?: string;
};

/**
 * Shared visual treatment for an incident reference number, used wherever
 * patients, ER providers or hospitals need to track or quote the same case.
 */
export function IncidentNumberBadge({
  number,
  className,
  size = "md",
  showCopy = true,
  label = "Incident #",
}: Props) {
  const [copied, setCopied] = useState(false);
  if (!number) return null;

  const sizeCls =
    size === "lg"
      ? "text-lg px-3.5 py-2"
      : size === "sm"
      ? "text-xs px-2 py-1"
      : "text-base px-3 py-1.5";

  const onCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard?.writeText(number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 border-primary bg-primary/10 text-primary shadow-sm",
        sizeCls,
        className,
      )}
    >
      <Hash className="h-4 w-4 opacity-80" aria-hidden />
      <span className="text-[0.75em] font-semibold uppercase tracking-wider opacity-80">{label}</span>
      <span className="font-mono font-extrabold tracking-[0.18em] tabular-nums">{number}</span>
      {showCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="ml-0.5 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-primary/20 transition"
          aria-label="Copy incident number"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </span>
  );
}
