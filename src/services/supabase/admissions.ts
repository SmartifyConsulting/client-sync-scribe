/**
 * Hospital admissions Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HospitalAdmissionRow = Database["public"]["Tables"]["hospital_admissions"]["Row"];
export type HospitalAdmissionInsert = Database["public"]["Tables"]["hospital_admissions"]["Insert"];

export async function listAdmissionsForPatient(patientId: string) {
  const { data, error } = await supabase
    .from("hospital_admissions")
    .select("*")
    .eq("patient_id", patientId)
    .order("admission_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdmissionVitals(admissionId: string) {
  const { data, error } = await supabase
    .from("admission_vitals")
    .select("*")
    .eq("admission_id", admissionId)
    .order("recorded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdmissionMedications(admissionId: string) {
  const { data, error } = await supabase
    .from("admission_medications")
    .select("*")
    .eq("admission_id", admissionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdmissionLabResults(admissionId: string) {
  const { data, error } = await supabase
    .from("admission_lab_results")
    .select("*")
    .eq("admission_id", admissionId)
    .order("result_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdmissionImaging(admissionId: string) {
  const { data, error } = await supabase
    .from("admission_imaging")
    .select("*")
    .eq("admission_id", admissionId)
    .order("performed_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createHospitalAdmission(payload: HospitalAdmissionInsert) {
  const { data, error } = await supabase
    .from("hospital_admissions")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}
