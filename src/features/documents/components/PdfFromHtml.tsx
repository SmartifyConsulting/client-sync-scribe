import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { buildDocumentPdfUrl } from "@/features/documents/utils/documentPdf";

/** Renders HTML as a real PDF and shows it in the browser's PDF viewer. */
export function PdfFromHtml({ html, title, className = "h-[70vh] w-full" }: { html: string; title: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null); setFailed(false);
    buildDocumentPdfUrl(html).then((u) => {
      if (!alive) { if (u) URL.revokeObjectURL(u); return; }
      made = u;
      if (u) setUrl(u); else setFailed(true);
    });
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [html]);
  if (failed) return <p className="p-6 text-sm text-muted-foreground">We couldn't build the PDF preview. Try downloading it instead.</p>;
  if (!url) return <div className={`flex items-center justify-center gap-2 text-sm text-muted-foreground ${className}`}><Loader2 className="h-4 w-4 animate-spin" />Preparing PDF…</div>;
  return <iframe title={title} src={url} className={`rounded-lg border border-border bg-card ${className}`} />;
}
