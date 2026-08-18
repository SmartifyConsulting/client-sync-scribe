import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdmissionActivity } from "./useAdmissionChartEntries";

export type InpatientVitals = {
  id: string;
  admission_id: string;
  recorded_by: string | null;
  recorded_by_name: string | null;
  heart_rate: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  spo2: number | null;
  temperature_c: number | null;
  respiratory_rate: number | null;
  notes: string | null;
  recorded_at: string;
};

/** Vitals history for a single ward inpatient admission, newest first. */
export function useInpatientVitals(
  admissionId: string | null | undefined,
  activityContext?: { hospitalId?: string | null; patientName?: string | null },
) {
  const [vitals, setVitals] = useState<InpatientVitals[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!admissionId) { setVitals([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("hospital_inpatient_vitals" as any)
      .select("*")
      .eq("admission_id", admissionId)
      .order("recorded_at", { ascending: false });
    setVitals((data as any) ?? []);
    setLoading(false);
  }, [admissionId]);

  useEffect(() => {
    load();
    if (!admissionId) return;
    const ch = supabase
      .channel(`inpatient-vitals-${admissionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_inpatient_vitals", filter: `admission_id=eq.${admissionId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [admissionId, load]);

  const recordVitals = useCallback(
    async (entry: Partial<Omit<InpatientVitals, "id" | "admission_id" | "recorded_at">>) => {
      if (!admissionId) return;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("hospital_inpatient_vitals" as any).insert({
        admission_id: admissionId,
        recorded_by: user?.id ?? null,
        ...entry,
      });
      if (activityContext?.hospitalId) {
        await logAdmissionActivity({
          hospitalId: activityContext.hospitalId,
          admissionId,
          patientName: activityContext.patientName,
          actorName: entry.recorded_by_name || "Staff",
          section: "vitals",
          action: "added",
          detail: `HR ${entry.heart_rate ?? "—"}, BP ${entry.bp_systolic ?? "—"}/${entry.bp_diastolic ?? "—"}, SpO2 ${entry.spo2 ?? "—"}%`,
        });
      }
    },
    [admissionId, activityContext?.hospitalId, activityContext?.patientName],
  );

  return { vitals, loading, reload: load, recordVitals };
}
