import { supabase } from "@/integrations/supabase/client";

/** Voices Holarc can speak with. The live list comes from the connected
 *  ElevenLabs account; this curated set is the fallback when it can't load. */
export interface MaeveVoice {
  id: string;
  label: string;
  description: string;
  /** OpenAI voice used when ElevenLabs is unavailable. */
  fallback?: string;
}

/** Nova is Holarc's default voice for every profile. It is spoken by the
 *  fallback speech engine, so the sentinel id tells the server to use it. */
export const NOVA_VOICE_ID = "nova";

export const MAEVE_VOICES: MaeveVoice[] = [
  { id: NOVA_VOICE_ID, label: "Nova", description: "Warm, calm female (default)", fallback: "nova" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah", description: "Warm female", fallback: "shimmer" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda", description: "Calm female", fallback: "nova" },
  { id: "FGY2WhTYpPnrIDTdsKH5", label: "Laura", description: "Bright female", fallback: "alloy" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George", description: "Warm male", fallback: "onyx" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel", description: "Calm male", fallback: "echo" },
  { id: "SAz9YHcvj6GT2YYXdXww", label: "River", description: "Neutral", fallback: "fable" },
];

const VOICE_KEY = "maeve-voice";
const VOICE_LABEL_KEY = "maeve-voice-label";

export function getStoredVoiceId(): string {
  const stored = localStorage.getItem(VOICE_KEY);
  // Any stored id is honoured — it may be a voice from the user's own library.
  return stored && stored.trim() ? stored : NOVA_VOICE_ID;
}

/**
 * The voice saved on the signed-in person's Ask Holarc preferences, so their
 * choice follows them to any device. Falls back to Nova.
 */
export async function loadProfileVoice(): Promise<{ id: string; label: string | null }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { id: getStoredVoiceId(), label: getStoredVoiceLabel() };
  const { data } = await supabase
    .from("ask_maeve_preferences")
    .select("voice_id, voice_label")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data?.voice_id) return { id: NOVA_VOICE_ID, label: "Nova" };
  localStorage.setItem(VOICE_KEY, data.voice_id);
  if (data.voice_label) localStorage.setItem(VOICE_LABEL_KEY, data.voice_label);
  return { id: data.voice_id, label: data.voice_label ?? null };
}

/** Saves the chosen voice to the person's Ask Holarc preferences. */
export async function saveProfileVoice(id: string, label?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("ask_maeve_preferences")
    .upsert({ user_id: user.id, voice_id: id, voice_label: label ?? null }, { onConflict: "user_id" });
}

export function getStoredVoiceLabel(): string | null {
  return localStorage.getItem(VOICE_LABEL_KEY);
}

export function storeVoiceId(id: string, label?: string) {
  localStorage.setItem(VOICE_KEY, id);
  if (label) localStorage.setItem(VOICE_LABEL_KEY, label);
}

export function voiceById(id: string): MaeveVoice {
  const known = MAEVE_VOICES.find((v) => v.id === id);
  if (known) return known;
  return {
    id,
    label: getStoredVoiceLabel() || "Custom voice",
    description: "From your ElevenLabs library",
    fallback: "shimmer",
  };
}

/** "Holarc" needs no phonetic respelling — speech engines say it correctly. */
export function phoneticForSpeech(text: string): string {
  return text;
}
