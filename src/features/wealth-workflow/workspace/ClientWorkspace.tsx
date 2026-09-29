import { format } from "date-fns";
import { Check } from "lucide-react";
import { ClientJourney } from "../map/ClientJourney";
import { CLIENT_WAITING } from "./rules";
import { useLiveWorkspace } from "./useLiveWorkspace";

/** Simplified client workspace: journey, actions, waiting, recently completed. */
export function ClientWorkspace({ patientId }: { patientId: string }) {
  const ws = useLiveWorkspace(patientId);
  if (!ws.workflow) return null;
  const mine = ws.openTasks.filter((t) => t.owner_role === "client");
  const done = ws.completed.filter((c) => c.clientLabel).slice(0, 5);

  return (
    <div className="space-y-3">
      <ClientJourney patientId={patientId} />
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Your actions</p>
          <p className="mt-1 font-medium">{mine.length === 0 ? "Nothing to do right now" : `${mine.length} action${mine.length > 1 ? "s" : ""} to complete`}</p>
          <ul className="mt-2 space-y-2">
            {mine.map((t) => (
              <li key={t.id}>
                <p className="font-medium text-foreground">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.due_date ? `Due ${format(new Date(t.due_date), "d MMMM")}` : "Required to continue your application"}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-card p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">We're waiting for</p>
          <p className="mt-1 text-foreground">{CLIENT_WAITING[ws.workflow.current_stage] ?? "Your Wealth Manager is working on your plan."}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Recently completed</p>
          {done.length === 0 ? <p className="mt-1 text-xs text-muted-foreground">Nothing yet.</p> : (
            <ul className="mt-1 space-y-1">
              {done.map((c) => <li key={c.id} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />{c.clientLabel}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientWorkspace;
