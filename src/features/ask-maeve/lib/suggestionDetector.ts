/**
 * Client-side mirror of the server response governor — defence in depth only.
 * The authoritative check runs in the `ask-maeve-chat` edge function.
 */

const PATTERNS: RegExp[] = [
  /\byou (?:should|ought to|need to|must|have to)\b/i,
  /\b(?:you could try|why don't you|why not try|have you considered)\b/i,
  /\bi (?:recommend|suggest|advise)\b/i,
  /\bwhat you (?:need|really need) is\b/i,
  /\b(?:diagnos(?:is|e|ed)|symptom of)\b/i,
];

export function looksLikeAdvice(text: string): boolean {
  return PATTERNS.some((p) => p.test(text));
}

export const CLIENT_FALLBACK =
  "Let me stay with you rather than get ahead of you.\n\nWhat's most present for you as you say that?";
