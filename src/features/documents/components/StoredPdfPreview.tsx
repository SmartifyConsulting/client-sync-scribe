import { useEffect, useState } from "react";

/** Stored quote PDFs can exceed Chrome's data-URL navigation limit. */
export function StoredPdfPreview({ source, title }: { source: string; title: string }) {
  const [preview, setPreview] = useState<{ source: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setPreview(null);
    setFailed(false);
    if (!source.startsWith("data:application/pdf;")) {
      setPreview({ source, url: source });
      return;
    }
    // This reads the already-authorised local data URL, without uploading it.
    fetch(source).then(response => response.blob()).then(blob => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setPreview({ source, url: objectUrl });
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [source]);
  if (failed) return <p role="alert" className="py-8 text-sm">The PDF preview could not be prepared. Close this window and try again.</p>;
  if (!preview || preview.source !== source) return <p role="status" className="py-8 text-sm text-muted-foreground">Preparing PDF preview…</p>;
  return <div className="space-y-2">
    <div className="flex justify-end gap-4 text-xs">
      <a className="underline" href={preview.url} target="_blank" rel="noopener noreferrer">Open PDF</a>
      <a className="underline" href={preview.url} download={title.endsWith('.pdf') ? title : `${title}.pdf`}>Download</a>
    </div>
    <iframe title={title} src={preview.url} className="h-[70vh] w-full rounded-lg border border-border" />
  </div>;
}
