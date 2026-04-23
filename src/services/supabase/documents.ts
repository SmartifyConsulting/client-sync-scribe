/**
 * Document-domain Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type DocumentRow = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

export async function listDocuments(opts?: { patientId?: string; userId?: string }) {
  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.patientId) query = query.eq("patient_id", opts.patientId);
  else if (opts?.userId) query = query.eq("user_id", opts.userId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchDocumentById(id: string) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createDocument(payload: DocumentInsert) {
  const { data, error } = await supabase
    .from("documents")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDocument(
  id: string,
  updates: DocumentUpdate,
  userIdGuard?: string,
) {
  let query = supabase
    .from("documents")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (userIdGuard) query = query.eq("user_id", userIdGuard);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function updateDocumentContent(id: string, content: string) {
  const { error } = await supabase
    .from("documents")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string, userIdGuard?: string): Promise<void> {
  let query = supabase.from("documents").delete().eq("id", id);
  if (userIdGuard) query = query.eq("user_id", userIdGuard);
  const { error } = await query;
  if (error) throw error;
}

export async function markDocumentEmailed(id: string) {
  const { error } = await supabase
    .from("documents")
    .update({ email_sent_at: new Date().toISOString(), is_draft: false })
    .eq("id", id);
  if (error) throw error;
}
