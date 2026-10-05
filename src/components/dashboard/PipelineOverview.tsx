import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/badge";

export const STAGE_LABEL: Record<string, string> = {
  consultation: "Meeting", information_required: "Information required", needs_analysis: "Needs analysis",
  research_quotes: "Quotes", recommendation: "Recommendation", client_presentation: "Presentation",
  client_decision: "Client decision", documentation: "Documentation", compliance: "Compliance",
  application: "Application", underwriting: "Underwriting", submission: "Submission", issued: "Issued",
  follow_up: "Follow-up", annual_review: "Annual review", closed_declined: "Declined",
};

type Wf = { id: string; current_stage: string; status: string };

/** Funnel view of every client currently moving through the wealth workflow. */
export function PipelineOverview() {
  const { user } = useAuth();
  const { data: wfs = [] } = useQuery({
    queryKey: ["dashboard-pipeline", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("wealth_workflows" as any)
        .select("id,current_stage,status").in("status", ["active", "blocked"]);
      return (data ?? []) as unknown as Wf[];
    },
  });

  const byStage = new Map<string, number>();
  wfs.forEach((w) => byStage.set(w.current_stage, (byStage.get(w.current_stage) ?? 0) + 1));
  const blocked = wfs.filter((w) => w.status === "blocked");

  return (
    <Panel title="Pipeline" icon={TrendingUp}>
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Active" value={wfs.length} />
          <Stat label="Blocked" value={blocked.length} />
          <Stat label="Issued" value={byStage.get("issued") ?? 0} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...byStage].map(([s, n]) => (
            <Badge key={s} variant="outline" className="text-2xs">{STAGE_LABEL[s] ?? s} · {n}</Badge>
          ))}
          {!wfs.length && <p className="text-xs text-muted-foreground">No clients moving through the pipeline yet.</p>}
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <p className="text-base font-semibold text-foreground">{value}</p>
      <p className="text-2xs text-muted-foreground">{label}</p>
    </div>
  );
}
