/**
 * Session-domain Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
export type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

const WITH_PATIENT = `*, patient:patients(id, name)` as const;

export async function listSessions(patientId?: string) {
  let query = supabase
    .from("sessions")
    .select(WITH_PATIENT)
    // Paused drafts are resumable work-in-progress, never session history.
    .neq("status", "paused")
    .order("started_at", { ascending: false });
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchSessionById(id: string) {
  const { data, error } = await supabase
    .from("sessions")
    .select(WITH_PATIENT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createSession(payload: SessionInsert) {
  const { data, error } = await supabase
    .from("sessions")
    .insert(payload)
    .select(WITH_PATIENT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateSession(id: string, updates: SessionUpdate) {
  const { data, error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id)
    .select(WITH_PATIENT)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}
