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

type HFCell = { text?: string; alignment?: string; imageUrl?: string } | null | undefined;
type HFSection = { left?: HFCell; center?: HFCell; right?: HFCell } | null | undefined;

/**
 * Resolve [Tokens] inside a linked header/footer template so letterhead details
 * render the same way in template previews as they do on saved documents.
 */
export function resolveHeaderFooterTokens<T extends { header?: any; footer?: any } | null | undefined>(
  hf: T,
  profile: FillProfile | null | undefined,
): T {
  if (!hf) return hf;

  const resolveSection = (section: HFSection) => {
    if (!section) return section;
    const resolveCell = (cell: HFCell) =>
      cell ? { ...cell, text: resolveTemplatePreviewTokens(cell.text || "", profile) } : cell;
    return {
      ...section,
      left: resolveCell(section.left),
      center: resolveCell(section.center),
      right: resolveCell(section.right),
    };
  };

  return {
    ...(hf as any),
    header: resolveSection((hf as any).header),
    footer: resolveSection((hf as any).footer),
  } as T;
}
