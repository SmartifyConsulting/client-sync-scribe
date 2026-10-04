import { Check, Lock, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { OWNER_LABEL } from "./groups";
import { ownerLabel } from "./stepGuidance";
import type { GroupView } from "./useWorkflowMap";

interface Props {
  groups: GroupView[];
  viewer: "manager" | "client";
  clientFirst: string;
  managerName: string;
  nextTitle?: string | null;
}

export const isMine = (owner: string, viewer: "manager" | "client") =>
  viewer === "client" ? owner === "client" : owner === "advisor" || owner === "wealth_manager";

/** Live Workspace tray: completed steps ticked, current step open, later steps locked. */
export function LiveTray({ groups, viewer, clientFirst, managerName }: Props) {
  const visible = groups.filter((g) => g.state !== "not_applicable");
  return (
    <div className="space-y-2.5">
      {visible.map((g) => {
        const done = g.state === "completed";
        const active = ["current", "waiting", "blocked"].includes(g.state);
        const title = `Step ${g.group.n} · ${g.group.title}`;

        if (!done && !active) {
          return null;
          return (
            <div key={g.group.key} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5">
              <span className="text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{title}</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Locked" />
            </div>
          );
        }

        if (done) {
          return (
            <div key={g.group.key} className="rounded-xl border border-border p-1.5">
              <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
                <span className="text-2xs font-semibold uppercase tracking-[0.15em] text-foreground">{title}</span>
                <span className="flex items-center gap-2 text-primary"><Check className="h-4 w-4" /><MinusCircle className="h-4 w-4 text-foreground" /></span>
              </div>
              <ul className="mt-1.5 space-y-1.5 px-1.5 pb-1">
                {g.steps.map((s) => (
                  <li key={s.label} className="flex items-center gap-2 rounded-full border border-primary/60 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" /> {s.label}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        const doneSteps = g.steps.filter((s) => s.state === "done");
        const cur = g.steps.find((s) => s.state === "next");
        const mine = cur ? isMine(cur.owner, viewer) : false;
        const waitingOn = cur
          ? cur.owner === "client" ? (viewer === "client" ? "you" : clientFirst)
            : cur.owner === "advisor" ? (viewer === "manager" ? "you" : managerName)
            : cur.owner === "insurer" ? "the insurer" : "Holarc Wealth (automatic)"
          : g.waitingFor ? OWNER_LABEL[g.waitingFor] ?? g.waitingFor : null;

        return (
          <div key={g.group.key} className="rounded-xl border border-border p-1.5">
            <div className="flex items-center justify-between rounded-lg bg-foreground px-3 py-2 text-background">
              <span className="text-2xs font-semibold uppercase tracking-[0.15em]">{title}</span>
              <MinusCircle className="h-4 w-4" />
            </div>
            <ul className="mt-1.5 space-y-1.5 px-1.5">
              {doneSteps.map((s) => (
                <li key={s.label} className="flex items-center gap-2 rounded-full border border-primary/60 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" /> {s.label}
                </li>
              ))}
              {cur && (
                <li className={cn("flex items-center gap-2 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs text-foreground", mine && "animate-throb")}>
                  <span className="text-2xs font-semibold text-muted-foreground">{ownerLabel(cur.owner, viewer, clientFirst)}</span>
                  {cur.label}
                </li>
              )}
            </ul>
            {cur && (
              <p className="px-4 pb-2 pt-1 text-2xs text-muted-foreground">
                {mine ? "Your turn" : `Waiting on ${waitingOn}`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default LiveTray;
