import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Ward = {
  id: string;
  hospital_id: string;
  name: string;
  ward_type: string;
  bed_capacity: number;
  notes: string | null;
  is_active: boolean;
  is_sample: boolean;
};

export type WardWithOccupancy = Ward & { occupied: number };

/** Wards for a hospital, with live occupancy derived from active admissions. */
export function useHospitalWards(hospitalId: string | null) {
  const [wards, setWards] = useState<WardWithOccupancy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const [{ data: wardRows }, { data: admissions }] = await Promise.all([
      supabase
        .from("hospital_wards")
        .select("*")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("hospital_inpatient_admissions")
        .select("ward_id")
        .eq("hospital_id", hospitalId)
        .neq("status", "discharged"),
    ]);

    const counts = new Map<string, number>();
    for (const row of (admissions ?? []) as { ward_id: string | null }[]) {
      if (!row.ward_id) continue;
      counts.set(row.ward_id, (counts.get(row.ward_id) ?? 0) + 1);
    }

    setWards(
      ((wardRows ?? []) as Ward[]).map((w) => ({ ...w, occupied: counts.get(w.id) ?? 0 })),
    );
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    load();
    if (!hospitalId) return;
    const ch = supabase
      .channel(`hosp-wards-${hospitalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_wards", filter: `hospital_id=eq.${hospitalId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_inpatient_admissions", filter: `hospital_id=eq.${hospitalId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospitalId, load]);

  const totals = wards.reduce(
    (acc, w) => ({ capacity: acc.capacity + (w.bed_capacity || 0), occupied: acc.occupied + w.occupied }),
    { capacity: 0, occupied: 0 },
  );

  return { wards, totals, loading, reload: load };
}
