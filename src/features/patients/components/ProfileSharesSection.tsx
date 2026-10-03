import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Share {
  id: string;
  shared_with_username: string | null;
  shared_with_email: string | null;
  shared_with_user_id: string | null;
  shared_with_first_name: string | null;
  shared_with_last_name: string | null;
  relationship: string | null;
  can_view_profile: boolean;
  can_view_live_tracking: boolean;
}

export function ProfileSharesSection({ ownerUserId }: { ownerUserId: string }) {
  const { toast } = useToast();
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [allowTracking, setAllowTracking] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_profile_shares")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Could not load shares", description: error.message, variant: "destructive" });
      return;
    }
    setShares((data ?? []) as any);
  };

  useEffect(() => { load(); }, [ownerUserId]);

  const addShare = async () => {
    const value = usernameOrEmail.trim();
    if (!value) return;
    setAdding(true);
    const isEmail = value.includes("@");
    let resolvedUserId: string | null = null;
    let username: string | null = null;
    let email: string | null = null;

    if (isEmail) {
      email = value.toLowerCase();
      // Look up profile by email indirectly is not possible from client; fall back to username search
    } else {
      username = value.toLowerCase();
      const { data } = await supabase
        .from("profiles")
        .select("id, mailbox_alias")
        .eq("mailbox_alias", username)
        .maybeSingle();
      if (data) resolvedUserId = (data as any).id;
    }

    const { error } = await supabase.from("patient_profile_shares").insert({
      owner_user_id: ownerUserId,
      shared_with_user_id: resolvedUserId,
      shared_with_username: username,
      shared_with_email: email,
      shared_with_first_name: firstName.trim() || null,
      shared_with_last_name: lastName.trim() || null,
      relationship: relationship || null,
      can_view_profile: true,
      can_view_live_tracking: allowTracking,
      source: "manual",
    } as any);
    setAdding(false);
    if (error) {
      toast({ title: "Could not add share", description: error.message, variant: "destructive" });
      return;
    }
    setFirstName("");
    setLastName("");
    setUsernameOrEmail("");
    setRelationship("");
    setAllowTracking(false);
    toast({ title: "Access granted" });
    load();
  };

  const updateShare = async (id: string, patch: Partial<Share>) => {
    const { error } = await supabase
      .from("patient_profile_shares")
      .update(patch as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setShares((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeShare = async (id: string) => {
    const { error } = await supabase.from("patient_profile_shares").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setShares((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Who can see my profile
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Share your profile with family — e.g. an elderly parent allowing a child, or a child allowing a parent.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label className="text-sm">First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <Label className="text-sm">Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
            </div>
            <div>
              <Label className="text-sm">Username or email</Label>
              <Input
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="jane-doe or jane@example.com"
              />
            </div>
            <div>
              <Label className="text-sm">Relationship</Label>
              <Input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Child, Parent, Spouse..."
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={allowTracking} onCheckedChange={setAllowTracking} />
            Also share live tracking when I trigger SOS
          </label>
          <Button size="sm" onClick={addShare} disabled={adding || !usernameOrEmail.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Grant access
          </Button>
        </div>

        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && shares.length === 0 && (
          <p className="text-xs text-muted-foreground">No one has access yet.</p>
        )}
        {shares.map((s) => (
          <div key={s.id} className="rounded-xl border border-border p-3 bg-muted/30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">
                  {[s.shared_with_first_name, s.shared_with_last_name].filter(Boolean).join(" ")
                    || s.shared_with_username
                    || s.shared_with_email}
                  {s.relationship && (
                    <span className="ml-2 text-xs text-muted-foreground">({s.relationship})</span>
                  )}
                </p>
                {(s.shared_with_first_name || s.shared_with_last_name) && (s.shared_with_username || s.shared_with_email) && (
                  <p className="text-xs text-muted-foreground">{s.shared_with_username ?? s.shared_with_email}</p>
                )}
                {!s.shared_with_user_id && (
                  <p className="text-sm text-amber-600">Pending — they'll get access once they sign up.</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeShare(s.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 pt-2">
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={s.can_view_profile}
                  onCheckedChange={(v) => updateShare(s.id, { can_view_profile: v })}
                />
                Profile
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={s.can_view_live_tracking}
                  onCheckedChange={(v) => updateShare(s.id, { can_view_live_tracking: v })}
                />
                SOS live tracking
              </label>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
