/**
 * Shared doctor-signature rendering.
 *
 * A doctor either uploads a signature image (`profiles.signature_url`) OR
 * configures a typed signature (font / colour / size / bold / italic).
 * Document previews, invoices, prescriptions and exports must render whichever
 * one is configured — previously only the image variant was supported, so
 * typed signatures never appeared.
 */

export const SIGNATURE_FONTS = [
  { value: "allura", label: "Allura", fontFamily: "'Allura', serif" },
  { value: "great-vibes", label: "Great Vibes", fontFamily: "'Great Vibes', serif" },
  { value: "herr-von-muellerhoff", label: "Herr Von Muellerhoff", fontFamily: "'Herr Von Muellerhoff', serif" },
  { value: "homemade-apple", label: "Homemade Apple", fontFamily: "'Homemade Apple', serif" },
  { value: "mr-dafoe", label: "Mr Dafoe", fontFamily: "'Mr Dafoe', serif" },
  { value: "petit-formal-script", label: "Petit Formal Script", fontFamily: "'Petit Formal Script', serif" },
  { value: "pinyon-script", label: "Pinyon Script", fontFamily: "'Pinyon Script', serif" },
  { value: "reenie-beanie", label: "Reenie Beanie", fontFamily: "'Reenie Beanie', serif" },
  { value: "rock-salt", label: "Rock Salt", fontFamily: "'Rock Salt', serif" },
  { value: "sacramento", label: "Sacramento", fontFamily: "'Sacramento', serif" },
] as const;

export const SIGNATURE_COLORS = [
  { value: "black", label: "Black", color: "#000000" },
  { value: "teal", label: "Teal", color: "#104861" },
  { value: "navy", label: "Navy", color: "#1a2744" },
  { value: "dark-red", label: "Dark Red", color: "#8B0000" },
  { value: "dark-green", label: "Dark Green", color: "#006400" },
] as const;

export const getSignatureFontFamily = (v?: string | null) =>
  SIGNATURE_FONTS.find((f) => f.value === v)?.fontFamily || SIGNATURE_FONTS[0].fontFamily;

export const getSignatureColor = (v?: string | null) =>
  SIGNATURE_COLORS.find((c) => c.value === v)?.color || "#000000";

export interface SignatureProfileLike {
  full_name?: string | null;
  signature_url?: string | null;
  signature_font?: string | null;
  signature_color?: string | null;
  signature_font_size?: number | null;
  signature_bold?: boolean | null;
  signature_italic?: boolean | null;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Returns the HTML for the doctor's signature, or "" when nothing is configured.
 * Prefers the uploaded image; falls back to the typed signature.
 */
export function renderSignatureHtml(profile?: SignatureProfileLike | null): string {
  if (!profile) return "";

  if (profile.signature_url) {
    return `<img src="${profile.signature_url}" alt="Signature" style="max-height:60px;display:inline-block;" />`;
  }

  const name = (profile.full_name || "").trim();
  if (!name) return "";

  const fontFamily = getSignatureFontFamily(profile.signature_font);
  const color = getSignatureColor(profile.signature_color);
  const size = profile.signature_font_size ?? 24;
  const weight = profile.signature_bold ? "bold" : "normal";
  const style = profile.signature_italic ? "italic" : "normal";

  return `<span style="font-family:${fontFamily};color:${color};font-size:${size}px;font-weight:${weight};font-style:${style};line-height:1.3;display:inline-block;">${escapeHtml(
    name,
  )}</span>`;
}
