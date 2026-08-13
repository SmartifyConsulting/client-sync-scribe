import { supabase } from "@/integrations/supabase/client";

/**
 * Delete a Maeve exploration and everything hanging off it.
 * Row-level rules already restrict every one of these tables to the owner.
 */
export async function deleteMaeveSession(sessionId: string): Promise<boolean> {
  const children = [
    "ask_maeve_messages",
    "ask_maeve_anchors",
    "ask_maeve_outcomes",
    "ask_maeve_resources",
    "ask_maeve_session_processes",
  ];

  for (const table of children) {
    await supabase.from(table as any).delete().eq("session_id", sessionId);
  }

  const { error } = await supabase.from("ask_maeve_sessions" as any).delete().eq("id", sessionId);
  return !error;
}
