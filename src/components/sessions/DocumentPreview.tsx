import { useState } from "react";
import { X, Eye, Printer, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { printDocument } from "@/utils/documentExport";

const normalizeHeadingMarkup = (content: string): string => {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    const lineAfterNext = lines[i + 2];

    // Check for: Heading followed directly by underline
    if (nextLine && (/^=+$/.test(nextLine.trim()) || /^-+$/.test(nextLine.trim()))) {
      out.push(`<u><b>${line}</b></u>`);
      i++; // skip the underline line
      continue;
    }

    // Check for: Heading followed by blank line then underline
    if (nextLine?.trim() === '' && lineAfterNext && (/^=+$/.test(lineAfterNext.trim()) || /^-+$/.test(lineAfterNext.trim()))) {
      out.push(`<u><b>${line}</b></u>`);
      i += 2; // skip blank line and underline line
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
};

const renderFormattedContent = (content: string): string => {
  const withHeadings = normalizeHeadingMarkup(content);

  const safeContent = withHeadings
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;b&gt;/g, "<b>")
    .replace(/&lt;\/b&gt;/g, "</b>")
    .replace(/&lt;i&gt;/g, "<i>")
    .replace(/&lt;\/i&gt;/g, "</i>")
    .replace(/&lt;u&gt;/g, "<u>")
    .replace(/&lt;\/u&gt;/g, "</u>")
    .replace(/\n/g, "<br/>");

  return safeContent;
};
interface DocumentPreviewProps {
  title: string;
  subtitle?: string;
  content: string;
  logoUrl?: string;
  fontFamily?: string;
  onClose: () => void;
}

export function DocumentPreview({
  title,
  subtitle,
  content,
  logoUrl,
  fontFamily,
  onClose,
}: DocumentPreviewProps) {
  const { toast } = useToast();
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState(title);
  const [isSending, setIsSending] = useState(false);

  const handlePrint = () => {
    printDocument(content, title, logoUrl, fontFamily);
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
          content: content,
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
              fontFamily: fontFamily || "system-ui, -apple-system, sans-serif",
            }}
          >
            {/* Logo */}
            {logoUrl && (
              <div className="mb-6">
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="max-h-16 object-contain"
                />
              </div>
            )}
            
            {/* Document Content */}
            <div 
              className="whitespace-pre-wrap text-sm text-black leading-relaxed"
              style={{ 
                fontFamily: fontFamily || "system-ui, -apple-system, sans-serif",
                fontSize: "12pt",
              }}
              dangerouslySetInnerHTML={{ __html: renderFormattedContent(content) }}
            />
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <Button variant="outline" onClick={onClose}>
            Back to Form
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
