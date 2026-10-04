import { format } from "date-fns";
import { Check, ListChecks, Clock, CheckCircle2 } from "lucide-react";
import { ClientJourney } from "../map/ClientJourney";
import { CLIENT_WAITING } from "./rules";
import { useLiveWorkspace } from "./useLiveWorkspace";
import { Panel } from "@/components/ui/Panel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** First name of the client's Wealth Manager, for personal copy. */
function useManagerFirst(patientId: string) {
  return useQuery({
    queryKey: ["wm-first", patientId],
    queryFn: async () => {
      const { data: p } = await supabase.from("patients").select("user_id").eq("id", patientId).maybeSingle();
      if (!p?.user_id) return null;
      const { data: pr } = await supabase.from("profiles").select("full_name").eq("id", p.user_id).maybeSingle();
      return (pr?.full_name || "").split(" ")[0] || null;
    },
  }).data ?? null;
}

/** Simplified client workspace: journey, actions, waiting, recently completed. */
export function ClientWorkspace({ patientId }: { patientId: string }) {
  const ws = useLiveWorkspace(patientId);
  const wm = useManagerFirst(patientId);
  if (!ws.workflow) return null;
  const mine = ws.openTasks.filter((t) => t.owner_role === "client");
  const done = ws.completed.filter((c) => c.clientLabel).slice(0, 5);

  return (
    <div className="space-y-3">
      <ClientJourney patientId={patientId} />
      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Your actions" icon={ListChecks}>
          <p className="font-medium text-sm">{mine.length === 0 ? "Nothing to do right now" : `${mine.length} action${mine.length > 1 ? "s" : ""} to complete`}</p>
          <ul className="mt-2 space-y-2">
            {mine.map((t) => (
              <li key={t.id}>
                <p className="text-sm font-medium text-foreground">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.due_date ? `Due ${format(new Date(t.due_date), "d MMMM")}` : "Required to continue your application"}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="We're waiting for" icon={Clock}>
          <p className="text-sm text-foreground">{(CLIENT_WAITING[ws.workflow.current_stage] ?? "Your Wealth Manager is working on your plan.").replace("Your Wealth Manager", wm || "Your Wealth Manager")}</p>
        </Panel>
        <Panel title="Recently completed" icon={CheckCircle2}>
          {done.length === 0 ? <p className="text-xs text-muted-foreground">Nothing yet.</p> : (
            <ul className="space-y-1 text-sm">
              {done.map((c) => <li key={c.id} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />{c.clientLabel}</li>)}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

export default ClientWorkspace;
