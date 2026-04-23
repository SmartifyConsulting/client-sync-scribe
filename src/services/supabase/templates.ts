/**
 * Templates + header/footer template Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type TemplateRow = Database["public"]["Tables"]["templates"]["Row"];
export type TemplateInsert = Database["public"]["Tables"]["templates"]["Insert"];
export type TemplateUpdate = Database["public"]["Tables"]["templates"]["Update"];

export async function listTemplates(userId: string) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(payload: TemplateInsert) {
  const { data, error } = await supabase
    .from("templates")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function bulkCreateTemplates(rows: TemplateInsert[]) {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from("templates").insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateTemplate(id: string, userIdGuard: string, updates: TemplateUpdate) {
  const { data, error } = await supabase
    .from("templates")
    .update({ ...updates, updated_at: new Date().toISOString() } as any)
    .eq("id", id)
    .eq("user_id", userIdGuard)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: string, userIdGuard: string): Promise<void> {
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .eq("user_id", userIdGuard);
  if (error) throw error;
}

// --- Header/Footer templates ---

export async function listHeaderFooterTemplates(userId: string) {
  const { data, error } = await supabase
    .from("header_footer_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createHeaderFooterTemplate(payload: {
  user_id: string;
  name: string;
  description?: string | null;
  header: Json;
  footer: Json;
  font_family?: string | null;
  is_default?: boolean | null;
}) {
  const { data, error } = await supabase
    .from("header_footer_templates")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}
