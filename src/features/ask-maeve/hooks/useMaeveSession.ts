import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeInvoke } from "@/services/edge/safeInvoke";

export interface MaeveMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  conversation_state: string | null;
  process_key: string | null;
  is_safety_response: boolean;
  created_at: string;
}

export interface MaeveSessionRow {
  id: string;
  title: string | null;
  status: string;
  conversation_state: string;
  session_summary: string | null;
  created_at: string;
  mood_start: number | null;
  mood_end: number | null;
  feedback_rating: number | null;
  feedback_text: string | null;
}

export function useMaeveSession(sessionId?: string) {
  const [session, setSession] = useState<MaeveSessionRow | null>(null);
  const [messages, setMessages] = useState<MaeveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.from("ask_maeve_sessions" as any).select("*").eq("id", sessionId).maybeSingle(),
      supabase
        .from("ask_maeve_messages" as any)
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);
    setSession((s as any) ?? null);
    setMessages(((m as any) ?? []) as MaeveMessage[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setSession(null);
    load();
  }, [load]);

  const send = useCallback(
    async (text: string, opening = false) => {
      if (!sessionId || thinking) return;
      setError(null);
      if (!opening) {
        setMessages((prev) => [
          ...prev,
          {
            id: `optimistic-${Date.now()}`,
            role: "user",
            content: text,
            conversation_state: null,
            process_key: null,
            is_safety_response: false,
            created_at: new Date().toISOString(),
          },
        ]);
      }
      setThinking(true);
      const { error: err } = await safeInvoke("ask-maeve-chat", {
        session_id: sessionId,
        message: text,
        opening,
      });
      if (err) setError(err);
      await load();
      setThinking(false);
    },
    [sessionId, thinking, load],
  );

  return { session, messages, loading, thinking, error, send, reload: load };
}

export async function createMaeveSession(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return null;
  const { data, error } = await supabase
    .from("ask_maeve_sessions" as any)
    .insert({ user_id: auth.user.id } as any)
    .select("id")
    .single();
  if (error) {
    console.error("createMaeveSession failed", error);
    return null;
  }
  return (data as any).id as string;
}

/** Records the mood picked at the start or end of an exploration. */
export async function setMaeveMood(sessionId: string, which: "start" | "end", mood: number): Promise<boolean> {
  const { error } = await supabase
    .from("ask_maeve_sessions" as any)
    .update({ [which === "start" ? "mood_start" : "mood_end"]: mood } as any)
    .eq("id", sessionId);
  if (error) {
    console.error("setMaeveMood failed", error);
    return false;
  }
  return true;
}

/** Records the closing feedback (star rating + free text) for an exploration. */
export async function setMaeveFeedback(sessionId: string, rating: number | null, text: string): Promise<boolean> {
  const { error } = await supabase
    .from("ask_maeve_sessions" as any)
    .update({ feedback_rating: rating, feedback_text: text || null } as any)
    .eq("id", sessionId);
  if (error) {
    console.error("setMaeveFeedback failed", error);
    return false;
  }
  return true;
}

/** Renames an exploration. Empty titles fall back to the auto-generated name. */
export async function renameMaeveSession(sessionId: string, title: string): Promise<boolean> {
  const clean = title.trim();
  const { error } = await supabase
    .from("ask_maeve_sessions" as any)
    .update({ title: clean || null } as any)
    .eq("id", sessionId);
  if (error) {
    console.error("renameMaeveSession failed", error);
    return false;
  }
  return true;
}
