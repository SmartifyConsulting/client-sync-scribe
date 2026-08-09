import { Activity } from "lucide-react";
import { actionLabel } from "../lib/hospitalWards";
import type { ActivityLog } from "../hooks/usePatientActivityLog";

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

const dayOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

type Bucket = "Today" | "This Week" | "This Month" | "Earlier";

function bucketOf(iso: string): Bucket {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startOfToday) return "Today";
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - ((startOfToday.getDay() + 6) % 7)); // Monday
  if (d >= startOfWeek) return "This Week";
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (d >= startOfMonth) return "This Month";
  return "Earlier";
}

const BUCKET_ORDER: Bucket[] = ["Today", "This Week", "This Month", "Earlier"];

function Row({ log, compact, showDate }: { log: ActivityLog; compact: boolean; showDate: boolean }) {
  return (
    <li className={compact ? "flex gap-3 px-3 py-2" : "flex gap-3 px-4 py-3"}>
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
  );
}

/** Chronological feed of patient touchpoints. */
export function ActivityTimeline({
  logs,
  emptyLabel = "No activity recorded yet",
  showDate = true,
  compact = false,
  grouped = false,
}: {
  logs: ActivityLog[];
  emptyLabel?: string;
  showDate?: boolean;
  compact?: boolean;
  /** Group rows under Today / This Week / This Month headings. */
  grouped?: boolean;
}) {
  if (!logs.length) {
    return (
      <p className="p-6 text-center text-xs text-muted-foreground">{emptyLabel}</p>
    );
  }

  if (grouped) {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );
    return (
      <div>
        {BUCKET_ORDER.map((bucket) => {
          const rows = sorted.filter((l) => bucketOf(l.occurred_at) === bucket);
          if (!rows.length) return null;
          return (
            <div key={bucket}>
              <p className="border-b bg-muted/50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {bucket} · {rows.length}
              </p>
              <ul className="divide-y">
                {rows.map((log) => (
                  <Row key={log.id} log={log} compact={compact} showDate={showDate} />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {logs.map((log) => (
        <Row key={log.id} log={log} compact={compact} showDate={showDate} />
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
