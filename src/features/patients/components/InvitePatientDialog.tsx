import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { PermissionTransparencyModal } from "@/components/permissions/PermissionTransparencyModal";

interface InvitePatientDialogProps {
  patientId: string;
  patientName: string;
}

export function InvitePatientDialog({ patientId, patientName }: InvitePatientDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showTransparency, setShowTransparency] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useProfile();

  const handleSendInvitation = async () => {
    if (!email) {
      toast({
        title: t("forms.validation.required"),
        description: t("doctor.referrals.errors.emailRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-patient-invitation", {
        body: {
          patientEmail: email,
          patientName: patientName,
          patientId: patientId,
          doctorName: profile?.full_name || t("common.name"),
          practiceName: profile?.practice_address || t("common.name"),
        },
      });

      if (error) throw error;

      toast({
        title: t("dialogs.success"),
        description: t("doctor.referrals.messages.inviteSentDesc") + " " + email,
      });

      setEmail("");
      setOpen(false);
    } catch (error: any) {
      console.error("Failed to send invitation:", error);
      toast({
        title: t("dialogs.error"),
        description: error.message || t("messages.error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          {t("doctor.referrals.actions.inviteButton")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("doctor.referrals.form.title")}</DialogTitle>
          <DialogDescription>
            {t("doctor.referrals.form.sendInvite")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("forms.labels.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("forms.placeholders.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("dialogs.cancel")}
          </Button>
          <Button
            onClick={() => {
              if (!email) {
                toast({
                  title: t("forms.validation.required"),
                  description: t("doctor.referrals.errors.emailRequiredDesc"),
                  variant: "destructive",
                });
                return;
              }
              setShowTransparency(true);
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              t("common.loading")
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t("doctor.referrals.actions.inviteButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
      <PermissionTransparencyModal
        open={showTransparency}
        onOpenChange={setShowTransparency}
        mode="doctor_invites_patient"
        confirmLabel={t("doctor.referrals.messages.inviteSentTitle")}
        onConfirm={async () => {
          setShowTransparency(false);
          await handleSendInvitation();
        }}
      />
    </Dialog>
  );
}
