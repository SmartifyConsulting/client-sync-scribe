/**
 * Prescription-domain Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PrescriptionRow = Database["public"]["Tables"]["prescriptions"]["Row"];
export type PrescriptionInsert = Database["public"]["Tables"]["prescriptions"]["Insert"];
export type PrescriptionUpdate = Database["public"]["Tables"]["prescriptions"]["Update"];

export async function listPrescriptions(opts?: {
  patientId?: string;
  sessionId?: string;
  status?: "active" | "completed" | "cancelled";
}) {
  let query = supabase
    .from("prescriptions")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.patientId) query = query.eq("patient_id", opts.patientId);
  if (opts?.sessionId) query = query.eq("session_id", opts.sessionId);
  if (opts?.status) query = query.eq("status", opts.status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchPrescriptionById(id: string) {
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPrescription(payload: PrescriptionInsert) {
  const { data, error } = await supabase
    .from("prescriptions")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePrescription(id: string, updates: PrescriptionUpdate) {
  const { data, error } = await supabase
    .from("prescriptions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePrescription(id: string): Promise<void> {
  const { error } = await supabase.from("prescriptions").delete().eq("id", id);
  if (error) throw error;
}
