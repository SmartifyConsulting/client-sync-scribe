import { useState } from "react";
import { Loader2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InformDocumentDialogProps {
  documentId: string;
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Inform" — shares a link to where the document lives instead of emailing a
 * copy. Recipients who already have an account open it in-app; anyone else is
 * sent a registration link that unlocks the same document after sign-up.
 */
export function InformDocumentDialog({
  documentId,
  documentName,
  open,
  onOpenChange,
}: InformDocumentDialogProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleInform = async () => {
    const recipient = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      toast({ title: "Enter a valid email address", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("inform-document", {
        body: { documentId, recipientEmail: recipient, message: message.trim() || null },
      });
      if (error) throw error;
      toast({
        title: "Link sent",
        description: data?.isRegistered
          ? `${recipient} can open the document in Holarc Health.`
          : `${recipient} was invited to register to access the document.`,
      });
      setEmail("");
      setMessage("");
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Could not send link",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Inform a colleague
          </DialogTitle>
          <DialogDescription className="text-xs">
            Sends a secure link to “{documentName}”. The document itself is never
            attached — it stays in Holarc Health.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Doctor's email address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@practice.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Message (optional)</Label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Context for your colleague…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInform} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Inform
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
