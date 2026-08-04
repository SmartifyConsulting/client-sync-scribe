import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HospitalOpsStats = {
  activeEmergencies: number;
  incomingAmbulances: number;
  icuAvailable: number | null;
  erBedsAvailable: number | null;
  capacityStatus: "green" | "yellow" | "red" | null;
  acceptingPatients: boolean;
  alerts: number;
};

const INCOMING_STATUSES = ["assigned","en_route","arrived","patient_collected","en_route_to_hospital"];

export function useHospitalOpsStats(providerId: string | null) {
  const [stats, setStats] = useState<HospitalOpsStats>({
    activeEmergencies: 0, incomingAmbulances: 0, icuAvailable: null,
    erBedsAvailable: null, capacityStatus: null, acceptingPatients: false, alerts: 0,
  });

  const load = async () => {
    if (!providerId) return;
    const [{ data: hosp }, { data: rows }, { count: alerts }] = await Promise.all([
      supabase.from("holarchelp_hospitals" as any).select("*").eq("id", providerId).maybeSingle(),
      supabase.from("holarchelp_incidents" as any)
        .select("id,status")
        .eq("destination_hospital_id", providerId)
        .in("status", [...INCOMING_STATUSES, "at_hospital"]),
      supabase.from("notifications" as any)
        .select("id", { count: "exact", head: true })
        .eq("type", "hospital_inbound_patient")
        .is("read_at", null),
    ]);
    const h: any = hosp;
    const list: any[] = (rows as any) ?? [];
    setStats({
      activeEmergencies: list.length,
      incomingAmbulances: list.filter((r) => INCOMING_STATUSES.includes(r.status)).length,
      icuAvailable: h?.icu_available ?? null,
      erBedsAvailable: h?.er_beds_available ?? null,
      capacityStatus: h?.er_capacity_status ?? null,
      acceptingPatients: !!h?.accepting_patients,
      alerts: alerts ?? 0,
    });
  };

  useEffect(() => {
    load();
    if (!providerId) return;
    const ch = supabase.channel(`hosp-ops-stats-${providerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "holarchelp_incidents", filter: `destination_hospital_id=eq.${providerId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "holarchelp_hospitals", filter: `id=eq.${providerId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId]);

  return { stats, reload: load };
}
