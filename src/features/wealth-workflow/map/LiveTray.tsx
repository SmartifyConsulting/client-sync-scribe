import { Check, ChevronDown, Hourglass, Lock, MinusCircle, PlusCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { OWNER_LABEL } from "./groups";
import { StepAvatar, type MapAvatars } from "./StepAvatar";
import type { GroupView } from "./useWorkflowMap";

interface Props {
  groups: GroupView[];
  viewer: "manager" | "client";
  clientFirst: string;
  managerName: string;
  nextTitle?: string | null;
  avatars?: MapAvatars;
  /** Working panel embedded under the pulsing step. */
  working?: ReactNode;
  /** Working panel for a step the user picked (not the live one). */
  pickedWorking?: ReactNode;
  /** Renders the saved record of a completed sub-step. */
  history?: (groupKey: string, stepLabel: string) => ReactNode;
  /** Legend shown at the bottom of the tray. */
  legend?: ReactNode;
}

export const isMine = (owner: string, viewer: "manager" | "client") =>
  viewer === "client" ? owner === "client" : owner === "advisor" || owner === "wealth_manager";

function StepTick({ owner }: { owner: string }) {
  return (
    <span className={cn("flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full", owner === "advisor" ? "bg-blue-600" : "bg-emerald-600")}>
      <Check className="h-3.5 w-3.5 text-white" strokeWidth={5} />
    </span>
  );
}

/** A completed sub-step that can be expanded to see what happened. */
function DoneStep({ groupKey, label, owner, history }: { groupKey: string; label: string; owner: string; history?: Props["history"] }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button type="button" onClick={() => history && setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50">
        <StepTick owner={owner} /> <span className="flex-1">{label}</span>
        {history && <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />}
      </button>
      {open && history && <div className="ml-6 mt-1 rounded-lg border border-border/70 bg-muted/20 p-1">{history(groupKey, label)}</div>}
    </li>
  );
}

/** Live Workspace: every step listed; completed collapsed (expandable), current open, later locked. */
export function LiveTray({ groups, viewer, clientFirst, managerName, avatars, working, pickedWorking, history, legend }: Props) {
  const visible = groups.filter((g) => g.state !== "not_applicable");
  const [openDone, setOpenDone] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-2.5">
      {pickedWorking && <div className="rounded-xl border border-primary/40 bg-card p-1.5">{pickedWorking}</div>}
      {visible.map((g) => {
        const done = g.state === "completed";
        const active = ["current", "waiting", "blocked"].includes(g.state);
        const title = `Step ${g.group.n} · ${g.group.title}`;

        if (!done && !active) {
          return (
            <div key={g.group.key} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 opacity-70">
              <span className="text-2xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{title}</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Locked" />
            </div>
          );
        }

        if (done) {
          const isOpen = !!openDone[g.group.key];
          return (
            <div key={g.group.key} className="rounded-xl border border-border p-1.5">
              <button type="button" onClick={() => setOpenDone((o) => ({ ...o, [g.group.key]: !isOpen }))} aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-left">
                <span className="text-2xs font-semibold uppercase tracking-[0.15em] text-foreground">{title}</span>
                <span className="flex items-center gap-2 text-primary">
                  <Check className="h-4 w-4" strokeWidth={3} />
                  {isOpen ? <MinusCircle className="h-4 w-4 text-foreground" /> : <PlusCircle className="h-4 w-4 text-foreground" />}
                </span>
              </button>
              {isOpen && (
                <ul className="mt-1.5 space-y-1 px-1.5 pb-1">
                  {g.steps.map((s) => <DoneStep key={s.label} groupKey={g.group.key} label={s.label} owner={s.owner} history={history} />)}
                </ul>
              )}
            </div>
          );
        }

        const doneSteps = g.steps.filter((s) => s.state === "done");
        const cur = g.steps.find((s) => s.state === "next");
        const mine = cur ? isMine(cur.owner, viewer) : false;
        const waitingOn = cur
          ? cur.owner === "client" ? (viewer === "client" ? "you" : clientFirst)
            : cur.owner === "advisor" ? (viewer === "manager" ? "you" : managerName)
            : cur.owner === "insurer" ? "the insurer" : "Elysian (Pty) Ltd (automatic)"
          : g.waitingFor ? OWNER_LABEL[g.waitingFor] ?? g.waitingFor : null;

        return (
          <div key={g.group.key} className="rounded-xl border border-border p-1.5">
            <div className="flex items-center justify-between rounded-lg bg-foreground px-3 py-2 text-background">
              <span className="text-2xs font-semibold uppercase tracking-[0.15em]">{title}</span>
              <MinusCircle className="h-4 w-4" />
            </div>
            <ul className="mt-1.5 space-y-1 px-1.5">
              {doneSteps.map((s) => <DoneStep key={s.label} groupKey={g.group.key} label={s.label} owner={s.owner} history={history} />)}
              {cur && (
                <li className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white",
                  cur.owner === "advisor" ? "bg-blue-600" : "bg-emerald-600",
                  mine && "animate-throb",
                )}>
                  <StepAvatar owner={cur.owner} avatars={avatars} className="-ml-1.5 ring-white" />
                  <span className="font-medium">{cur.label}</span>
                  {!mine && <Hourglass className="ml-auto h-3.5 w-3.5 flex-none animate-pulse-soft text-white" aria-label="In progress" />}
                </li>
              )}
            </ul>
            {cur && working && <div className="px-1.5 pb-1">{working}</div>}
            {cur && !mine && (
              <p className="px-4 pb-2 pt-1 text-2xs text-muted-foreground">Waiting on {waitingOn}</p>
            )}
          </div>
        );
      })}
      {legend && <div className="flex flex-wrap items-center justify-end gap-1.5 border-t border-border/60 pt-2">{legend}</div>}
    </div>
  );
}

export default LiveTray;
