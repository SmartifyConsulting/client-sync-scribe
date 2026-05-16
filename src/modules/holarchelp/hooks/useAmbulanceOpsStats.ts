import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AmbulanceOpsStats = {
  openSos: number;
  myActive: number;
  completedToday: number;
  currentIncidentId: string | null;
};

export function useAmbulanceOpsStats(providerId: string | null) {
  const [stats, setStats] = useState<AmbulanceOpsStats>({
    openSos: 0, myActive: 0, completedToday: 0, currentIncidentId: null,
  });

  const load = async () => {
    const [{ data: open }, { data: mine }, { count: done }] = await Promise.all([
      supabase.from("holarchelp_incidents" as any)
        .select("id")
        .is("assigned_provider_id", null)
        .in("status", ["open","reopened"]),
      providerId
        ? supabase.from("holarchelp_incidents" as any)
            .select("id,status,created_at")
            .eq("assigned_provider_id", providerId)
            .in("status", ["assigned","en_route","arrived","patient_collected","en_route_to_hospital","at_hospital"])
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      providerId
        ? (async () => {
            const start = new Date(); start.setHours(0,0,0,0);
            return supabase.from("holarchelp_incidents" as any)
              .select("id", { count: "exact", head: true })
              .eq("assigned_provider_id", providerId)
              .eq("status", "completed")
              .gte("completed_at", start.toISOString());
          })()
        : Promise.resolve({ count: 0 }),
    ]);
    const mineRows = ((mine as any)?.data ?? mine ?? []) as any[];
    setStats({
      openSos: ((open as any) ?? []).length,
      myActive: mineRows.length,
      completedToday: (done as any) ?? 0,
      currentIncidentId: mineRows[0]?.id ?? null,
    });
  };

  useEffect(() => {
    load();
    const ch = supabase.channel(`amb-ops-stats-${providerId ?? "anon"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  return { stats, reload: load };
}
