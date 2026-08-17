import { supabase } from "@/integrations/supabase/client";

/**
 * Records that the signed-in user opened a patient record on a specific screen.
 * The owner of the record (their user account, when they have one) is stored
 * alongside so they can see who viewed their profile under "My Views".
 */
export async function logProfileView(patientId: string | null | undefined, screen: string) {
  if (!patientId) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const viewerId = auth.user?.id;
    if (!viewerId) return;

    const { data: patient } = await supabase
      .from("patients")
      .select("patient_user_id")
      .eq("id", patientId)
      .maybeSingle();

    const ownerId = (patient as { patient_user_id?: string | null } | null)?.patient_user_id ?? null;
    if (ownerId === viewerId) return; // don't log people viewing their own record

    await supabase.from("profile_view_log" as any).insert({
      viewer_id: viewerId,
      patient_id: patientId,
      owner_id: ownerId,
      screen,
    } as any);
  } catch {
    // View logging is best-effort and must never block the screen.
  }
}
