/** Voices Maeve can speak with. The live list comes from the connected
 *  ElevenLabs account; this curated set is the fallback when it can't load. */
export interface MaeveVoice {
  id: string;
  label: string;
  description: string;
  /** OpenAI voice used when ElevenLabs is unavailable. */
  fallback?: string;
}

export const MAEVE_VOICES: MaeveVoice[] = [
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
  return stored && stored.trim() ? stored : MAEVE_VOICES[0].id;
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

/**
 * Maeve is pronounced "MEEV". Text-to-speech engines often say "may-v", so the
 * spoken copy uses a phonetic spelling. Only the audio changes — the words on
 * screen still read "Maeve".
 */
export function phoneticForSpeech(text: string): string {
  return text.replace(/\bMaeve('s|s)?\b/gi, (match) => {
    const suffix = match.toLowerCase().endsWith("'s") ? "'s" : match.toLowerCase().endsWith("s") ? "s" : "";
    return `Meev${suffix}`;
  });
}
