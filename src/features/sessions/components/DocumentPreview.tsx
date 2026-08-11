import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Eye, Printer, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { printDocument } from "@/utils/documentExport";
import { HeaderFooterTemplate } from "@/hooks/useHeaderFooterTemplates";
import { fillDocumentPlaceholders } from "@/lib/fillDocumentPlaceholders";
import { DocumentCanvas } from "@/features/documents/templates/DocumentCanvas";

interface DocumentPreviewProps {
  title: string;
  subtitle?: string;
  content: string;
  logoUrl?: string;
  fontFamily?: string;
  headerFooter?: HeaderFooterTemplate | null;
  onClose: () => void;
  closeLabel?: string;
  /** Optional extra footer action(s) rendered next to Share / Print. */
  extraActions?: React.ReactNode;

}

export function DocumentPreview({
  title,
  subtitle,
  content,
  logoUrl,
  fontFamily,
  headerFooter,
  onClose,
  closeLabel = "Close",
  extraActions,

}: DocumentPreviewProps) {
  const { toast } = useToast();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState(title);
  const [isSending, setIsSending] = useState(false);

  // Belt-and-braces: if the parent forgot to resolve placeholders, do it here too.
  // No-op if `content` already has no [Token] markers.
  const safeContent = useMemo(() => {
    if (!content) return content;
    if (!/\[[A-Za-z][A-Za-z0-9 _-]*\]/.test(content)) return content;
    try {
      return fillDocumentPlaceholders(content, {
        patient: null,
        profile: null,
        invoice: null,
        today: new Date(),
      }).content;
    } catch {
      return content;
    }
  }, [content]);

  const handlePrint = () => {
    printDocument(safeContent, title, logoUrl, fontFamily, headerFooter || undefined);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-document-email", {
        body: {
          to: recipientEmail,
          subject: emailSubject,
          content: safeContent,
          documentType: title,
        },
      });

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Document sent to ${recipientEmail}`,
      });
      setShowEmailDialog(false);
      setRecipientEmail("");
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-xl border border-primary bg-card shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Preview</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Print-ready Document Preview */}
        <div className="p-6 max-h-[60vh] overflow-y-auto bg-muted/30">
          <DocumentCanvas
            content={safeContent}
            headerFooter={headerFooter}
            fontFamily={fontFamily}
            logoUrl={logoUrl}
          />
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>
            {closeLabel}
          </Button>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowEmailDialog(true)} 
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Share
            </Button>
            <Button 
              variant="outline" 
              onClick={handlePrint} 
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            {extraActions}
          </div>

        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document via Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSending} className="gap-2">
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  // Rendered in a portal above any open dialog / toast so the document is
  // always in front, with its own close button in the header.
  return typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay;
}
