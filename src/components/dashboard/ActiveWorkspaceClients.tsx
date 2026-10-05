import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABEL } from "@/components/dashboard/PipelineOverview";

type Wf = { id: string; current_stage: string; status: string; patient_id: string; patients: { name: string } | null };

/** Every client whose workflow is currently open in the Live Workspace. */
export function ActiveWorkspaceClients() {
  const { user } = useAuth();
  const { data: wfs = [] } = useQuery({
    queryKey: ["dashboard-active-clients", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wealth_workflows" as any)
        .select("id,current_stage,status,patient_id,patients(name)").in("status", ["active", "blocked"]);
      return (data ?? []) as unknown as Wf[];
    },
  });

  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader className="pb-2"><CardTitle className="text-base">Active Workspace Clients</CardTitle></CardHeader>
      <CardContent>
        <ul className="divide-y text-sm">
          {wfs.map((w) => (
            <li key={w.id} className="flex items-center justify-between py-2">
              <Link to={`/patients/${w.patient_id}?tab=live`} className="font-medium hover:underline">{w.patients?.name ?? "Client"}</Link>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{STAGE_LABEL[w.current_stage] ?? w.current_stage}</span>
                {w.status === "blocked" && <Badge variant="destructive">Blocked</Badge>}
              </span>
            </li>
          ))}
          {!wfs.length && <li className="py-2 text-muted-foreground">No active clients yet.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}
