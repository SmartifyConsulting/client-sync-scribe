import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logAdmissionActivity } from "./useAdmissionChartEntries";

export type StaffShift = {
  id: string;
  hospital_id: string;
  ward_id: string | null;
  staff_role: string;
  doctor_id: string | null;
  nurse_id: string | null;
  staff_name: string;
  shift_type: string;
  starts_at: string;
  ends_at: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  status: string;
  is_sample: boolean;
  rest_ack_by?: string | null;
  rest_ack_at?: string | null;
  rest_ack_note?: string | null;
  notes?: string | null;
};


/** Shift roster for a hospital (optionally limited to a ward). */
export function useHospitalShifts(hospitalId: string | null, wardId?: string | null) {
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    let q = supabase
      .from("hospital_staff_shifts")
      .select("*")
      .eq("hospital_id", hospitalId)
      .gte("ends_at", new Date(Date.now() - 7 * 864e5).toISOString())
      .order("starts_at", { ascending: true });
    if (wardId) q = q.eq("ward_id", wardId);
    const { data } = await q;
    setShifts((data ?? []) as StaffShift[]);
    setLoading(false);
  }, [hospitalId, wardId]);

  useEffect(() => {
    load();
    if (!hospitalId) return;
    const ch = supabase
      .channel(`hosp-shifts-${hospitalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospital_staff_shifts", filter: `hospital_id=eq.${hospitalId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hospitalId, load]);

  const onShiftNow = shifts.filter((s) => !!s.clocked_in_at && !s.clocked_out_at);

  return { shifts, onShiftNow, loading, reload: load };
}

/** Shifts belonging to the signed-in staff member (doctor profile or linked nurse). */
export function useMyShifts(userId: string | null | undefined) {
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setShifts([]); setLoading(false); return; }
    setLoading(true);
    const { data: nurses } = await supabase
      .from("hospital_nurses")
      .select("id")
      .eq("linked_user_id", userId);
    const nurseIds = ((nurses ?? []) as { id: string }[]).map((n) => n.id);

    const filters = [`doctor_id.eq.${userId}`];
    if (nurseIds.length) filters.push(`nurse_id.in.(${nurseIds.join(",")})`);

    const { data } = await supabase
      .from("hospital_staff_shifts")
      .select("*")
      .or(filters.join(","))
      .gte("ends_at", new Date(Date.now() - 864e5).toISOString())
      .order("starts_at", { ascending: true });

    setShifts((data ?? []) as StaffShift[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const current = shifts.find((s) => !!s.clocked_in_at && !s.clocked_out_at) ?? null;

  return { shifts, current, loading, reload: load };
}

/** Clocks a shift in/out. On clock-in, logs an entry into the chart of every
 *  patient currently admitted to that nurse's ward, so the ward knows who's
 *  on duty from the patient's own record. */
export async function clockShift(shiftId: string, action: "in" | "out") {
  const { error } = await supabase.rpc("hospital_shift_clock", {
    _shift_id: shiftId,
    _action: action,
  });
  if (error) throw error;

  if (action === "in") {
    const { data: shift } = await supabase
      .from("hospital_staff_shifts")
      .select("hospital_id, ward_id, staff_name, staff_role")
      .eq("id", shiftId)
      .maybeSingle();
    if (shift?.ward_id) {
      const { data: admissions } = await supabase
        .from("hospital_inpatient_admissions" as any)
        .select("id, patient_name")
        .eq("ward_id", shift.ward_id)
        .eq("status", "admitted");
      await Promise.all(
        ((admissions as any[]) ?? []).map((a) =>
          logAdmissionActivity({
            hospitalId: shift.hospital_id,
            admissionId: a.id,
            patientName: a.patient_name,
            actorName: shift.staff_name,
            actorRole: shift.staff_role,
            action: "clocked in",
            detail: `${shift.staff_name} clocked in for this ward's shift`,
          }),
        ),
      );
    }
  }
}
