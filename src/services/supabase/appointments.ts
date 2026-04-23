/**
 * Appointment-domain Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type AppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];
export type AppointmentRequestRow = Database["public"]["Tables"]["appointment_requests"]["Row"];

export async function listAppointments(opts?: {
  doctorId?: string;
  patientId?: string;
  practiceId?: string;
  from?: string;
  to?: string;
}) {
  let query = supabase
    .from("appointments")
    .select("*")
    .order("start_time", { ascending: true });
  if (opts?.doctorId) query = query.eq("user_id", opts.doctorId);
  if (opts?.patientId) query = query.eq("patient_id", opts.patientId);
  if (opts?.practiceId) query = query.eq("practice_id", opts.practiceId);
  if (opts?.from) query = query.gte("start_time", opts.from);
  if (opts?.to) query = query.lte("start_time", opts.to);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createAppointment(payload: AppointmentInsert) {
  const { data, error } = await supabase
    .from("appointments")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointment(id: string, updates: AppointmentUpdate) {
  const { data, error } = await supabase
    .from("appointments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

export async function listAppointmentRequests(opts?: { doctorId?: string; status?: string }) {
  let query = supabase
    .from("appointment_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.doctorId) query = query.eq("doctor_id", opts.doctorId);
  if (opts?.status) query = query.eq("status", opts.status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
