import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderAccess } from "../../../components/ProviderGate";
import ErCapacityScreen from "./ErCapacityScreen";
import { Badge } from "@/components/ui/badge";
import { HeartPulse } from "lucide-react";
import { SECTION_FRAME_CLASS, SECTION_ITEM_CLASS } from "@/components/ui/section-accordion";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  incident_number: string | null;
  status: string;
  severity: string | null;
  assigned_trauma_bay: string | null;
  assigned_doctor_name: string | null;
  handover_status: string | null;
};

/** Trauma Bays — bay capacity plus live bay assignments from shared incidents. */
export default function TraumaBaysScreen() {
  const { providerId } = useProviderAccess();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!providerId) return;
      const { data } = await supabase
        .from("holarchelp_incidents" as any)
        .select("*")
        .eq("destination_hospital_id", providerId)
        .not("assigned_trauma_bay", "is", null)
        .in("status", ["assigned", "en_route", "arrived", "patient_collected", "en_route_to_hospital", "at_hospital"])
        .order("created_at", { ascending: false })
        .limit(50);
      setRows(((data as any) ?? []) as Row[]);
    };
    load();
    if (!providerId) return;
    const ch = supabase
      .channel(`trauma-bays-${providerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [providerId]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold text-foreground">Trauma Bays</h1>

      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <HeartPulse className="h-3.5 w-3.5" /> Current bay assignments
        </p>
        {!rows.length ? (
          <p className="text-sm text-muted-foreground">No trauma bays currently assigned.</p>
        ) : (
          <div className={SECTION_FRAME_CLASS}>
            {rows.map((r) => (
              <div key={r.id} className={cn(SECTION_ITEM_CLASS, "flex flex-wrap items-center justify-between gap-2 px-3 py-3")}>
                <div className="min-w-0">
                  <p className="text-sm font-bold">{r.assigned_trauma_bay}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.incident_number ?? r.id.slice(0, 8)} · {r.status.replace(/_/g, " ")}
                    {r.assigned_doctor_name ? ` · ${r.assigned_doctor_name}` : ""}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {r.severity && <Badge variant="outline">{r.severity}</Badge>}
                  {r.handover_status && <Badge variant="outline">Handover {r.handover_status.replace(/_/g, " ")}</Badge>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ErCapacityScreen />
    </div>
  );
}
