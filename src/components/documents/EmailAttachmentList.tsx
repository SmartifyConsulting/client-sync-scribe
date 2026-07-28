import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DocumentAttachment {
  name: string;
  path: string;
  size?: number;
  contentType?: string;
}

/** Chips that open a short-lived signed URL for each emailed attachment. */
export function EmailAttachmentList({ attachments }: { attachments: DocumentAttachment[] }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!attachments?.length) return null;

  const open = async (att: DocumentAttachment) => {
    setBusy(att.path);
    const { data, error } = await supabase.storage
      .from("email-attachments")
      .createSignedUrl(att.path, 60);
    setBusy(null);
    if (error || !data?.signedUrl) {
      toast({
        title: "Could not open attachment",
        description: error?.message || "The file is no longer available.",
        variant: "destructive",
      });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap gap-1.5 pl-10 pb-2">
      {attachments.map((att) => (
        <button
          key={att.path}
          type="button"
          onClick={() => open(att)}
          className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs text-foreground hover:bg-accent/60 transition-colors max-w-[220px]"
          title={att.name}
        >
          {busy === att.path ? (
            <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          ) : (
            <Paperclip className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{att.name}</span>
          {typeof att.size === "number" && (
            <span className="text-muted-foreground shrink-0">
              {(att.size / 1024).toFixed(0)} KB
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
