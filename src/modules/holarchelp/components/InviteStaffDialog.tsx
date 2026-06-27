import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export type OrgType = "hospital" | "ambulance";

const HOSPITAL_ROLES: { value: string; labelKey: string }[] = [
  { value: "hospital_admin", labelKey: "roles.hospital_admin" },
  { value: "coordinator", labelKey: "roles.coordinator" },
  { value: "doctor", labelKey: "roles.doctor" },
  { value: "nurse", labelKey: "roles.nurse" },
];

const AMBULANCE_ROLES: { value: string; labelKey: string }[] = [
  { value: "er_admin", labelKey: "roles.er_admin" },
  { value: "paramedic", labelKey: "roles.paramedic" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgType: OrgType;
  orgId: string;
  orgName?: string;
  onInvited?: () => void;
}

export function InviteStaffDialog({ open, onOpenChange, orgType, orgId, orgName, onInvited }: Props) {
  const { t } = useTranslation();
  const roles = orgType === "hospital" ? HOSPITAL_ROLES : AMBULANCE_ROLES;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(roles[0].value);
  const [sending, setSending] = useState(false);

  const reset = () => {
    setEmail(""); setName(""); setRole(roles[0].value);
  };

  const submit = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(t("inviteStaff.validEmail"));
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-provider-admin", {
        body: {
          provider_id: orgId,
          provider_type: orgType,
          email,
          name: name || null,
          invited_role: role,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(t("inviteStaff.sent", { email }));
      reset();
      onOpenChange(false);
      onInvited?.();
    } catch (e: any) {
      toast.error(e?.message ?? t("inviteStaff.failed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inviteStaff.title")}</DialogTitle>
          <DialogDescription>
            {orgName ? t("inviteStaff.descriptionWithOrg", { orgName }) : t("inviteStaff.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>{t("common.email")}</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>{t("inviteStaff.fullNameOptional")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>{t("common.role")}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={submit} disabled={sending || !email}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {t("inviteStaff.sendInvitation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
