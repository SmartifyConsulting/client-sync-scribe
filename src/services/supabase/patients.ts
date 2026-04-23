/**
 * Patient-domain Supabase queries. Functions throw on error and return data.
 * Hooks/components can adopt these to remove inline `supabase.from('patients')`
 * calls. Behaviour is identical to existing inline queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PatientRow = Database["public"]["Tables"]["patients"]["Row"];
export type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];
export type PatientUpdate = Database["public"]["Tables"]["patients"]["Update"];

export async function listPatients(): Promise<PatientRow[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPatientById(id: string): Promise<PatientRow | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchPatientLastVisit(patientId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("started_at")
    .eq("patient_id", patientId)
    .eq("status", "completed")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.started_at ?? null;
}

export async function findPatientByUserId(userId: string): Promise<PatientRow | null> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("patient_user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPatient(
  payload: PatientInsert,
): Promise<PatientRow> {
  const { data, error } = await supabase
    .from("patients")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatient(
  id: string,
  updates: PatientUpdate,
): Promise<PatientRow> {
  const { data, error } = await supabase
    .from("patients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePatient(id: string): Promise<void> {
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}

export async function setPatientStatus(
  id: string,
  status: "active" | "inactive" | "archived",
): Promise<void> {
  const { error } = await supabase.from("patients").update({ status }).eq("id", id);
  if (error) throw error;
}
