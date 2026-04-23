/**
 * Invoice-domain Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
export type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];

export async function listInvoices(opts?: { doctorId?: string; patientId?: string }) {
  let query = supabase.from("invoices").select("*").order("created_at", { ascending: false });
  if (opts?.doctorId) query = query.eq("doctor_id", opts.doctorId);
  if (opts?.patientId) query = query.eq("patient_id", opts.patientId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchInvoiceBySessionId(sessionId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchInvoiceById(id: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createInvoice(payload: InvoiceInsert) {
  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInvoice(id: string, updates: InvoiceUpdate) {
  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw error;
}
