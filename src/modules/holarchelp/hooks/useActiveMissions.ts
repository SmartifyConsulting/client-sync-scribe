import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActiveMission = {
  id: string;
  incident_number?: string | null;
  status: string;
  severity: string | null;
  destination_hospital_id?: string | null;
  destination_hospital_name?: string | null;
  eta_minutes?: number | null;
  last_eta_update?: string | null;
  vehicle_code?: string | null;
};

const ACTIVE_STATUSES = [
  "assigned",
  "en_route",
  "arrived",
  "patient_collected",
  "en_route_to_hospital",
  "at_hospital",
];

export function useActiveMissions(providerId: string | null | undefined) {
  const [missions, setMissions] = useState<ActiveMission[]>([]);

  const load = async () => {
    if (!providerId) return;
    const { data: incs } = await supabase
      .from("holarchelp_incidents" as any)
      .select(
        "id, incident_number, status, severity, destination_hospital_id, eta_minutes, last_eta_update, assigned_paramedic_user_id"
      )
      .eq("assigned_provider_id", providerId)
      .in("status", ACTIVE_STATUSES)
      .order("accepted_at", { ascending: false });
    const list = ((incs as any[]) ?? []);
    if (!list.length) {
      setMissions([]);
      return;
    }
    const hospIds = Array.from(new Set(list.map((r) => r.destination_hospital_id).filter(Boolean)));
    const paraIds = Array.from(new Set(list.map((r) => r.assigned_paramedic_user_id).filter(Boolean)));
    const [{ data: hosps }, { data: shf }] = await Promise.all([
      hospIds.length
        ? supabase.from("holarchelp_hospitals" as any).select("id, name").in("id", hospIds)
        : Promise.resolve({ data: [] as any[] }),
      paraIds.length
        ? supabase
            .from("paramedic_shifts" as any)
            .select("user_id, ambulances(vehicle_code)")
            .eq("provider_id", providerId)
            .is("ended_at", null)
            .in("user_id", paraIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const hm = new Map((hosps as any[] ?? []).map((h) => [h.id, h.name]));
    const sm = new Map((shf as any[] ?? []).map((s: any) => [s.user_id, s.ambulances?.vehicle_code]));
    setMissions(
      list.map((r) => ({
        id: r.id,
        incident_number: r.incident_number,
        status: r.status,
        severity: r.severity,
        destination_hospital_id: r.destination_hospital_id,
        destination_hospital_name: hm.get(r.destination_hospital_id) ?? null,
        eta_minutes: r.eta_minutes,
        last_eta_update: r.last_eta_update,
        vehicle_code: sm.get(r.assigned_paramedic_user_id) ?? null,
      }))
    );
  };

  useEffect(() => {
    if (!providerId) return;
    load();
    const ch = supabase
      .channel(`active-missions-${providerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holarchelp_incidents" },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  return missions;
}
