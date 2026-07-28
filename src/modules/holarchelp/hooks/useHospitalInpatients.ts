import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Inpatient = {
  id: string;
  hospital_id: string;
  ward_id: string | null;
  patient_id: string | null;
  patient_user_id: string | null;
  patient_name: string;
  bed_number: string | null;
  admitted_at: string;
  discharged_at: string | null;
  status: string;
  reason: string | null;
  source: string;
  is_sample: boolean;
};

export type AttendingDoctor = {
  id: string;
  admission_id: string;
  doctor_id: string | null;
  doctor_name: string;
  specialty: string | null;
  is_primary: boolean;
  unassigned_at: string | null;
};

export type NurseAssignment = {
  id: string;
  admission_id: string;
  shift_id: string | null;
  nurse_id: string | null;
  nurse_name: string;
  care_role: string;
  care_tasks: string[];
  assigned_at: string;
  released_at: string | null;
};

export type InpatientRecord = Inpatient & {
  doctors: AttendingDoctor[];
  nurses: NurseAssignment[];
};

/** Live inpatient admissions for a hospital, with attending doctors and nurses. */
export function useHospitalInpatients(hospitalId: string | null, includeDischarged = false) {
  const [rows, setRows] = useState<InpatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);

    let query = supabase
      .from("hospital_inpatient_admissions")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("admitted_at", { ascending: false });
    if (!includeDischarged) query = query.neq("status", "discharged");

    const { data: admissions } = await query;
    const list = (admissions ?? []) as Inpatient[];
    const ids = list.map((a) => a.id);

    let doctors: AttendingDoctor[] = [];
    let nurses: NurseAssignment[] = [];
    if (ids.length) {
      const [{ data: d }, { data: n }] = await Promise.all([
        supabase.from("hospital_attending_doctors").select("*").in("admission_id", ids),
        supabase.from("hospital_nurse_assignments").select("*").in("admission_id", ids),
      ]);
      doctors = ((d ?? []) as AttendingDoctor[]);
      nurses = ((n ?? []) as unknown as NurseAssignment[]).map((x) => ({
        ...x,
        care_tasks: Array.isArray(x.care_tasks) ? x.care_tasks : [],
      }));
    }

    setRows(
      list.map((a) => ({
        ...a,
        doctors: doctors.filter((d) => d.admission_id === a.id && !d.unassigned_at),
        nurses: nurses.filter((n) => n.admission_id === a.id && !n.released_at),
      })),
    );
    setLoading(false);
  }, [hospitalId, includeDischarged]);

  useEffect(() => {
    load();
    if (!hospitalId) return;
    const ch = supabase
      .channel(`hosp-inpatients-${hospitalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_inpatient_admissions", filter: `hospital_id=eq.${hospitalId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_attending_doctors" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_nurse_assignments" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospitalId, load]);

  return { inpatients: rows, loading, reload: load };
}
