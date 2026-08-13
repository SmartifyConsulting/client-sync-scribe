/** Curated ElevenLabs voices Maeve can speak with. */
export interface MaeveVoice {
  id: string;
  label: string;
  description: string;
  /** OpenAI voice used when ElevenLabs is unavailable. */
  fallback: string;
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

export function getStoredVoiceId(): string {
  const stored = localStorage.getItem(VOICE_KEY);
  return MAEVE_VOICES.some((v) => v.id === stored) ? (stored as string) : MAEVE_VOICES[0].id;
}

export function storeVoiceId(id: string) {
  localStorage.setItem(VOICE_KEY, id);
}

export function voiceById(id: string): MaeveVoice {
  return MAEVE_VOICES.find((v) => v.id === id) ?? MAEVE_VOICES[0];
}
