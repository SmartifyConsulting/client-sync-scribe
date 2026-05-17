import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useProviderAccess } from "../../components/ProviderGate";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface AdminRow {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  invited_name: string | null;
  role: string;
  accepted_at: string | null;
  created_at: string;
  email?: string | null;
  full_name?: string | null;
}

export default function AdministratorsScreen() {
  const { providerId, providerType } = useProviderAccess();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [sending, setSending] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const table =
    providerType === "hospital" ? "holarchelp_hospital_members" : "holarchelp_ambulance_members";
  const fkCol = providerType === "hospital" ? "hospital_id" : "provider_id";

  // Fetch owner so we can flag the "Owner" badge
  useEffect(() => {
    if (!providerId || !providerType) return;
    (async () => {
      const t =
        providerType === "hospital" ? "holarchelp_hospitals" : "holarchelp_ambulance_providers";
      const { data } = await supabase.from(t as any).select("owner_id").eq("id", providerId).maybeSingle();
      setOwnerId((data as any)?.owner_id ?? null);
    })();
  }, [providerId, providerType]);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["provider-admins", providerType, providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<AdminRow[]> => {
      const { data, error } = await supabase
        .from(table as any)
        .select("id, user_id, invited_email, invited_name, role, accepted_at, created_at")
        .eq(fkCol, providerId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as AdminRow[];
      const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        const map = new Map(((profiles as any[]) ?? []).map((p) => [p.id, p.full_name]));
        rows.forEach((r) => {
          if (r.user_id) r.full_name = map.get(r.user_id) ?? null;
        });
      }
      return rows;
    },
  });

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!providerId || !providerType) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("invite-provider-admin", {
        body: {
          provider_id: providerId,
          provider_type: providerType,
          email: inviteEmail.trim(),
          name: inviteName.trim() || null,
        },
      });
      if (error) throw error;
      toast.success("Invitation sent");
      setOpen(false);
      setInviteEmail("");
      setInviteName("");
      qc.invalidateQueries({ queryKey: ["provider-admins"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const removeAdmin = async (row: AdminRow) => {
    if (!confirm(`Remove ${row.full_name || row.invited_email || "this admin"}?`)) return;
    const { error } = await supabase.from(table as any).delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["provider-admins"] });
  };

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Administrators
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Invite admin
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {ownerId && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <div className="text-sm">
                    <div className="font-medium">Organisation owner</div>
                    <div className="text-xs text-muted-foreground">Initial registrant — cannot be removed</div>
                  </div>
                  <Badge variant="default">Owner</Badge>
                </div>
              )}
              {admins.length === 0 && (
                <p className="text-sm text-muted-foreground">No additional administrators yet.</p>
              )}
              {admins.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="text-sm">
                    <div className="font-medium">
                      {row.full_name || row.invited_name || row.invited_email || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.invited_email}
                      {" · "}
                      {row.user_id ? "Active" : "Pending invite"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={row.user_id ? "secondary" : "outline"}>
                      {row.role || "admin"}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => removeAdmin(row)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite administrator</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name (optional)</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@hospital.com"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              If they already have a Holarc account it will be linked instantly. Otherwise they'll
              receive an email invitation to join.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendInvite} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
