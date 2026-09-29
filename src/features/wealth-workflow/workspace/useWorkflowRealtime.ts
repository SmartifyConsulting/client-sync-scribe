import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEYS = ["wealth-workflow", "wealth-recs", "wealth-audit", "wealth-blockers", "wealth-map-records"];

/** Refreshes wealth queries when any underlying record changes. RLS scopes the events. */
export function useWorkflowRealtime(patientId?: string, workflowId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!patientId) return;
    const refresh = () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    const ch = supabase.channel(`wealth-${patientId}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "wealth_workflows", filter: `patient_id=eq.${patientId}` }, refresh);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "todos", filter: `patient_id=eq.${patientId}` }, refresh);
    if (workflowId) {
      ["wealth_workflow_transitions", "wealth_recommendations", "wealth_applications", "wealth_compliance_checks"].forEach((t) =>
        ch.on("postgres_changes", { event: "*", schema: "public", table: t, filter: `workflow_id=eq.${workflowId}` }, refresh),
      );
    }
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId, workflowId, qc]);
}
