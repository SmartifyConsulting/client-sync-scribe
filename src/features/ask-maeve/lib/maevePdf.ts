// Renders an Ask Maeve transcript as a printable HTML document and downloads it
// as a PDF using the shared document PDF renderer.
import { buildDocumentPdfBase64, pdfFileName } from "@/features/documents/utils/documentPdf";
import type { MaeveMessage, MaeveSessionRow } from "../hooks/useMaeveSession";
import { CLIENT_FALLBACK, looksLikeAdvice } from "./suggestionDetector";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildTranscriptHtml(session: MaeveSessionRow | null, messages: MaeveMessage[]): string {
  const title = session?.title || "Ask Maeve exploration";
  const date = new Date(session?.created_at ?? Date.now()).toLocaleString();

  const rows = messages
    .map((m) => {
      const isMaeve = m.role === "assistant";
      const body = isMaeve && looksLikeAdvice(m.content) ? CLIENT_FALLBACK : m.content;
      const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `
        <div style="margin:0 0 14px 0;">
          <div style="font-size:11px;font-weight:700;color:${isMaeve ? "#C2410C" : "#0F766E"};text-transform:uppercase;letter-spacing:.06em;">
            ${isMaeve ? "Maeve" : "You"} · ${escapeHtml(time)}
          </div>
          <div style="font-size:13px;line-height:1.6;color:#111;white-space:pre-wrap;margin-top:3px;">${escapeHtml(body.trim())}</div>
        </div>`;
    })
    .join("");

  const summary = session?.session_summary
    ? `<div style="margin-top:18px;padding:12px 14px;border:1px solid #FDBA74;background:#FFF7ED;border-radius:10px;">
         <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#C2410C;">Closing reflection</div>
         <div style="font-size:13px;line-height:1.6;color:#111;white-space:pre-wrap;margin-top:4px;">${escapeHtml(session.session_summary.trim())}</div>
       </div>`
    : "";

  return `
    <div id="holarc-document" style="width:794px;padding:48px 56px;background:#fff;font-family:Manrope,Arial,sans-serif;">
      <div style="border-bottom:2px solid #F97316;padding-bottom:10px;margin-bottom:18px;">
        <div style="font-size:20px;font-weight:800;color:#111;">${escapeHtml(title)}</div>
        <div style="font-size:12px;color:#666;margin-top:2px;">Ask Maeve · ${escapeHtml(date)}</div>
      </div>
      ${rows}
      ${summary}
      <div style="margin-top:24px;border-top:1px solid #E5E5E5;padding-top:10px;font-size:10px;color:#888;">
        Maeve is a facilitation tool, not a clinician. Nothing here is advice or a diagnosis.
      </div>
    </div>`;
}

/** Builds and downloads the transcript PDF. Returns false when rendering failed. */
export async function downloadTranscriptPdf(
  session: MaeveSessionRow | null,
  messages: MaeveMessage[],
): Promise<boolean> {
  const base64 = await buildDocumentPdfBase64(buildTranscriptHtml(session, messages));
  if (!base64) return false;
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = pdfFileName(
    `ask-maeve-${(session?.title || "exploration").slice(0, 40)}-${new Date(
      session?.created_at ?? Date.now(),
    ).toISOString().slice(0, 10)}`,
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}
