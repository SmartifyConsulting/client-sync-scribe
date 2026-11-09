import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABEL } from "@/components/dashboard/PipelineOverview";
import { workspaceVisits } from "@/features/wealth-workflow/workspace/workspaceRecency";

type Wf = { id: string; current_stage: string; status: string; patient_id: string; updated_at: string; patients: { name: string } | null };

/** Every client whose workflow is currently open in the Live Workspace. */
export function ActiveWorkspaceClients() {
  const { user } = useAuth();
  const { data: wfs = [] } = useQuery({
    queryKey: ["dashboard-active-clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wealth_workflows" as any)
        .select("id,current_stage,status,patient_id,updated_at,patients:clients(name)").in("status", ["active", "blocked"]);
      return (data ?? []) as unknown as Wf[];
    },
  });
  const visits = user ? workspaceVisits(user.id) : {};
  const lastUsed = (workflow: Wf) => Math.max(visits[workflow.id] ?? 0, Date.parse(workflow.updated_at) || 0);
  const recentFirst = [...wfs].sort((a, b) => lastUsed(b) - lastUsed(a));

  return (
    <Panel title="Live Workspaces" icon={Users2}>
      <ul className="divide-y text-xs">
        {recentFirst.map((w) => (
          <li key={w.id} className="flex items-center justify-between py-1.5">
            <Link to={`/clients/${w.patient_id}?tab=live`} className="font-medium hover:underline">{w.patients?.name ?? "Client"}</Link>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">{STAGE_LABEL[w.current_stage] ?? w.current_stage}</span>
              {w.status === "blocked" && <Badge variant="destructive" className="text-2xs">Blocked</Badge>}
            </span>
          </li>
        ))}
        {!recentFirst.length && <li className="py-1.5 text-muted-foreground">No live workspaces yet.</li>}
      </ul>
    </Panel>
  );
}
