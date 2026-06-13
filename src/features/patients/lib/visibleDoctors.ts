/**
 * Returns the patient's "visible" doctors — those they currently grant access
 * to and have NOT hidden from their lists. Used by the renewal selector,
 * round-table participant lists, share targets, etc.
 *
 * Hidden doctors are filtered out via `patient_hidden_doctors`. Deactivated
 * relationships (`doctor_patient_access.is_active = false`) are filtered too,
 * but historic data referencing those doctors remains visible elsewhere.
 */

import { supabase } from "@/integrations/supabase/client";

export interface VisibleDoctor {
  doctor_id: string;
  full_name: string | null;
  specialty: string | null;
  avatar_url: string | null;
  practice_number: string | null;
}

export async function fetchVisibleDoctors(patientUserId: string): Promise<VisibleDoctor[]> {
  const [{ data: access }, { data: hidden }] = await Promise.all([
    supabase
      .from("doctor_patient_access")
      .select("doctor_id")
      .eq("patient_user_id", patientUserId)
      .eq("is_active", true),
    supabase
      .from("patient_hidden_doctors")
      .select("doctor_id")
      .eq("patient_user_id", patientUserId),
  ]);

  const hiddenIds = new Set((hidden ?? []).map((h: any) => h.doctor_id));
  const visibleIds = (access ?? [])
    .map((a: any) => a.doctor_id as string)
    .filter((id) => !hiddenIds.has(id));

  if (visibleIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, specialty, avatar_url, practice_number")
    .in("id", visibleIds);

  return (profiles ?? []).map((p: any) => ({
    doctor_id: p.id,
    full_name: p.full_name,
    specialty: p.specialty,
    avatar_url: p.avatar_url,
    practice_number: p.practice_number,
  }));
}
