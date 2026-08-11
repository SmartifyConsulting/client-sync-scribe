import { useEffect, useState } from "react";
import { DocumentPreview } from "@/components/sessions/DocumentPreview";
import { useDocumentHeaderFooter } from "@/hooks/useDocumentHeaderFooter";
import { useProfile } from "@/hooks/useProfile";
import { resolveDocumentPreviewContent } from "@/lib/resolveDocumentPreviewContent";

export interface PreviewableDocument {
  id: string;
  name: string;
  content: string;
  user_id?: string | null;
  patient_id?: string | null;
  patient_name?: string | null;
  template_name?: string | null;
  session_id?: string | null;
}

/**
 * Opens a document in the portaled preview overlay with its letterhead applied,
 * so lists can preview in place instead of navigating to another screen.
 */
export function DocumentPreviewWithLetterhead({
  document: doc,
  onClose,
}: {
  document: PreviewableDocument;
  onClose: () => void;
}) {
  const { headerFooter, templateFontFamily } = useDocumentHeaderFooter(doc as any);
  const { profile } = useProfile();
  const [resolvedContent, setResolvedContent] = useState<string>(doc.content || "");
  const [logoUrl, setLogoUrl] = useState<string | undefined>(profile?.logo_url || undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = await resolveDocumentPreviewContent({
          id: doc.id,
          content: doc.content,
          user_id: doc.user_id as any,
          patient_id: doc.patient_id as any,
          template_name: doc.template_name as any,
          session_id: doc.session_id ?? null,
          name: doc.name,
        } as any);
        if (cancelled) return;
        setResolvedContent(resolved.resolvedContent);
        if (resolved.logoUrl) setLogoUrl(resolved.logoUrl);
      } catch (err) {
        console.error("Preview resolve error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  return (
    <DocumentPreview
      title={doc.name}
      subtitle={doc.patient_name ? `Patient: ${doc.patient_name}` : undefined}
      content={resolvedContent}
      logoUrl={logoUrl}
      fontFamily={templateFontFamily || headerFooter?.font_family || undefined}
      headerFooter={headerFooter}
      onClose={onClose}
    />
  );
}
