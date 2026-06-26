import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, UserPlus, Loader2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

interface MemberRow {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  invited_name: string | null;
  role: string;
  phone: string | null;
  status: string;
  shift_pattern: string | null;
  accepted_at: string | null;
  created_at: string;
  full_name?: string | null;
}

const ADMIN_ROLES = new Set(["admin", "owner", "manager"]);
const CREW_ROLE_OPTIONS = [
  "paramedic",
  "emt",
  "driver",
  "dispatcher",
  "nurse",
  "supervisor",
];

export default function AdministratorsScreen() {
  const { providerId, providerType } = useProviderAccess();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [sending, setSending] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  const [crewOpen, setCrewOpen] = useState(false);
  const [crewName, setCrewName] = useState("");
  const [crewRole, setCrewRole] = useState("paramedic");
  const [crewPhone, setCrewPhone] = useState("");
  const [crewEmail, setCrewEmail] = useState("");
  const [crewShift, setCrewShift] = useState("");
  const [savingCrew, setSavingCrew] = useState(false);

  const table =
    providerType === "hospital"
      ? "holarchelp_hospital_members"
      : "holarchelp_ambulance_members";
  const fkCol = providerType === "hospital" ? "hospital_id" : "provider_id";

  useEffect(() => {
    if (!providerId || !providerType) return;
    (async () => {
      const t2 =
        providerType === "hospital"
          ? "holarchelp_hospitals"
          : "holarchelp_ambulance_providers";
      const { data } = await supabase
        .from(t2 as any)
        .select("owner_id")
        .eq("id", providerId)
        .maybeSingle();
      setOwnerId((data as any)?.owner_id ?? null);
    })();
  }, [providerId, providerType]);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["provider-members", providerType, providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from(table as any)
        .select(
          "id, user_id, invited_email, invited_name, role, phone, status, shift_pattern, accepted_at, created_at",
        )
        .eq(fkCol, providerId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = ((data ?? []) as unknown) as MemberRow[];
      const userIds = rows.map((r) => r.user_id).filter(Boolean) as string[];
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        const map = new Map(
          ((profiles as any[]) ?? []).map((p) => [p.id, p.full_name]),
        );
        rows.forEach((r) => {
          if (r.user_id) r.full_name = map.get(r.user_id) ?? null;
        });
      }
      return rows;
    },
  });

  const admins = members.filter((m) =>
    ADMIN_ROLES.has((m.role || "").toLowerCase()),
  );
  const crew = members.filter(
    (m) => !ADMIN_ROLES.has((m.role || "").toLowerCase()),
  );

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
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      qc.invalidateQueries({ queryKey: ["provider-members"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const addCrew = async () => {
    if (!crewName.trim()) {
      toast.error(t("common.name") + " required");
      return;
    }
    if (!providerId) return;
    setSavingCrew(true);
    try {
      const insertRow: any = {
        [fkCol]: providerId,
        role: crewRole,
        invited_name: crewName.trim(),
        invited_email: crewEmail.trim() || null,
        phone: crewPhone.trim() || null,
        shift_pattern: crewShift.trim() || null,
        status: "active",
      };
      const { error } = await supabase.from(table as any).insert(insertRow);
      if (error) throw error;
      toast.success(t("userAdmin.memberAdded"));
      setCrewOpen(false);
      setCrewName("");
      setCrewRole("paramedic");
      setCrewPhone("");
      setCrewEmail("");
      setCrewShift("");
      qc.invalidateQueries({ queryKey: ["provider-members"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add crew member");
    } finally {
      setSavingCrew(false);
    }
  };

  const removeMember = async (row: MemberRow) => {
    if (!confirm(t("userAdmin.removeConfirm"))) return;
    const { error } = await supabase.from(table as any).delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("userAdmin.memberRemoved"));
    qc.invalidateQueries({ queryKey: ["provider-members"] });
  };

  const renderMemberRow = (row: MemberRow) => (
    <div
      key={row.id}
      className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
    >
      <div className="text-sm">
        <div className="font-medium">
          {row.full_name || row.invited_name || row.invited_email || "—"}
        </div>
        <div className="text-xs text-muted-foreground">
          {[row.invited_email, row.phone].filter(Boolean).join(" · ")}
          {row.shift_pattern ? ` · ${row.shift_pattern}` : ""}
          {" · "}
          {row.user_id ? t("common.active") : t("common.pending")}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={row.user_id ? "secondary" : "outline"}>
          {row.role || "member"}
        </Badge>
        <Button size="icon" variant="ghost" onClick={() => removeMember(row)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  const showCrewTab = providerType === "ambulance";

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("userAdmin.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="admins" className="w-full">
            <TabsList>
              <TabsTrigger value="admins">{t("userAdmin.tabAdmins")}</TabsTrigger>
              {showCrewTab && (
                <TabsTrigger value="crew">{t("userAdmin.tabCrew")}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="admins" className="mt-4 space-y-2">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> {t("userAdmin.inviteAdmin")}
                </Button>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
                </div>
              ) : (
                <>
                  {ownerId && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <div className="text-sm">
                        <div className="font-medium">{t("userAdmin.organisationOwner")}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("userAdmin.ownerCannotRemove")}
                        </div>
                      </div>
                      <Badge variant="default">{t("userAdmin.owner")}</Badge>
                    </div>
                  )}
                  {admins.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("userAdmin.noAdmins")}
                    </p>
                  ) : (
                    admins.map(renderMemberRow)
                  )}
                </>
              )}
            </TabsContent>

            {showCrewTab && (
              <TabsContent value="crew" className="mt-4 space-y-2">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setCrewOpen(true)}>
                    <Users className="mr-2 h-4 w-4" /> {t("userAdmin.addCrew")}
                  </Button>
                </div>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
                  </div>
                ) : crew.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("userAdmin.noCrew")}</p>
                ) : (
                  crew.map(renderMemberRow)
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Invite admin dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("userAdmin.inviteAdmin")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.email")}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={sendInvite} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add crew dialog */}
      <Dialog open={crewOpen} onOpenChange={setCrewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("userAdmin.addCrew")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("common.name")}</Label>
              <Input value={crewName} onChange={(e) => setCrewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.role")}</Label>
              <Select value={crewRole} onValueChange={setCrewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREW_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.phone")}</Label>
              <Input
                value={crewPhone}
                onChange={(e) => setCrewPhone(e.target.value)}
                placeholder="+27 82 555 0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.email")}</Label>
              <Input
                type="email"
                value={crewEmail}
                onChange={(e) => setCrewEmail(e.target.value)}
                placeholder="crew@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("userAdmin.shiftPattern")}</Label>
              <Input
                value={crewShift}
                onChange={(e) => setCrewShift(e.target.value)}
                placeholder="Mon–Fri 07:00–19:00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCrewOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={addCrew} disabled={savingCrew}>
              {savingCrew && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
