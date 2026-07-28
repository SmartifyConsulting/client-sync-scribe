import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityLog = {
  id: string;
  patient_id: string | null;
  patient_user_id: string | null;
  admission_id: string | null;
  hospital_id: string | null;
  ward_id: string | null;
  action_type: string;
  details: string | null;
  staff_name: string | null;
  staff_role: string | null;
  occurred_at: string;
};

type Scope = { patientId?: string | null; hospitalId?: string | null; limit?: number };

/** Chronological patient touchpoints, scoped to a patient or a whole hospital. */
export function usePatientActivityLog({ patientId, hospitalId, limit = 50 }: Scope) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!patientId && !hospitalId) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    let q = supabase
      .from("patient_activity_logs")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (patientId) q = q.eq("patient_id", patientId);
    if (hospitalId) q = q.eq("hospital_id", hospitalId);
    const { data } = await q;
    setLogs((data ?? []) as ActivityLog[]);
    setLoading(false);
  }, [patientId, hospitalId, limit]);

  useEffect(() => {
    load();
    const key = patientId ?? hospitalId;
    if (!key) return;
    const ch = supabase
      .channel(`activity-log-${key}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "patient_activity_logs" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [patientId, hospitalId, load]);

  return { logs, loading, reload: load };
}

export async function logPatientActivity(entry: {
  patientId: string | null;
  patientUserId?: string | null;
  admissionId?: string | null;
  hospitalId?: string | null;
  wardId?: string | null;
  actionType: string;
  details: string;
  staffName: string;
  staffRole: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("patient_activity_logs").insert({
    patient_id: entry.patientId,
    patient_user_id: entry.patientUserId ?? null,
    admission_id: entry.admissionId ?? null,
    hospital_id: entry.hospitalId ?? null,
    ward_id: entry.wardId ?? null,
    action_type: entry.actionType,
    details: entry.details,
    staff_user_id: auth.user?.id ?? null,
    staff_name: entry.staffName,
    staff_role: entry.staffRole,
  });
  if (error) throw error;
}
