import { Activity } from "lucide-react";
import { actionLabel } from "../lib/hospitalWards";
import type { ActivityLog } from "../hooks/usePatientActivityLog";

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

/** Chronological feed of patient touchpoints. */
export function ActivityTimeline({
  logs,
  emptyLabel = "No activity recorded yet",
  showDate = true,
  compact = false,
}: {
  logs: ActivityLog[];
  emptyLabel?: string;
  showDate?: boolean;
  compact?: boolean;
}) {
  if (!logs.length) {
    return (
      <p className="p-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
    );
  }

  return (
    <ul className="divide-y">
      {logs.map((log) => (
        <li key={log.id} className={compact ? "flex gap-3 px-3 py-2" : "flex gap-3 px-4 py-3"}>
          <span className="w-20 shrink-0 text-xs tabular-nums text-muted-foreground">
            {showDate ? `${dayOf(log.occurred_at)} ` : ""}
            {timeOf(log.occurred_at)}
          </span>
          <span className="w-36 shrink-0 truncate text-xs font-semibold text-foreground">
            {log.staff_name || "System"}
            {log.staff_role ? (
              <span className="block text-[11px] font-normal capitalize text-muted-foreground">
                {log.staff_role.replace(/_/g, " ")}
              </span>
            ) : null}
          </span>
          <span className="min-w-0 flex-1 text-xs text-foreground">
            <span className="font-semibold">{actionLabel(log.action_type)}</span>
            {log.details ? <span className="text-muted-foreground"> — {log.details}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ActivityTimelineHeader({ title = "Activity log" }: { title?: string }) {
  return (
    <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
      <Activity className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-bold">{title}</h3>
    </div>
  );
}
