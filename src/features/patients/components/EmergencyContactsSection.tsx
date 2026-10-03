import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidOptionalEmail } from "@/lib/validation";


export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  /** What this care team member can see — see careTeamPermissions.ts */
  permissions?: string[];
  can_view_profile?: boolean;
  can_view_live_tracking?: boolean;
  notify_on_missed_medication?: boolean;
  notify_on_taken_medication?: boolean;
}

interface Props {
  patientId: string;
  contacts: EmergencyContact[];
  onChange: (next: EmergencyContact[]) => void;
}

export function EmergencyContactsSection({ patientId, contacts, onChange }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const persist = async (next: EmergencyContact[]) => {
    setSaving(true);
    const { error } = await supabase
      .from("patients")
      .update({ emergency_contacts: next as any })
      .eq("id", patientId);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    onChange(next);
  };

  const addContact = () => {
    persist([
      ...contacts,
      {
        id: crypto.randomUUID(),
        name: "",
        phone: "",
        email: "",
        relationship: "",
        can_view_profile: false,
        can_view_live_tracking: true, // EC default = true
        notify_on_missed_medication: false,
        notify_on_taken_medication: false,
      },
    ]);
  };

  const updateContact = (id: string, patch: Partial<EmergencyContact>) => {
    persist(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeContact = (id: string) => {
    persist(contacts.filter((c) => c.id !== id));
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <ShieldAlert className="h-5 w-5 text-primary" />
          My Personal Care Circle
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Friends and family you share parts of your profile with. Notified by default when you trigger an SOS. Toggle whether they can view your profile or live tracking, or get alerted on missed/taken medication.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {contacts.length === 0 && (
          <p className="text-xs text-muted-foreground">No emergency contacts yet.</p>
        )}
        {contacts.map((c) => (
          <div key={c.id} className="rounded-xl border border-border p-3 space-y-2 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <Label className="text-sm">Name</Label>
                <Input
                  value={c.name}
                  onChange={(e) => updateContact(c.id, { name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label className="text-sm">Relationship</Label>
                <Input
                  value={c.relationship ?? ""}
                  onChange={(e) => updateContact(c.id, { relationship: e.target.value })}
                  placeholder="e.g. Spouse, Child, Friend"
                />
              </div>
              <div>
                <Label className="text-sm">Phone</Label>
                <Input
                  value={c.phone}
                  onChange={(e) => updateContact(c.id, { phone: e.target.value })}
                  placeholder="+27..."
                />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  value={c.email ?? ""}
                  onChange={(e) => updateContact(c.id, { email: e.target.value })}
                  aria-invalid={!isValidOptionalEmail(c.email)}
                  className={!isValidOptionalEmail(c.email) ? "border-destructive focus-visible:ring-destructive" : undefined}
                />
                {!isValidOptionalEmail(c.email) && (
                  <p className="text-xs text-destructive mt-0.5">Enter a valid email address.</p>
                )}
              </div>

            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={!!c.can_view_profile}
                  onCheckedChange={(v) => updateContact(c.id, { can_view_profile: v })}
                />
                Can view my profile
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={c.can_view_live_tracking !== false}
                  onCheckedChange={(v) => updateContact(c.id, { can_view_live_tracking: v })}
                />
                Receive my SOS live tracking
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={!!c.notify_on_missed_medication}
                  onCheckedChange={(v) => updateContact(c.id, { notify_on_missed_medication: v })}
                />
                Alert when I miss medication
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={!!c.notify_on_taken_medication}
                  onCheckedChange={(v) => updateContact(c.id, { notify_on_taken_medication: v })}
                />
                Alert when I take medication
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeContact(c.id)}
                className="ml-auto text-destructive"
                disabled={saving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <Button onClick={addContact} variant="outline" size="sm" disabled={saving}>
          <Plus className="h-4 w-4 mr-1" /> Add Emergency Contact
        </Button>
      </CardContent>
    </Card>
  );
}
