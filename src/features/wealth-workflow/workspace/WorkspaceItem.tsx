import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OwnerBadge } from "../map/WorkflowGroupCard";
import { PRIORITY_LABEL } from "./rules";
import type { WorkspaceItem as Item } from "./useLiveWorkspace";

export interface ItemAction { label: string; onClick: () => void; variant?: "default" | "outline" | "destructive" | "ghost" }

export function WorkspaceItemRow({ item, actions }: { item: Item; actions: ItemAction[] }) {
  const p = item.priority;
  return (
    <div className="space-y-1.5 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{item.what}</span>
        <OwnerBadge owner={item.who} />
        {PRIORITY_LABEL[p] && (
          <span className={cn(
            "rounded px-1.5 py-0.5 text-2xs font-semibold uppercase",
            p === "overdue" || p === "blocked" ? "bg-destructive/10 text-destructive"
              : p === "due_today" || p === "due_soon" ? "bg-[hsl(var(--owner-insurer-bg))] text-[hsl(var(--owner-insurer))]"
              : "bg-muted text-muted-foreground",
          )}>{PRIORITY_LABEL[p]}</span>
        )}
        {item.due && <span className="ml-auto text-xs text-muted-foreground">Due {format(new Date(item.due), "d MMM")}</span>}
      </div>
      {(item.why || item.next) && (
        <dl className="grid grid-cols-[48px_1fr] gap-x-2 text-xs">
          {item.why && <><dt className="text-muted-foreground">Why</dt><dd className="text-foreground">{item.why}</dd></>}
          {item.next && <><dt className="text-muted-foreground">Next</dt><dd className="text-foreground">{item.next}</dd></>}
        </dl>
      )}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {actions.map((a) => (
            <Button key={a.label} size="sm" variant={a.variant ?? "outline"} className="h-7 px-2 text-xs" onClick={a.onClick}>{a.label}</Button>
          ))}
        </div>
      )}
    </div>
  );
}
