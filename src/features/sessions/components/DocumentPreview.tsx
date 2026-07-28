import { useState, useMemo } from "react";
import { X, Eye, Printer, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { printDocument } from "@/utils/documentExport";
import { HeaderFooterTemplate } from "@/hooks/useHeaderFooterTemplates";
import { renderFormattedContent } from "@/utils/documentFormatting";
import { fillDocumentPlaceholders } from "@/lib/fillDocumentPlaceholders";

const FONT_FAMILY_MAP: Record<string, string> = {
  sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  roboto: '"Roboto", sans-serif',
  "open-sans": '"Open Sans", sans-serif',
  lora: '"Lora", serif',
  merriweather: '"Merriweather", serif',
  playfair: '"Playfair Display", serif',
  "source-serif": '"Source Serif 4", serif',
  rockwell: 'Rockwell, Georgia, serif',
};

const resolveFont = (key?: string | null) =>
  (key && FONT_FAMILY_MAP[key]) || FONT_FAMILY_MAP.sans;

function renderHeaderFooterSection(section: { left: { text: string; alignment: string; imageUrl?: string }; center: { text: string; alignment: string; imageUrl?: string }; right: { text: string; alignment: string; imageUrl?: string } }, fontFamily?: string) {
  const hasContent = section.left?.text || section.center?.text || section.right?.text || section.left?.imageUrl || section.center?.imageUrl || section.right?.imageUrl;
  if (!hasContent) return null;

  const renderCell = (cell: { text: string; alignment: string; imageUrl?: string }, align: string) => (
    <div style={{ textAlign: align as any }}>
      {cell.imageUrl && <img src={cell.imageUrl} alt="" style={{ maxHeight: '50px', objectFit: 'contain', marginBottom: '4px' }} />}
      {cell.text && (
        <div
          style={{ whiteSpace: 'pre-wrap', fontSize: '9pt', lineHeight: '1.4', fontFamily: resolveFont(fontFamily) }}
          dangerouslySetInnerHTML={{ __html: renderFormattedContent(cell.text) }}
        />
      )}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', width: '100%' }}>
      {renderCell(section.left, 'left')}
      {renderCell(section.center, 'center')}
      {renderCell(section.right, 'right')}
    </div>
  );
}

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
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
          <div 
            className="bg-white shadow-lg mx-auto"
            style={{
              width: "210mm",
              minHeight: "297mm",
              maxWidth: "100%",
              padding: "20mm",
              fontFamily: resolveFont(fontFamily),
            }}
          >
            {/* Structured Header */}
            {headerFooter?.header && renderHeaderFooterSection(headerFooter.header, fontFamily || headerFooter.font_family || undefined) && (
              <div style={{ marginBottom: '16px' }}>
                {renderHeaderFooterSection(headerFooter.header, fontFamily || headerFooter.font_family || undefined)}
                <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '12px 0' }} />
              </div>
            )}

            {/* Logo (fallback if no header template) */}
            {!headerFooter?.header && logoUrl && (
              <div className="mb-6">
                <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
              </div>
            )}
            
            {/* Document Content */}
            <div 
              className="whitespace-pre-wrap text-black leading-relaxed"
              style={{ 
                fontFamily: resolveFont(fontFamily),
                fontSize: "14px",
              }}
              dangerouslySetInnerHTML={{ __html: renderFormattedContent(safeContent) }}
            />

            {/* Structured Footer */}
            {headerFooter?.footer && renderHeaderFooterSection(headerFooter.footer, fontFamily || headerFooter.font_family || undefined) && (
              <div style={{ marginTop: '24px' }}>
                <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '12px 0' }} />
                {renderHeaderFooterSection(headerFooter.footer, fontFamily || headerFooter.font_family || undefined)}
              </div>
            )}
          </div>
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
}
