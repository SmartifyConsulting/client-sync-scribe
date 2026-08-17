/**
 * Saves an Ask Holarc exploration transcript into the documents store so it
 * appears alongside the other documents for that person.
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/services/logger";
import { buildTranscript } from "./transcript";
import type { MaeveMessage, MaeveSessionRow } from "../hooks/useMaeveSession";

const TEMPLATE_NAME = "Exploration Transcript";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function saveExplorationDocument(
  session: MaeveSessionRow | null,
  messages: MaeveMessage[],
): Promise<boolean> {
  if (!messages.length) return false;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return false;

    const { data: patient } = await supabase
      .from("patients")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

    const text = buildTranscript(session, messages);
    const created = session?.created_at ?? new Date().toISOString();
    const name = `Ask Holarc — ${session?.title?.trim() || new Date(created).toLocaleDateString()}`;

    const payload = {
      user_id: user.id,
      patient_id: patient?.id ?? null,
      patient_name: patient?.name ?? null,
      name,
      template_name: TEMPLATE_NAME,
      content: `<h2>${escapeHtml(name)}</h2>\n<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`,
      is_draft: false,
      record_date: created.slice(0, 10),
    };

    const { error } = await supabase.from("documents").insert(payload);
    if (error) throw error;
    return true;
  } catch (error) {
    logger.debug("Could not save exploration document", error);
    return false;
  }
}
