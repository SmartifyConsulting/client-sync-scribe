/**
 * Doctor signature rendering for outbound emails.
 * Mirrors src/lib/signature.ts so email and PDF output match.
 */

const FONTS: Record<string, string> = {
  allura: "'Allura', cursive, serif",
  "great-vibes": "'Great Vibes', cursive, serif",
  "herr-von-muellerhoff": "'Herr Von Muellerhoff', cursive, serif",
  "homemade-apple": "'Homemade Apple', cursive, serif",
  "mr-dafoe": "'Mr Dafoe', cursive, serif",
  "petit-formal-script": "'Petit Formal Script', cursive, serif",
  "pinyon-script": "'Pinyon Script', cursive, serif",
  "reenie-beanie": "'Reenie Beanie', cursive, serif",
  "rock-salt": "'Rock Salt', cursive, serif",
  sacramento: "'Sacramento', cursive, serif",
};

const COLORS: Record<string, string> = {
  black: "#000000",
  teal: "#104861",
  navy: "#1a2744",
  "dark-red": "#8B0000",
  "dark-green": "#006400",
};

export interface SignatureProfileLike {
  full_name?: string | null;
  signature_url?: string | null;
  /** PNG of the typed signature rendered in the app with the real font. */
  signature_render_url?: string | null;
  signature_font?: string | null;
  signature_color?: string | null;
  signature_font_size?: number | null;
  signature_bold?: boolean | null;
  signature_italic?: boolean | null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderSignatureHtml(
  profile?: SignatureProfileLike | null,
  opts?: {
    /** When set, the signature image is referenced as `cid:<inlineCid>` so it
     *  renders even when the client blocks remote images. */
    inlineCid?: string;
  },
): string {
  if (!profile) return "";

  const imageUrl = profile.signature_url || profile.signature_render_url;
  if (imageUrl && opts?.inlineCid) {
    return `<img src="cid:${opts.inlineCid}" alt="Signature" style="max-height:64px;display:block;border:0;" />`;
  }
  if (imageUrl) {
    return `<img src="${imageUrl}" alt="Signature" style="max-height:64px;display:block;border:0;" />`;
  }

  if (profile.signature_url) {
    return `<img src="${profile.signature_url}" alt="Signature" style="max-height:56px;display:block;border:0;" />`;
  }

  const name = (profile.full_name || "").trim();
  if (!name) return "";

  // Unknown/legacy values (e.g. "sans") must not degrade to a generic cursive —
  // mail clients render that as Comic Sans. Fall back to a script face instead.
  const fontFamily = FONTS[profile.signature_font || ""] || FONTS["great-vibes"];
  const color = COLORS[profile.signature_color || "black"] || "#000000";
  const size = profile.signature_font_size ?? 24;
  const weight = profile.signature_bold ? "bold" : "normal";
  const style = profile.signature_italic ? "italic" : "normal";

  return `<span style="font-family:${fontFamily};color:${color};font-size:${size}px;font-weight:${weight};font-style:${style};line-height:1.3;display:inline-block;">${esc(
    name,
  )}</span>`;
}

/** "Dear Dr Adams" / "Dear Sarah" — never "Dear Colleague". */
export function buildGreeting(opts: {
  fullName?: string | null;
  isPractitioner?: boolean;
  organisationName?: string | null;
}): string | null {
  const raw = (opts.fullName || "").trim();
  if (raw) {
    const cleaned = raw.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?)\s+/i, "").trim();
    const parts = cleaned.split(/\s+/);
    if (opts.isPractitioner) {
      return `Dear Dr ${parts[parts.length - 1]}`;
    }
    return `Dear ${parts[0]}`;
  }
  const org = (opts.organisationName || "").trim();
  if (org) return `Dear ${org} team`;
  return null;
}
