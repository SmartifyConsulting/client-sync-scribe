/**
 * Saves a finalised consultation transcript as a normal document so it sits
 * alongside the other auto-generated session documents (preview, download,
 * email and share all work unchanged).
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/services/logger";

const TRANSCRIPT_TEMPLATE_NAME = "Session Transcript";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toHtml(title: string, transcript: string): string {
  const body = transcript
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  return `<h2>${escapeHtml(title)}</h2>\n${body}`;
}

export interface SaveTranscriptDocumentArgs {
  userId: string;
  sessionId: string;
  patientId?: string | null;
  patientName?: string | null;
  transcript: string;
  sessionTitle?: string | null;
  sessionDate?: string | null;
}

/**
 * Creates (or refreshes) the transcript document for a session. Safe to call
 * more than once — an existing transcript document for the session is updated.
 */
export async function saveSessionTranscriptDocument({
  userId,
  sessionId,
  patientId,
  patientName,
  transcript,
  sessionTitle,
  sessionDate,
}: SaveTranscriptDocumentArgs) {
  const text = (transcript || "").trim();
  if (!text) return null;

  const dateLabel = new Date(sessionDate || Date.now()).toLocaleDateString();
  const name = `Session Transcript — ${sessionTitle?.trim() || dateLabel}`;

  try {
    const { data: existing } = await supabase
      .from("documents")
      .select("id")
      .eq("session_id", sessionId)
      .eq("template_name", TRANSCRIPT_TEMPLATE_NAME)
      .maybeSingle();

    const payload = {
      user_id: userId,
      patient_id: patientId || null,
      patient_name: patientName || null,
      session_id: sessionId,
      name,
      template_name: TRANSCRIPT_TEMPLATE_NAME,
      content: toHtml(name, text),
      is_draft: false,
      record_date: (sessionDate || new Date().toISOString()).slice(0, 10),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from("documents")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabase.from("documents").insert(payload).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    logger.debug("Could not save session transcript document", error);
    return null;
  }
}
