export const MAX_PDF_BYTES = 5 * 1024 * 1024;
export function decodePdf(base64: string): Uint8Array {
  if (base64.length > Math.ceil(MAX_PDF_BYTES / 3) * 4) throw new Error("PDF exceeds 5MB.");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  if (bytes.length > MAX_PDF_BYTES || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("Choose a valid PDF up to 5MB.");
  return bytes;
}