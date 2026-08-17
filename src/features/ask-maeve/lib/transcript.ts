import type { MaeveMessage, MaeveSessionRow } from "../hooks/useMaeveSession";
import { CLIENT_FALLBACK, looksLikeAdvice } from "./suggestionDetector";

/** Build a clean, readable transcript of a Angel exploration. */
export function buildTranscript(session: MaeveSessionRow | null, messages: MaeveMessage[]): string {
  const title = session?.title || "Ask Holarc exploration";
  const date = session?.created_at ? new Date(session.created_at).toLocaleString() : new Date().toLocaleString();

  const lines: string[] = [
    `${title}`,
    `Ask Holarc — ${date}`,
    "",
    "----------------------------------------",
    "",
  ];

  for (const m of messages) {
    const who = m.role === "assistant" ? "Angel" : "You";
    const body = m.role === "assistant" && looksLikeAdvice(m.content) ? CLIENT_FALLBACK : m.content;
    const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    lines.push(`${who} · ${time}`, body.trim(), "");
  }

  if (session?.session_summary) {
    lines.push("----------------------------------------", "", "Closing reflection", session.session_summary.trim(), "");
  }

  lines.push(
    "----------------------------------------",
    "Angel is a facilitation tool, not a clinician. Nothing here is advice or a diagnosis.",
  );

  return lines.join("\n");
}

export function transcriptFileName(session: MaeveSessionRow | null): string {
  const stamp = new Date(session?.created_at ?? Date.now()).toISOString().slice(0, 10);
  const slug = (session?.title || "ask-maeve")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "ask-maeve"}-${stamp}.txt`;
}

export function downloadTranscript(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Native share sheet (WhatsApp, Messages, Mail…) with a clipboard fallback. */
export async function shareTranscript(text: string, title: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return "shared";
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return "shared";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
