import { Check, Loader2, AlertTriangle } from "lucide-react";
import type { AutosaveStatus } from "@/features/admin/hooks/useAutosave";

export function AutosaveIndicator({
  status,
  error,
  className = "",
}: {
  status: AutosaveStatus;
  error?: string | null;
  className?: string;
}) {
  if (status === "idle") return null;
  const base = "inline-flex items-center gap-1 text-sm font-medium " + className;
  if (status === "dirty")
    return <span className={`${base} text-[hsl(var(--admin-text-tertiary))]`}>Edited…</span>;
  if (status === "saving")
    return (
      <span className={`${base} text-[hsl(var(--admin-text-tertiary))]`}>
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  if (status === "saved")
    return (
      <span className={`${base} text-emerald-600`}>
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  return (
    <span className={`${base} text-destructive`} title={error ?? undefined}>
      <AlertTriangle className="h-3 w-3" /> {error || "Save failed"}
    </span>
  );
}
