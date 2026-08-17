import { supabase } from "@/integrations/supabase/client";

const SECTIONS: { key: string; label: string }[] = [
  { key: "askholarc_mood_before", label: "Ask Holarc — Before" },
  { key: "askholarc_mood_after", label: "Ask Holarc — After" },
];

/**
 * Logs the start/end mood from an Ask Holarc exploration into today's Biolog
 * entry, so mood-over-time and correlations can reflect how the exploration
 * affected the user. Registers the two custom sections the first time either
 * is used, then merges the rating into today's payload (never overwrites the
 * rest of the day's biolog data).
 */
export async function logMoodToBiolog(which: "before" | "after", mood: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const section = SECTIONS.find((s) => s.key === `askholarc_mood_${which}`)!;

  // Ensure the custom section exists so the rating is visible in Biolog's UI.
  await supabase
    .from("biolog_sections" as any)
    .upsert(
      { user_id: user.id, key: section.key, label: section.label, group_name: "mental", is_custom: true },
      { onConflict: "user_id,key", ignoreDuplicates: true },
    );

  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("biolog_entries" as any)
    .select("payload")
    .eq("user_id", user.id)
    .eq("entry_date", today)
    .maybeSingle();

  const payload = (existing as any)?.payload || { ratings: {}, meals: [], exercises: [], medications: [] };
  payload.ratings = { ...(payload.ratings || {}), [section.key]: mood };

  await supabase
    .from("biolog_entries" as any)
    .upsert({ user_id: user.id, entry_date: today, payload }, { onConflict: "user_id,entry_date" });
}
