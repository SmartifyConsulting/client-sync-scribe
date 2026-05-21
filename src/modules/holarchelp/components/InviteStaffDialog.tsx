import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type OrgType = "hospital" | "ambulance";

const HOSPITAL_ROLES: { value: string; label: string }[] = [
  { value: "hospital_admin", label: "Hospital Admin" },
  { value: "coordinator", label: "Coordinator" },
  { value: "doctor", label: "Doctor" },
  { value: "nurse", label: "Nurse" },
];

const AMBULANCE_ROLES: { value: string; label: string }[] = [
  { value: "er_admin", label: "ER Admin" },
  { value: "paramedic", label: "Paramedic" },
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
      toast.error("Please enter a valid email");
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
      toast.success(`Invitation sent to ${email}`);
      reset();
      onOpenChange(false);
      onInvited?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>
            {orgName ? `Invite a team member to ${orgName}.` : "Invite a team member to this organisation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Full name (optional)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={sending || !email}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
