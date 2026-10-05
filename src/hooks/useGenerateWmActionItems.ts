import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WORKFLOW_GROUPS } from "@/features/wealth-workflow/map/groups";
import { STAGE_LABEL } from "@/components/dashboard/PipelineOverview";

type Wf = { id: string; current_stage: string; status: string; patient_id: string; patients: { name: string } | null };

/** First advisor-owned step for a given workflow stage, read statically from
 *  the stage map (not per-client `done` predicates — those need the full
 *  Live Workspace context for one client at a time, too costly to run for
 *  every active client on every dashboard load). */
function advisorStepFor(stage: string): string | null {
  const group = WORKFLOW_GROUPS.find((g) => (g.stages as string[]).includes(stage));
  return group?.steps.find((s) => s.owner === "advisor")?.label ?? null;
}

/** Ensures every client currently waiting on the Wealth Manager has an open
 *  action item in their To Do list, naming the client it's for. Runs once
 *  per dashboard visit; skips clients that already have a matching open
 *  task so it never duplicates. */
export function useGenerateWmActionItems() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data: wfs } = await supabase.from("wealth_workflows" as any)
        .select("id,current_stage,status,patient_id,patients(name)")
        .in("status", ["active", "blocked"]);
      if (cancelled || !wfs?.length) return;

      const wanted = (wfs as unknown as Wf[])
        .map((w) => {
          const clientName = w.patients?.name ?? "Client";
          if (w.status === "blocked") {
            return { patient_id: w.patient_id, title: `Unblock ${clientName}'s workflow — stuck at ${STAGE_LABEL[w.current_stage] ?? w.current_stage}` };
          }
          const step = advisorStepFor(w.current_stage);
          return step ? { patient_id: w.patient_id, title: `${clientName}: ${step}` } : null;
        })
        .filter((t): t is { patient_id: string; title: string } => !!t);
      if (!wanted.length) return;

      const patientIds = [...new Set(wanted.map((t) => t.patient_id))];
      const { data: existing } = await supabase.from("todos")
        .select("title,patient_id")
        .eq("user_id", user.id).eq("assignee", "doctor").eq("status", "pending")
        .in("patient_id", patientIds);
      const existingKeys = new Set((existing ?? []).map((t: any) => `${t.patient_id}::${t.title}`));

      const toInsert = wanted
        .filter((t) => !existingKeys.has(`${t.patient_id}::${t.title}`))
        .map((t) => ({ user_id: user.id, assignee: "doctor", status: "pending", priority: "medium", title: t.title, patient_id: t.patient_id }));
      if (!toInsert.length || cancelled) return;
      await supabase.from("todos").insert(toInsert as any);
    })();

    return () => { cancelled = true; };
  }, [user]);
}
