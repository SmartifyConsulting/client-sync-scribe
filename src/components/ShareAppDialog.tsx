import { useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ShareAppDialogProps {
  prefillEmail?: string;
  prefillName?: string;
  trigger?: React.ReactNode;
}

export function ShareAppDialog({ prefillEmail = "", prefillName = "", trigger }: ShareAppDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState(prefillEmail);
  const [name, setName] = useState(prefillName);
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!email.trim()) {
      toast({ title: "Email required", description: "Please enter the recipient's email address.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-user-invitation", {
        body: {
          recipientEmail: email.trim(),
          message: message.trim() || null,
          partnerName: name.trim() || null,
          isReferral: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Invitation sent!", description: `An invitation has been sent to ${email}` });
      setOpen(false);
      setEmail(prefillEmail);
      setName(prefillName);
      setMessage("");
    } catch (err: any) {
      toast({ title: "Failed to send invitation", description: err.message || "Please try again later.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { setEmail(prefillEmail); setName(prefillName); } }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share App
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Holarc</DialogTitle>
          <DialogDescription>
            Invite someone to join Holarc. You'll earn Vulas when they accept! This does not add them as your patient.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="share-name">Recipient Name</Label>
            <Input
              id="share-name"
              placeholder="e.g. John Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="share-email">Email Address *</Label>
            <Input
              id="share-email"
              type="email"
              placeholder="e.g. john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="share-message">Personal Message (optional)</Label>
            <Textarea
              id="share-message"
              placeholder="Add a personal note to your invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSend} className="w-full" disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
