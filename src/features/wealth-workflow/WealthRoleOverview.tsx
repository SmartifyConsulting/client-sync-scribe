import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STAGE_LABEL: Record<string, string> = {
  consultation: "Consultation", information_required: "Information required", needs_analysis: "Needs analysis",
  research_quotes: "Quotes", recommendation: "Recommendation", client_presentation: "Presentation",
  client_decision: "Client decision", documentation: "Documentation", compliance: "Compliance",
  application: "Application", underwriting: "Underwriting", submission: "Submission", issued: "Issued",
  follow_up: "Follow-up", annual_review: "Annual review", closed_declined: "Declined",
};

type Wf = { id: string; current_stage: string; status: string; patient_id: string; patients: { name: string } | null };
type App = { id: string; product: string | null; provider: string | null; status: string | null; submitted_at: string | null; review_date: string | null };

/** Role-aware wealth overview: Wealth Manager / FSP pipeline, or Insurer underwriting desk. */
export function WealthRoleOverview() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["wealth-role-overview", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: roles }, { data: firm }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
        supabase.from("practices").select("id,name").eq("owner_id", user!.id).maybeSingle(),
      ]);
      const isInsurer = (roles ?? []).some((r: any) => r.role === "insurer_staff");
      if (isInsurer) {
        const { data: apps } = await supabase.from("wealth_applications" as any)
          .select("id,product,provider,status,submitted_at,review_date").order("submitted_at", { ascending: false });
        return { mode: "insurer" as const, apps: (apps ?? []) as unknown as App[] };
      }
      const { data: wfs } = await supabase.from("wealth_workflows" as any)
        .select("id,current_stage,status,patient_id,patients(name)").in("status", ["active", "blocked"]);
      return { mode: firm ? ("fsp" as const) : ("wm" as const), firm: firm?.name, wfs: (wfs ?? []) as unknown as Wf[] };
    },
  });
  if (!data) return null;

  if (data.mode === "insurer") {
    const pending = data.apps.filter((a) => a.status !== "issued");
    return (
      <Card className="border-t-4 border-t-primary">
        <CardHeader className="pb-2"><CardTitle className="text-base">Underwriting desk</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-center">
            <Stat label="Awaiting decision" value={pending.length} />
            <Stat label="Policies issued" value={data.apps.length - pending.length} />
          </div>
          <ul className="divide-y text-sm">
            {data.apps.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <span>{a.product} <span className="text-muted-foreground">· {a.provider}</span></span>
                <Badge variant={a.status === "issued" ? "secondary" : "outline"}>{a.status === "issued" ? "Issued" : "Underwriting"}</Badge>
              </li>
            ))}
            {!data.apps.length && <li className="py-2 text-muted-foreground">No applications have been submitted to you yet.</li>}
          </ul>
        </CardContent>
      </Card>
    );
  }

  const byStage = new Map<string, number>();
  data.wfs.forEach((w) => byStage.set(w.current_stage, (byStage.get(w.current_stage) ?? 0) + 1));
  const blocked = data.wfs.filter((w) => w.status === "blocked");
  return (
    <Card className="border-t-4 border-t-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{data.mode === "fsp" ? `Firm pipeline · ${data.firm}` : "Client pipeline"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Active clients" value={data.wfs.length} />
          <Stat label="Blocked" value={blocked.length} />
          <Stat label="Issued" value={byStage.get("issued") ?? 0} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...byStage].map(([s, n]) => (
            <Badge key={s} variant="outline">{STAGE_LABEL[s] ?? s} · {n}</Badge>
          ))}
        </div>
        <ul className="divide-y text-sm">
          {data.wfs.map((w) => (
            <li key={w.id} className="flex items-center justify-between py-2">
              <Link to={`/patients/${w.patient_id}?tab=live`} className="font-medium hover:underline">{w.patients?.name ?? "Client"}</Link>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">{STAGE_LABEL[w.current_stage] ?? w.current_stage}</span>
                {w.status === "blocked" && <Badge variant="destructive">Blocked</Badge>}
              </span>
            </li>
          ))}
          {!data.wfs.length && <li className="py-2 text-muted-foreground">No active clients yet.</li>}
        </ul>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-2">
      <p className="text-xl font-semibold text-foreground">{value}</p>
      <p className="text-2xs text-muted-foreground">{label}</p>
    </div>
  );
}
