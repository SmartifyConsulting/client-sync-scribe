import { useState } from "react";
import { Check, Lock, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { OWNER_LABEL } from "./groups";
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
  completed: "Completed", pending: "Pending", blocked: "Blocked",
  waiting: "Waiting", not_applicable: "Not applicable",
};

export function WorkflowGroupCard({ view, blockers, onOpen, selectedStep, onSelectStep, viewer = "manager", clientFirst = "Client" }: { view: GroupView; blockers: string[]; onOpen: () => void; selectedStep?: string | null; onSelectStep?: (label: string) => void; viewer?: "manager" | "client"; clientFirst?: string }) {
  const { group: g, state } = view;
  const active = state === "current" || state === "waiting" || state === "blocked";
  const locked = state === "pending";
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = true; void userOpen;
  const Icon = g.icon;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border/70 bg-card text-xs transition-shadow",
        active && state !== "blocked" && "border-primary/50 shadow-sm",
        locked && "opacity-70",
        state === "blocked" && "border-destructive/60",
        state === "not_applicable" && "opacity-50",
      )}
    >
      <div className={cn("flex items-center gap-1.5 bg-primary px-2.5 py-1.5", locked && "opacity-80")}>
        <button onClick={locked ? undefined : onOpen} disabled={locked} className="flex flex-1 items-center gap-2 text-left disabled:cursor-default">
          <span className="flex items-center justify-center rounded-full bg-white px-2 py-0.5 text-2xs font-semibold text-primary">
            {state === "completed" ? <Check className="h-3.5 w-3.5" /> : `Step ${g.n}`}
          </span>
          <Icon className="h-3.5 w-3.5 text-primary-foreground" />
          <span className="text-xs font-medium tracking-tight text-primary-foreground">{viewer === "client" ? g.clientTitle : g.title}</span>
          {!locked && state !== "current" && (
            <span
              className={cn(
                "ml-1 rounded-full border px-2 py-0 text-2xs font-medium",
                state === "blocked" ? "border-destructive-foreground/50 text-destructive-foreground"
                  : "border-primary-foreground/40 text-primary-foreground",
              )}
            >
              {state === "waiting" && view.waitingFor ? `Waiting for ${OWNER_LABEL[view.waitingFor] ?? view.waitingFor}` : stateLabel[state]}
            </span>
          )}
        </button>
        {locked ? (
          <Lock aria-label="Locked until this step is reached" className="mx-1 h-3.5 w-3.5 text-primary-foreground/70" />
        ) : null}
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
                  "flex items-center gap-1.5 px-2.5 py-1 text-xs",
                  onSelectStep && reachable && "cursor-pointer hover:bg-muted/40",
                  !reachable && "opacity-50",
                  s.state === "next" && "mx-1 my-0.5 rounded-lg border border-primary bg-primary/5",
                  s.state === "next" && (viewer === "client" ? s.owner === "client" : s.owner === "advisor") && "animate-throb",
                  selectedStep === s.label && s.state !== "next" && "bg-muted/60",
                )}
              >
                <span className="flex w-4 flex-none items-center justify-center">
                  {s.state === "done" ? (
                    <span className={cn("flex h-4 w-4 items-center justify-center rounded-full", s.owner === "advisor" ? "bg-blue-500" : "bg-emerald-500")}>
                      <Check className="h-2.5 w-2.5 text-white" />
                    </span>
                  ) : s.state === "next" ? (
                    <span className="block h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </span>
                <span className={cn("flex-1", s.state === "done" ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
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
          <div className="flex items-center gap-1.5 border-t px-2.5 py-1 text-2xs text-muted-foreground">
            {g.key === "issuance" ? <Repeat className="h-3.5 w-3.5" /> : g.key === "gateway" ? <Lock className="h-3.5 w-3.5" /> : null}
            {g.footer}
          </div>
        </>
      )}
    </div>
  );
}
