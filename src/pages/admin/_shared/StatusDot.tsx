import { cn } from "@/lib/utils";

type Tone = "active" | "pending" | "suspended" | "inactive";

const map: Record<Tone, { color: string; label: string }> = {
  active:    { color: "bg-[hsl(var(--admin-status-active))]",    label: "Active" },
  pending:   { color: "bg-[hsl(var(--admin-status-pending))]",   label: "Pending" },
  suspended: { color: "bg-[hsl(var(--admin-status-suspended))]", label: "Suspended" },
  inactive:  { color: "bg-[hsl(var(--admin-status-inactive))]",  label: "Inactive" },
};

export function StatusDot({ tone, label, className }: { tone: Tone; label?: string; className?: string }) {
  const cfg = map[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-[hsl(var(--admin-text-primary))]", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.color)} />
      {label ?? cfg.label}
    </span>
  );
}

export function statusToTone(status: string): Tone {
  const s = (status || "").toLowerCase();
  if (s === "approved" || s === "active") return "active";
  if (s === "pending") return "pending";
  if (s === "suspended" || s === "rejected") return "suspended";
  return "inactive";
}

export default StatusDot;
