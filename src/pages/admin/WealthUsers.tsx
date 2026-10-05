import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type TeamRole = "doctor" | "admin" | "patient" | "referral_agent" | "fsp";
const ROLE_LABEL: Record<TeamRole, string> = {
  doctor: "Wealth Manager", admin: "Admin", patient: "Client", referral_agent: "Referral Agent", fsp: "FSP",
};
const INVITABLE_ROLES: { value: "referral_agent" | "fsp"; label: string }[] = [
  { value: "referral_agent", label: "Referral Agent" },
  { value: "fsp", label: "FSP" },
];

export default function WealthUsers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<{ fullName: string; email: string; role: "referral_agent" | "fsp" }>({ fullName: "", email: "", role: "referral_agent" });
  const [busy, setBusy] = useState(false);

  const members = useQuery({
    queryKey: ["wealth-team-members", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sbx = supabase as any;
      const { data: roles } = await sbx.from("user_roles").select("user_id, role")
        .in("role", ["doctor", "admin", "referral_agent", "fsp"]);
      const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id)));
      if (!ids.length) return [];
      const { data: profiles } = await sbx.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const rolesByUser = new Map<string, TeamRole[]>();
      for (const r of roles ?? []) {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role);
        rolesByUser.set(r.user_id, list);
      }
      return ids.map((id) => ({
        id,
        name: (profiles ?? []).find((p: any) => p.id === id)?.full_name ?? "—",
        avatar: (profiles ?? []).find((p: any) => p.id === id)?.avatar_url ?? null,
        roles: rolesByUser.get(id as string) ?? [],
      }));
    },
  });

  const invites = useQuery({
    queryKey: ["wealth-team-invites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const sbx = supabase as any;
      const { data } = await sbx.from("wealth_team_invites").select("*")
        .eq("owner_user_id", user!.id).neq("status", "cancelled").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const sendInvite = async () => {
    if (!inviteForm.fullName.trim() || !inviteForm.email.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("wealth-team-invite", {
      body: { action: "create", fullName: inviteForm.fullName, email: inviteForm.email, role: inviteForm.role, origin: window.location.origin },
    });
    setBusy(false);
    if (error || data?.error) return toast.error(data?.error ?? "Couldn't send the invite. Please try again.");
    navigator.clipboard.writeText(data.url).catch(() => {});
    toast.success("Invite link copied — send it to your new team member.");
    setInviteOpen(false);
    setInviteForm({ fullName: "", email: "", role: "referral_agent" });
    qc.invalidateQueries({ queryKey: ["wealth-team-invites"] });
  };

  const changeRole = async (userId: string, current: TeamRole[], next: TeamRole) => {
    const sbx = supabase as any;
    const removable = current.filter((r) => r !== "admin");
    if (removable.length) await sbx.from("user_roles").delete().eq("user_id", userId).in("role", removable);
    await sbx.from("user_roles").insert({ user_id: userId, role: next });
    qc.invalidateQueries({ queryKey: ["wealth-team-members"] });
    toast.success("Role updated");
  };

  const revokeAccess = async (userId: string) => {
    const sbx = supabase as any;
    await sbx.from("user_roles").delete().eq("user_id", userId).neq("role", "admin");
    qc.invalidateQueries({ queryKey: ["wealth-team-members"] });
    toast.success("Access revoked");
  };

  const cancelInvite = async (inviteId: string) => {
    const { error } = await supabase.functions.invoke("wealth-team-invite", { body: { action: "cancel", inviteId } });
    if (error) return toast.error("Couldn't cancel the invite.");
    qc.invalidateQueries({ queryKey: ["wealth-team-invites"] });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Users" subtitle="Everyone with access to your firm, and the role each one holds." actions={
        <Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4 mr-1" /> Invite user</Button>
      } />

      <div className="rounded-xl border border-border bg-card divide-y">
        {members.isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : !members.data?.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No team members yet.</p>
        ) : (
          members.data.map((m) => {
            const nonAdminRole = (m.roles.find((r) => r !== "admin") ?? "doctor") as TeamRole;
            return (
              <div key={String(m.id)} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <div className="mt-0.5 flex gap-1.5">
                    {m.roles.map((r) => <Badge key={r} variant="secondary" className="text-2xs">{ROLE_LABEL[r]}</Badge>)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.id !== user?.id && (
                    <>
                      <Select value={nonAdminRole} onValueChange={(v) => changeRole(m.id as string, m.roles, v as TeamRole)}>
                        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["doctor", "referral_agent", "fsp"] as TeamRole[]).map((r) => (
                            <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => revokeAccess(m.id as string)}>Revoke</Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {!!invites.data?.length && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pending invites</p>
          <div className="rounded-xl border border-border bg-card divide-y">
            {invites.data.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.full_name} · <span className="text-muted-foreground">{inv.email}</span></p>
                  <Badge variant="secondary" className="mt-0.5 text-2xs">{ROLE_LABEL[inv.role as TeamRole]}</Badge>
                </div>
                <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => cancelInvite(inv.id)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Invite a user</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5"><Label>Full name</Label><Input value={inviteForm.fullName} onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as "referral_agent" | "fsp" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={busy} onClick={sendInvite}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Copy className="h-4 w-4 mr-1" />}
              Create invite link
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
