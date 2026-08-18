import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChartEntry = {
  id: string;
  admission_id: string;
  section: string;
  author_id: string | null;
  author_name: string;
  author_role: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

/** Logs an entry into the read-only hospital admission activity trail. */
export async function logAdmissionActivity(args: {
  hospitalId: string;
  admissionId?: string | null;
  patientName?: string | null;
  actorName: string;
  actorRole?: string | null;
  section?: string | null;
  action: string;
  detail?: string | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("hospital_admission_activity_log" as any).insert({
    hospital_id: args.hospitalId,
    admission_id: args.admissionId ?? null,
    patient_name: args.patientName ?? null,
    actor_id: user?.id ?? null,
    actor_name: args.actorName,
    actor_role: args.actorRole ?? null,
    section: args.section ?? null,
    action: args.action,
    detail: args.detail ?? null,
  });
}

/** CRUD entries for one section of the admitted-patient chart (e.g. "mar", "nursing-notes"). */
export function useAdmissionChartEntries(admissionId: string | null | undefined, section: string) {
  const [entries, setEntries] = useState<ChartEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!admissionId) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("hospital_admission_chart_entries" as any)
      .select("*")
      .eq("admission_id", admissionId)
      .eq("section", section)
      .order("created_at", { ascending: false });
    setEntries((data as any) ?? []);
    setLoading(false);
  }, [admissionId, section]);

  useEffect(() => {
    load();
    if (!admissionId) return;
    const ch = supabase
      .channel(`chart-entries-${admissionId}-${section}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hospital_admission_chart_entries", filter: `admission_id=eq.${admissionId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [admissionId, section, load]);

  const addEntry = useCallback(
    async (content: string, authorName: string, authorRole?: string | null) => {
      if (!admissionId) return;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("hospital_admission_chart_entries" as any).insert({
        admission_id: admissionId,
        section,
        author_id: user?.id ?? null,
        author_name: authorName,
        author_role: authorRole ?? null,
        content,
      });
    },
    [admissionId, section],
  );

  const updateEntry = useCallback(async (id: string, content: string) => {
    await supabase
      .from("hospital_admission_chart_entries" as any)
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", id);
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from("hospital_admission_chart_entries" as any).delete().eq("id", id);
  }, []);

  return { entries, loading, reload: load, addEntry, updateEntry, deleteEntry };
}

export type ActivityLogRow = {
  id: string;
  hospital_id: string;
  admission_id: string | null;
  patient_name: string | null;
  actor_name: string;
  actor_role: string | null;
  section: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

/** Read-only feed of every logged action across a hospital's admission charts. */
export function useHospitalActivityLog(hospitalId: string | null | undefined) {
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hospitalId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("hospital_admission_activity_log" as any)
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(300);
    setRows((data as any) ?? []);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    load();
    if (!hospitalId) return;
    const ch = supabase
      .channel(`activity-log-${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hospital_admission_activity_log", filter: `hospital_id=eq.${hospitalId}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospitalId, load]);

  return { rows, loading, reload: load };
}
