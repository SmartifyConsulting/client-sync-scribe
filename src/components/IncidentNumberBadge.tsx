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
  label = "Ref",
}: Props) {
  const [copied, setCopied] = useState(false);
  if (!number) return null;

  const sizeCls =
    size === "lg"
      ? "text-base px-3 py-1.5"
      : size === "sm"
      ? "text-[11px] px-2 py-0.5"
      : "text-sm px-2.5 py-1";

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
        "inline-flex items-center gap-1.5 rounded-full border-2 border-primary/40 bg-primary/5 font-mono font-semibold tracking-wider text-primary",
        sizeCls,
        className,
      )}
    >
      <Hash className="h-3.5 w-3.5 opacity-70" aria-hidden />
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{number}</span>
      {showCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-primary/10 transition"
          aria-label="Copy reference number"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </span>
  );
}
