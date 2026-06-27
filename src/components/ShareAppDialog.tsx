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
import { useTranslation } from "react-i18next";

interface ShareAppDialogProps {
  prefillEmail?: string;
  prefillName?: string;
  trigger?: React.ReactNode;
}

export function ShareAppDialog({ prefillEmail = "", prefillName = "", trigger }: ShareAppDialogProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState(prefillEmail);
  const [name, setName] = useState(prefillName);
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!email.trim()) {
      toast({ title: t("shareApp.emailRequired"), description: t("shareApp.emailRequiredDescription"), variant: "destructive" });
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

      toast({ title: t("shareApp.sentTitle"), description: `${t("shareApp.sentTitle")} ${email}` });
      setOpen(false);
      setEmail(prefillEmail);
      setName(prefillName);
      setMessage("");
    } catch (err: any) {
      toast({ title: t("shareApp.failedTitle"), description: err.message || t("shareApp.failedDescription"), variant: "destructive" });
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
            {t("shareApp.button")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("shareApp.title")}</DialogTitle>
          <DialogDescription>
            {t("shareApp.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="share-name">{t("shareApp.recipientName")}</Label>
            <Input
              id="share-name"
              placeholder={t("shareApp.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="share-email">{t("shareApp.emailAddress")}</Label>
            <Input
              id="share-email"
              type="email"
              placeholder={t("shareApp.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="share-message">{t("shareApp.personalMessage")}</Label>
            <Textarea
              id="share-message"
              placeholder={t("shareApp.messagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSend} className="w-full" disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("shareApp.sendInvitation")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
