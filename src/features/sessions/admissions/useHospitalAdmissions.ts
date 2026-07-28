import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HospitalAdmission {
  id: string;
  patient_id: string;
  doctor_id: string;
  document_id: string | null;
  hospital: string | null;
  admission_date: string;
  discharge_date: string | null;
  diagnosis: string | null;
  procedure_description: string | null;
  status: string;
  hospital_provider_id?: string | null;
  doctor_on_call_id?: string | null;
  patient_care_notes?: string | null;
  visiting_hours_override?: string | null;
  diet_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NurseShift {
  id: string;
  admission_id: string;
  nurse_user_id: string | null;
  nurse_name_snapshot: string;
  shift_start: string;
  shift_end: string | null;
  handover_notes: string | null;
  created_by: string;
  created_at: string;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealLogEntry {
  id: string;
  admission_id: string;
  meal_date: string;
  meal_slot: MealSlot;
  ate: boolean | null;
  notes: string | null;
  logged_by: string;
  nurse_name_snapshot: string | null;
  created_at: string;
}

export function useHospitalAdmissions(patientId?: string) {
  return useQuery({
    queryKey: ["hospital-admissions", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("hospital_admissions") as any)
        .select("*")
        .eq("patient_id", patientId!)
        .order("admission_date", { ascending: false });
      if (error) throw error;
      return (data || []) as HospitalAdmission[];
    },
  });
}

export function useUpdateAdmission(admissionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<HospitalAdmission>) => {
      const { error } = await (supabase.from("hospital_admissions") as any)
        .update(updates)
        .eq("id", admissionId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hospital-admissions"] });
    },
  });
}

/** Whether the current user is hospital staff at the admitting hospital — gates shift/meal logging UI. */
export function useIsHospitalStaffForAdmission(admissionId?: string) {
  return useQuery({
    queryKey: ["is-hospital-staff-for-admission", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("is_hospital_staff_for_admission", {
        _admission_id: admissionId,
      });
      if (error) throw error;
      return !!data;
    },
  });
}

export function useAdmissionNurseShifts(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-nurse-shifts", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("admission_nurse_shifts") as any)
        .select("*")
        .eq("admission_id", admissionId!)
        .order("shift_start", { ascending: false });
      if (error) throw error;
      return (data || []) as NurseShift[];
    },
  });
}

/** Starts a new shift and closes out the previous open one (the handover). */
export function useStartNurseShift(admissionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { nurseUserId?: string | null; nurseName: string; handoverNotes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const now = new Date().toISOString();

      const { data: openShift } = await (supabase.from("admission_nurse_shifts") as any)
        .select("id")
        .eq("admission_id", admissionId!)
        .is("shift_end", null)
        .order("shift_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openShift) {
        await (supabase.from("admission_nurse_shifts") as any)
          .update({ shift_end: now })
          .eq("id", openShift.id);
      }

      const { error } = await (supabase.from("admission_nurse_shifts") as any).insert({
        admission_id: admissionId,
        nurse_user_id: input.nurseUserId ?? null,
        nurse_name_snapshot: input.nurseName,
        shift_start: now,
        handover_notes: input.handoverNotes ?? null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission-nurse-shifts", admissionId] });
    },
  });
}

export function useAdmissionMealLog(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-meal-log", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("admission_meal_log") as any)
        .select("*")
        .eq("admission_id", admissionId!)
        .order("meal_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MealLogEntry[];
    },
  });
}

export function useLogMeal(admissionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mealSlot: MealSlot; mealDate?: string; ate: boolean | null; notes?: string; nurseName?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await (supabase.from("admission_meal_log") as any).insert({
        admission_id: admissionId,
        meal_date: input.mealDate ?? new Date().toISOString().slice(0, 10),
        meal_slot: input.mealSlot,
        ate: input.ate,
        notes: input.notes ?? null,
        logged_by: user.id,
        nurse_name_snapshot: input.nurseName ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission-meal-log", admissionId] });
    },
  });
}

export function useAdmissionVitals(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-vitals", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_vitals")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdmissionMedications(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-medications", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_medications")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdmissionLabResults(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-lab-results", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_lab_results")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("result_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAdmissionImaging(admissionId?: string) {
  return useQuery({
    queryKey: ["admission-imaging", admissionId],
    enabled: !!admissionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_imaging")
        .select("*")
        .eq("admission_id", admissionId!)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useInvalidateAdmissionChildren() {
  const qc = useQueryClient();
  return (admissionId: string) => {
    qc.invalidateQueries({ queryKey: ["admission-vitals", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-medications", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-lab-results", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-imaging", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-nurse-shifts", admissionId] });
    qc.invalidateQueries({ queryKey: ["admission-meal-log", admissionId] });
  };
}
