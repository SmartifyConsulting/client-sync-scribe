import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ShieldAlert, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidOptionalEmail } from "@/lib/validation";

import type { EmergencyContact } from "./EmergencyContactsSection";
import type { NextOfKinMember } from "@/hooks/usePatients";

interface Props {
  patientId: string;
  contacts: EmergencyContact[];
  onChange: (next: EmergencyContact[]) => void;
  nokMembers: NextOfKinMember[];
  legacyNok?: { name?: string; phone?: string; email?: string; relationship?: string };
}

export function EmergencyContactsInline({ patientId, contacts, onChange, nokMembers, legacyNok }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [sameAsNok, setSameAsNok] = useState(false);

  // Determine if contacts mirror NOK list
  useEffect(() => {
    const nokList = buildNokList();
    if (nokList.length === 0) return;
    const looksSame =
      contacts.length === nokList.length &&
      nokList.every((n) => contacts.some((c) => c.name === n.name && c.phone === n.phone));
    setSameAsNok(looksSame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length, nokMembers.length]);

  const buildNokList = (): EmergencyContact[] => {
    const list: EmergencyContact[] = nokMembers.map((n) => ({
      id: crypto.randomUUID(),
      name: n.name,
      phone: n.phone || "",
      email: n.email || "",
      relationship: n.relationship || "",
      can_view_profile: false,
      can_view_live_tracking: true,
    }));
    if (list.length === 0 && legacyNok?.name) {
      list.push({
        id: crypto.randomUUID(),
        name: legacyNok.name,
        phone: legacyNok.phone || "",
        email: legacyNok.email || "",
        relationship: legacyNok.relationship || "",
        can_view_profile: false,
        can_view_live_tracking: true,
      });
    }
    return list;
  };

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

  const handleSameAsNok = (v: boolean) => {
    setSameAsNok(v);
    if (v) persist(buildNokList());
  };

  const addContact = () => {
    setSameAsNok(false);
    persist([
      ...contacts,
      {
        id: crypto.randomUUID(),
        name: "",
        phone: "",
        email: "",
        relationship: "",
        can_view_profile: false,
        can_view_live_tracking: true,
      },
    ]);
  };

  const updateContact = (id: string, patch: Partial<EmergencyContact>) => {
    setSameAsNok(false);
    persist(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeContact = (id: string) => {
    setSameAsNok(false);
    persist(contacts.filter((c) => c.id !== id));
  };

  return (
    <Collapsible defaultOpen={false} className="rounded-xl border border-primary-dark bg-card overflow-hidden">
      <CollapsibleTrigger className="flex w-full items-center justify-between data-[state=open]:border-b border-border hover:bg-muted/40 transition-colors px-4 py-3 group">
        <h3 className="text-xs font-medium text-primary-dark tracking-wide flex items-center gap-2 text-left">
          <ShieldAlert className="h-4 w-4 text-primary" /> Emergency Contacts
        </h3>
        <ChevronDown className="h-4 w-4 text-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="p-3 space-y-3">
        <p className="text-sm text-muted-foreground">
          Notified by default when you trigger SOS. They can be the same as your Next of Kin, or someone different entirely.
        </p>

        <label className="flex items-center gap-2 text-xs">
          <Switch checked={sameAsNok} onCheckedChange={handleSameAsNok} />
          Same as Next of Kin
        </label>

        {!sameAsNok && (
          <>
            {contacts.length === 0 && (
              <p className="text-xs text-muted-foreground">No emergency contacts yet.</p>
            )}
            {contacts.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-sm">Name</Label>
                    <Input value={c.name} onChange={(e) => updateContact(c.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-sm">Relationship</Label>
                    <Input value={c.relationship ?? ""} onChange={(e) => updateContact(c.id, { relationship: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-sm">Phone</Label>
                    <Input value={c.phone} onChange={(e) => updateContact(c.id, { phone: e.target.value })} />
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
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={!!c.can_view_profile} onCheckedChange={(v) => updateContact(c.id, { can_view_profile: v })} />
                    Can view profile
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={c.can_view_live_tracking !== false} onCheckedChange={(v) => updateContact(c.id, { can_view_live_tracking: v })} />
                    Live tracking
                  </label>
                  <Button variant="ghost" size="sm" onClick={() => removeContact(c.id)} className="ml-auto text-destructive h-7" disabled={saving}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <Button onClick={addContact} variant="outline" size="sm" disabled={saving}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Emergency Contact
            </Button>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
