/**
 * Renders a doctor's typed signature to a PNG.
 *
 * Email clients (Gmail in particular) strip web fonts, so a typed signature
 * styled with Great Vibes / Allura / … falls back to a generic system font in
 * the inbox. To guarantee the signature looks exactly like the one configured
 * in My Practice, we render it once to a transparent PNG in the browser (where
 * the self-hosted fonts are available) and reuse that image in outbound email.
 */

import {
  getSignatureColor,
  getSignatureFontFamily,
  type SignatureProfileLike,
} from "@/lib/signature";

const RENDER_SCALE = 3; // retina-quality so the signature stays crisp in email

/** Ensures the chosen signature font is loaded before we paint the canvas. */
async function ensureFontLoaded(fontFamily: string, sizePx: number) {
  try {
    const anyDoc = document as Document & { fonts?: FontFaceSet };
    if (!anyDoc.fonts) return;
    await anyDoc.fonts.load(`${sizePx}px ${fontFamily}`, "Signature");
    await anyDoc.fonts.ready;
  } catch {
    /* font loading is best-effort */
  }
}

/**
 * Returns a base64 PNG (no data-url prefix) of the typed signature, or null
 * when the profile has no typed signature to render.
 */
export async function renderSignaturePngBase64(
  profile?: SignatureProfileLike | null,
): Promise<string | null> {
  if (!profile) return null;
  const name = (profile.full_name || "").trim();
  if (!name) return null;

  const fontFamily = getSignatureFontFamily(profile.signature_font);
  const color = getSignatureColor(profile.signature_color);
  const size = profile.signature_font_size ?? 24;
  const weight = profile.signature_bold ? "bold" : "normal";
  const style = profile.signature_italic ? "italic" : "normal";
  const font = `${style} ${weight} ${size * RENDER_SCALE}px ${fontFamily}`;

  await ensureFontLoaded(fontFamily, size);

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return null;
  measureCtx.font = font;
  const metrics = measureCtx.measureText(name);
  const padX = 4 * RENDER_SCALE;
  const padY = 6 * RENDER_SCALE;
  const width = Math.ceil(metrics.width) + padX * 2;
  // Script fonts have deep descenders — give them generous vertical room.
  const height = Math.ceil(size * RENDER_SCALE * 1.8) + padY * 2;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(width, 1);
  canvas.height = Math.max(height, 1);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(name, padX, height - padY - size * RENDER_SCALE * 0.35);

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1] || null;
  return base64;
}

/** CSS pixel height the rendered signature should occupy in an email. */
export function signatureRenderHeight(profile?: SignatureProfileLike | null): number {
  const size = profile?.signature_font_size ?? 24;
  return Math.round(size * 1.8 + 12);
}
