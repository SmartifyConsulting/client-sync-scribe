/**
 * Resumable sessions.
 *
 * Pausing a consultation persists a `paused` session row (transcript + notes +
 * elapsed time) so the doctor can close the tab and pick the consultation up
 * later. The row is deleted once the session is finalised, so paused drafts
 * never appear in session history.
 */

import { supabase } from "@/integrations/supabase/client";

export interface PausedSessionSnapshot {
  id: string;
  patientId: string;
  transcript: string;
  notes: string;
  privateNotes: string;
  elapsedSeconds: number;
  startedAt: string;
  pausedAt: string;
}

interface SavePausedSessionArgs {
  sessionId: string;
  patientId: string;
  transcript: string;
  notes: string;
  privateNotes: string;
  elapsedSeconds: number;
  startedAt: string;
}

/** Create or refresh the paused draft row for the current session. */
export async function savePausedSession(args: SavePausedSessionArgs): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const payload = {
      id: args.sessionId,
      user_id: user.id,
      patient_id: args.patientId,
      title: `Paused session - ${new Date(args.startedAt).toLocaleDateString()}`,
      status: "paused",
      transcript: args.transcript || null,
      notes: args.notes || null,
      private_notes: args.privateNotes || null,
      elapsed_seconds: args.elapsedSeconds,
      started_at: args.startedAt,
      paused_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("sessions").upsert(payload as never, { onConflict: "id" });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Failed to save paused session:", e);
    return false;
  }
}

/** Most recent paused draft for a patient belonging to the signed-in doctor. */
export async function fetchPausedSession(patientId: string): Promise<PausedSessionSnapshot | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("sessions")
      .select("id, patient_id, transcript, notes, private_notes, elapsed_seconds, started_at, paused_at")
      .eq("user_id", user.id)
      .eq("patient_id", patientId)
      .eq("status", "paused")
      .order("paused_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const row = data as Record<string, unknown>;
    return {
      id: String(row.id),
      patientId: String(row.patient_id),
      transcript: (row.transcript as string) || "",
      notes: (row.notes as string) || "",
      privateNotes: (row.private_notes as string) || "",
      elapsedSeconds: Number(row.elapsed_seconds ?? 0),
      startedAt: String(row.started_at),
      pausedAt: String(row.paused_at ?? row.started_at),
    };
  } catch (e) {
    console.error("Failed to load paused session:", e);
    return null;
  }
}

/** Remove the paused draft (on resume-completion or when discarded). */
export async function deletePausedSession(sessionId: string): Promise<void> {
  try {
    await supabase.from("sessions").delete().eq("id", sessionId).eq("status", "paused");
  } catch (e) {
    console.error("Failed to clear paused session:", e);
  }
}
