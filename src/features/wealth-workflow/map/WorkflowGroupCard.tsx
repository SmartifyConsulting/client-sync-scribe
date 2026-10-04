import { useState } from "react";
import { Check, ChevronDown, Lock, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { OWNER_LABEL } from "./groups";
import { ownerLabel } from "./stepGuidance";
import type { GroupView } from "./useWorkflowMap";

export function OwnerBadge({ owner, label }: { owner: string; label?: string }) {
  const key = owner === "wealth_manager" ? "advisor" : owner === "provider" ? "insurer" : owner;
  const safe = ["client", "advisor", "insurer", "system"].includes(key) ? key : "system";
  return (
    <span
      className="inline-flex min-w-[64px] justify-center whitespace-nowrap rounded px-1.5 py-0.5 text-2xs font-medium tracking-wide"
      style={{ color: `hsl(var(--owner-${safe}))`, background: `hsl(var(--owner-${safe}-bg))` }}
    >
      {label ?? safe.toUpperCase()}
    </span>
  );
}

const stateLabel: Record<string, string> = {
  completed: "Completed", current: "You are here", pending: "Pending", blocked: "Blocked",
  waiting: "Waiting", not_applicable: "Not applicable",
};

export function WorkflowGroupCard({ view, blockers, onOpen, selectedStep, onSelectStep, viewer = "manager", clientFirst = "Client" }: { view: GroupView; blockers: string[]; onOpen: () => void; selectedStep?: string | null; onSelectStep?: (label: string) => void; viewer?: "manager" | "client"; clientFirst?: string }) {
  const { group: g, state } = view;
  const active = state === "current" || state === "waiting" || state === "blocked";
  const locked = state === "pending";
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = !locked && (userOpen ?? active);
  const setOpen = (f: (o: boolean) => boolean) => !locked && setUserOpen(f(open));
  const Icon = g.icon;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-card text-sm transition-shadow",
        active && state !== "blocked" && "border-primary/50 shadow-sm",
        locked && "bg-muted/20",
        state === "blocked" && "border-destructive/60",
        state === "not_applicable" && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button onClick={locked ? undefined : onOpen} disabled={locked} className="flex flex-1 items-center gap-2 text-left disabled:cursor-default">
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-2xs",
              state === "completed" ? "bg-primary text-primary-foreground"
                : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {state === "completed" ? <Check className="h-3.5 w-3.5" /> : g.n}
          </span>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn("text-sm font-medium tracking-tight", locked ? "text-muted-foreground" : "text-foreground")}>{viewer === "client" ? g.clientTitle : g.title}</span>
          {!locked && (
            <span
              className={cn(
                "ml-1 rounded-full border px-2 py-0 text-2xs font-medium",
                state === "blocked" ? "border-destructive/40 text-destructive"
                  : active ? "border-primary/40 text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {state === "waiting" && view.waitingFor ? `Waiting for ${OWNER_LABEL[view.waitingFor] ?? view.waitingFor}` : stateLabel[state]}
            </span>
          )}
        </button>
        {locked ? (
          <Lock aria-label="Locked until this step is reached" className="mx-1 h-3.5 w-3.5 text-muted-foreground/70" />
        ) : (
          <button aria-label="Toggle" onClick={() => setOpen((o) => !o)} className="p-1 text-muted-foreground">
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      {open && (
        <>
          <ul className="divide-y border-t">
            {view.steps.map((s) => {
              const reachable = s.state === "done" || s.state === "next";
              return (
              <li
                key={s.label}
                onClick={onSelectStep && reachable ? () => onSelectStep(s.label) : undefined}
                aria-disabled={!reachable}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5",
                  onSelectStep && reachable && "cursor-pointer hover:bg-muted/40",
                  !reachable && "opacity-50",
                  s.state === "next" && "mx-1.5 my-1 rounded-xl border border-primary bg-primary/5",
                  s.state === "next" && (viewer === "client" ? s.owner === "client" : s.owner === "advisor") && "animate-throb",
                  selectedStep === s.label && s.state !== "next" && "bg-muted/60",
                )}
              >
                <span className="w-3 text-primary">
                  {s.state === "done" ? <Check className="h-3.5 w-3.5" /> : s.state === "next" ? <span className="block h-2 w-2 rounded-full bg-primary" /> : null}
                </span>
                <OwnerBadge owner={s.owner} label={ownerLabel(s.owner, viewer, clientFirst)} />
                <span className={cn("flex-1", s.state === "done" ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
                {s.state === "next" && <span className="text-xs font-medium text-primary">Next</span>}
              </li>
              );
            })}
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
