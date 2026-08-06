import type { ReactNode } from "react";

/**
 * Session summaries come back tagged like:
 *   "Presented with <symptom>acute foot pain</symptom> on <med>ibuprofen</med>"
 * Render the tagged clinical terms in bold and strip the markers.
 */
export function renderClinicalHighlights(text: string): ReactNode {
  if (!text) return null;
  const parts = text.split(/(<(?:med|symptom|condition)>[\s\S]*?<\/(?:med|symptom|condition)>)/g);
  return parts.filter(Boolean).map((part, i) => {
    const match = part.match(/^<(med|symptom|condition)>([\s\S]*?)<\/\1>$/);
    if (match) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {match[2]}
        </strong>
      );
    }
    return <span key={i}>{part.replace(/<\/?(med|symptom|condition)>/g, "")}</span>;
  });
}
