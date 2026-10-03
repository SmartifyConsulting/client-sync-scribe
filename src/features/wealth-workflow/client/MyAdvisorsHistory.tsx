import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Users2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Panel } from "@/components/ui/Panel";

/** History of every Wealth Manager / broker who has served this client. */
export function MyAdvisorsHistory({ patientId }: { patientId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["my-advisors-history", patientId],
    queryFn: async () => {
      const { data: p } = await supabase.from("patients").select("user_id, patient_user_id, created_at").eq("id", patientId).maybeSingle();
      const rows: { id: string; from: string; to: string | null; active: boolean }[] = [];
      if (p?.patient_user_id) {
        const { data: acc } = await supabase
          .from("doctor_patient_access")
          .select("doctor_id, granted_at, revoked_at, is_active")
          .eq("patient_user_id", p.patient_user_id);
        for (const a of acc ?? []) rows.push({ id: a.doctor_id, from: a.granted_at, to: a.revoked_at, active: a.is_active && !a.revoked_at });
      }
      if (p?.user_id && p.user_id !== p.patient_user_id && !rows.some((r) => r.id === p.user_id)) {
        rows.push({ id: p.user_id, from: p.created_at, to: null, active: true });
      }
      const ids = [...new Set(rows.map((r) => r.id))];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name, specialty").in("id", ids)
        : { data: [] as any[] };
      const byId = new Map((profs ?? []).map((x: any) => [x.id, x]));
      return rows
        .map((r) => ({ ...r, name: byId.get(r.id)?.full_name || "Unknown Wealth Manager", focus: byId.get(r.id)?.specialty }))
        .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || b.from.localeCompare(a.from));
    },
  });

  return (
    <Panel title="My Advisors" icon={Users2}>
      <p className="text-xs text-muted-foreground mb-3">Every Wealth Manager who has looked after your affairs, over time.</p>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : data.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No advisers have been linked to your profile yet.</p>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-3">
          {data.map((a, i) => (
            <li key={`${a.id}-${i}`} className="ml-4">
              <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full ${a.active ? "bg-primary" : "bg-muted-foreground/40"}`} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{a.name}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-2xs font-medium ${a.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {a.active ? "Current" : "Past"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {a.focus ? `${a.focus} · ` : ""}
                {format(new Date(a.from), "MMM yyyy")} – {a.to ? format(new Date(a.to), "MMM yyyy") : "present"}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
