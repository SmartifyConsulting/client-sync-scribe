import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, HeartHandshake } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { SectionHeader, FIELD_GRID_2_CLASS } from "./sectionStyles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidOptionalEmail } from "@/lib/validation";
import {
  CARE_TEAM_PERMISSIONS,
  CARE_TEAM_BLURB,
  DEFAULT_CARE_TEAM_PERMISSIONS,
  resolvePermissions,
  togglePermission,
} from "@/features/patients/lib/careTeamPermissions";

import type { EmergencyContact } from "./EmergencyContactsSection";
import type { NextOfKinMember } from "@/hooks/usePatients";

interface Props {
  patientId: string;
  contacts: EmergencyContact[];
  onChange: (next: EmergencyContact[]) => void;
  nokMembers: NextOfKinMember[];
  legacyNok?: { name?: string; phone?: string; email?: string; relationship?: string };
  flat?: boolean;
  /** Renders the fields without the collapsible section chrome. */
  bare?: boolean;
}

/**
 * My Holarc Care Team — the friends and family a patient shares parts of their
 * profile with. Next of Kin is listed here by default; each member carries an
 * explicit list of what they can see.
 */
export function EmergencyContactsInline({ patientId, contacts, onChange, nokMembers, legacyNok, bare }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const seeded = useRef(false);

  const buildNokList = (): EmergencyContact[] => {
    const list: EmergencyContact[] = nokMembers.map((n) => ({
      id: crypto.randomUUID(),
      name: n.name,
      phone: n.phone || "",
      email: n.email || "",
      relationship: n.relationship || "",
      permissions: [...DEFAULT_CARE_TEAM_PERMISSIONS],
    }));
    if (list.length === 0 && legacyNok?.name) {
      list.push({
        id: crypto.randomUUID(),
        name: legacyNok.name,
        phone: legacyNok.phone || "",
        email: legacyNok.email || "",
        relationship: legacyNok.relationship || "",
        permissions: [...DEFAULT_CARE_TEAM_PERMISSIONS],
      });
    }
    return list;
  };

  // With nothing captured yet, the patient's Next of Kin is listed as the first
  // care team member. It can be edited, kept or deleted like any other.
  useEffect(() => {
    if (seeded.current || contacts.length > 0) return;
    const nokList = buildNokList();
    if (nokList.length === 0) return;
    seeded.current = true;
    persist(nokList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts.length, nokMembers.length, legacyNok?.name]);

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
        permissions: [...DEFAULT_CARE_TEAM_PERMISSIONS],
      },
    ]);
  };

  const updateContact = (id: string, patch: Partial<EmergencyContact>) => {
    persist(contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeContact = (id: string) => {
    persist(contacts.filter((c) => c.id !== id));
  };

  const body = (
    <div className={bare ? "space-y-3" : "p-3 space-y-3"}>
      <p className="text-sm text-muted-foreground">{CARE_TEAM_BLURB}</p>

      {contacts.length === 0 && (
        <p className="text-xs text-muted-foreground">No care team members yet.</p>
      )}

      {contacts.map((c) => {
        const perms = resolvePermissions(c as any);
        return (
          <div key={c.id} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/30">
            <div className={FIELD_GRID_2_CLASS}>
              <div>
                <Label className="text-xs font-bold">Name</Label>
                <Input value={c.name} onChange={(e) => updateContact(c.id, { name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-bold">Relationship</Label>
                <Input value={c.relationship ?? ""} onChange={(e) => updateContact(c.id, { relationship: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-bold">Phone</Label>
                <Input value={c.phone} onChange={(e) => updateContact(c.id, { phone: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs font-bold">Email</Label>
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

            <div className="pt-1">
              <p className="text-xs font-bold mb-1.5">
                What {c.name?.trim() || "this person"} can see
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2 sm:grid-rows-7 sm:grid-flow-col lg:grid-cols-3 lg:grid-rows-5">
                {CARE_TEAM_PERMISSIONS.map((p) => (
                  <label key={p.id} className="flex items-start gap-2 text-xs">
                    <Checkbox
                      className="mt-0.5"
                      checked={perms.includes(p.id)}
                      onCheckedChange={(v) =>
                        updateContact(c.id, { permissions: togglePermission(perms, p.id, v === true) })
                      }
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeContact(c.id)} className="text-destructive h-7" disabled={saving}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}

      <Button onClick={addContact} variant="outline" size="sm" disabled={saving}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Care Team Member
      </Button>
    </div>
  );

  if (bare) return body;

  return (
    <Collapsible defaultOpen={false} className="bg-white overflow-hidden">
      <SectionHeader icon={HeartHandshake} label="My Holarc Care Team" />
      <CollapsibleContent>{body}</CollapsibleContent>
    </Collapsible>
  );
}
