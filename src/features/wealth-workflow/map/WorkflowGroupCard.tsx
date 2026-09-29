import { useState } from "react";
import { Check, ChevronDown, Lock, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { OWNER_LABEL } from "./groups";
import type { GroupView } from "./useWorkflowMap";

export function OwnerBadge({ owner }: { owner: string }) {
  const key = owner === "wealth_manager" ? "advisor" : owner === "provider" ? "insurer" : owner;
  const safe = ["client", "advisor", "insurer", "system"].includes(key) ? key : "system";
  return (
    <span
      className="inline-flex min-w-[64px] justify-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide"
      style={{ color: `hsl(var(--owner-${safe}))`, background: `hsl(var(--owner-${safe}-bg))` }}
    >
      {safe}
    </span>
  );
}

const stateLabel: Record<string, string> = {
  completed: "Completed", current: "You are here", pending: "Pending", blocked: "Blocked",
  waiting: "Waiting", not_applicable: "Not applicable",
};

export function WorkflowGroupCard({ view, blockers, onOpen }: { view: GroupView; blockers: string[]; onOpen: () => void }) {
  const { group: g, state } = view;
  const active = state === "current" || state === "waiting" || state === "blocked";
  const [open, setOpen] = useState(active || state === "pending");
  const Icon = g.icon;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card text-sm transition-shadow",
        "border-t-4",
        active && state !== "blocked" && "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]",
        state === "blocked" && "border-destructive",
        !active && "border-t-border",
        state === "not_applicable" && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={onOpen} className="flex flex-1 items-center gap-2 text-left">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs",
              state === "completed" ? "bg-primary text-primary-foreground"
                : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {state === "completed" ? <Check className="h-3.5 w-3.5" /> : g.n}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{g.title}</span>
          {state !== "pending" && (
            <span
              className={cn(
                "ml-1 rounded px-2 py-0.5 text-[11px] font-medium",
                state === "blocked" ? "bg-destructive text-destructive-foreground"
                  : active ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {state === "waiting" && view.waitingFor ? `Waiting for ${OWNER_LABEL[view.waitingFor] ?? view.waitingFor}` : stateLabel[state]}
            </span>
          )}
        </button>
        <button aria-label="Toggle" onClick={() => setOpen((o) => !o)} className="p-1 text-muted-foreground">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open && (
        <>
          <ul className="divide-y border-t">
            {view.steps.map((s) => (
              <li
                key={s.label}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  s.state === "next" && "mx-1.5 my-1 rounded border border-primary bg-primary/5",
                )}
              >
                <span className="w-3 text-primary">
                  {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : s.state === "next" ? <span className="block h-2 w-2 rounded-full bg-primary" /> : null}
                </span>
                <OwnerBadge owner={s.owner} />
                <span className={cn("flex-1", s.state === "done" ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
                {s.state === "next" && <span className="text-xs font-medium text-primary">Next</span>}
                {s.state === "unconnected" && <span className="text-[10px] text-muted-foreground">not yet connected</span>}
              </li>
            ))}
          </ul>
          {state === "blocked" && blockers.length > 0 && (
            <div className="border-t bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <p className="font-medium">Required before proceeding:</p>
              <ul className="mt-1 space-y-0.5">{blockers.map((b) => <li key={b}>✕ {b}</li>)}</ul>
            </div>
          )}
          <div className="flex items-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
            {g.key === "issuance" ? <Repeat className="h-3.5 w-3.5" /> : g.key === "gateway" ? <Lock className="h-3.5 w-3.5" /> : null}
            {g.footer}
          </div>
        </>
      )}
    </div>
  );
}
