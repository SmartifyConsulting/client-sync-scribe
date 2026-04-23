/**
 * Rewards / gamification Supabase queries.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PatientRewardRow = Database["public"]["Tables"]["patient_rewards"]["Row"];
export type PatientRewardInsert = Database["public"]["Tables"]["patient_rewards"]["Insert"];
export type GamificationConfigRow = Database["public"]["Tables"]["gamification_config"]["Row"];
export type DoctorRewardRow = Database["public"]["Tables"]["doctor_rewards"]["Row"];

export async function listPatientRewards(patientId: string) {
  const { data, error } = await supabase
    .from("patient_rewards")
    .select("*")
    .eq("patient_id", patientId)
    .eq("reward_type", "lollipop")
    .order("awarded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveGamificationConfig() {
  const { data, error } = await supabase
    .from("gamification_config")
    .select("*")
    .eq("is_active", true)
    .order("visit_category");
  if (error) throw error;
  return data ?? [];
}

export async function awardPatientReward(payload: PatientRewardInsert) {
  const { data, error } = await supabase
    .from("patient_rewards")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listDoctorRewards(doctorId: string) {
  const { data, error } = await supabase
    .from("doctor_rewards")
    .select("*")
    .eq("doctor_id", doctorId)
    .order("awarded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
