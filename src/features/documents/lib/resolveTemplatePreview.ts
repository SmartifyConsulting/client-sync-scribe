// Preview-time token resolution for TEMPLATES (not saved documents).
//
// Templates are authored before a patient is chosen, so previews should still
// show the signed-in doctor's real details ([DoctorName], [PracticeNumber],
// [DoctorSignature], …) instead of raw brackets. Patient-scoped tokens have no
// context yet and fall back to the shared quiet "___" placeholder.

import { fillDocumentPlaceholders, type FillProfile } from "@/features/documents/lib/fillDocumentPlaceholders";

export function resolveTemplatePreviewTokens(
  text: string,
  profile: FillProfile | null | undefined,
): string {
  if (!text) return "";
  return fillDocumentPlaceholders(text, { profile: profile ?? null }).content;
}
