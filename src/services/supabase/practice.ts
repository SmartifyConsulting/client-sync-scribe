/**
 * Practice / practice-members Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PracticeRow = Database["public"]["Tables"]["practices"]["Row"];
export type PracticeMemberRow = Database["public"]["Tables"]["practice_members"]["Row"];
export type PracticeInvitationRow = Database["public"]["Tables"]["practice_invitations"]["Row"];

export async function findPracticeForUser(userId: string): Promise<string | null> {
  const { data: memberRows, error } = await supabase
    .from("practice_members")
    .select("practice_id")
    .eq("doctor_id", userId)
    .limit(1);
  if (error) throw error;
  if (memberRows?.[0]?.practice_id) return memberRows[0].practice_id;

  const { data: owned, error: ownedErr } = await supabase
    .from("practices")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (ownedErr) throw ownedErr;
  return owned?.id ?? null;
}

export async function fetchPractice(id: string) {
  const { data, error } = await supabase
    .from("practices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPracticeMembers(practiceId: string) {
  const { data, error } = await supabase
    .from("practice_members")
    .select("*")
    .eq("practice_id", practiceId);
  if (error) throw error;
  return data ?? [];
}

export async function createPractice(name: string, ownerId: string) {
  const { data, error } = await supabase
    .from("practices")
    .insert({ name, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  await supabase
    .from("practice_members")
    .insert({ practice_id: data.id, doctor_id: ownerId, role: "owner" });
  return data;
}
