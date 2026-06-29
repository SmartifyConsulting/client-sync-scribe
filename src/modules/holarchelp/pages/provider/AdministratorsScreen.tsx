import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Trash2, UserPlus, Loader2, ShieldCheck, Edit2, Search } from "lucide-react";
import { toast } from "sonner";
import HospitalNetworkScreen from "./ambulance/HospitalNetworkScreen";

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

const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  admin: { bg: "bg-red-100", text: "text-red-800", badge: "bg-red-600" },
  owner: { bg: "bg-red-100", text: "text-red-800", badge: "bg-red-600" },
  manager: { bg: "bg-red-100", text: "text-red-800", badge: "bg-red-600" },
  paramedic: { bg: "bg-green-100", text: "text-green-800", badge: "bg-green-600" },
  emt: { bg: "bg-blue-100", text: "text-blue-800", badge: "bg-blue-600" },
  driver: { bg: "bg-amber-100", text: "text-amber-800", badge: "bg-amber-600" },
  dispatcher: { bg: "bg-purple-100", text: "text-purple-800", badge: "bg-purple-600" },
  nurse: { bg: "bg-pink-100", text: "text-pink-800", badge: "bg-pink-600" },
  supervisor: { bg: "bg-indigo-100", text: "text-indigo-800", badge: "bg-indigo-600" },
};

export default function AdministratorsScreen() {
  const { providerId, providerType, userId } = useProviderAccess();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("paramedic");
  const [addPhone, setAddPhone] = useState("");
  const [addShift, setAddShift] = useState("");
  const [saving, setSaving] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const currentTab = searchParams.get("tab") || "users";

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
      if (userId) {
        const currentUserRow = rows.find((r) => r.user_id === userId);
        if (currentUserRow) {
          setCurrentUserRole(currentUserRow.role);
        }
      }
      return rows;
    },
  });

  const isCurrentUserAdmin = currentUserRole && ADMIN_ROLES.has(currentUserRole.toLowerCase());

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        (m.full_name || "").toLowerCase().includes(q) ||
        (m.invited_name || "").toLowerCase().includes(q) ||
        (m.invited_email || "").toLowerCase().includes(q) ||
        (m.role || "").toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const addMember = async () => {
    if (!addName.trim()) {
      toast.error(t("common.name") + " required");
      return;
    }
    if (!providerId) return;
    setSaving(true);
    try {
      const insertRow: any = {
        [fkCol]: providerId,
        role: addRole,
        invited_name: addName.trim(),
        invited_email: addEmail.trim() || null,
        phone: addPhone.trim() || null,
        shift_pattern: addShift.trim() || null,
        status: "active",
      };
      const { error } = await supabase.from(table as any).insert(insertRow);
      if (error) throw error;
      toast.success(t("userAdmin.memberAdded"));
      setAddOpen(false);
      setAddName("");
      setAddEmail("");
      setAddRole("paramedic");
      setAddPhone("");
      setAddShift("");
      qc.invalidateQueries({ queryKey: ["provider-members"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add member");
    } finally {
      setSaving(false);
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

  const getRoleColor = (role: string) => {
    const roleLower = (role || "member").toLowerCase();
    return ROLE_COLORS[roleLower] || { bg: "bg-gray-100", text: "text-gray-800", badge: "bg-gray-600" };
  };

  const renderMemberCard = (row: MemberRow) => {
    const colors = getRoleColor(row.role);
    const isOwner = row.user_id === ownerId;
    return (
      <div
        key={row.id}
        className={`rounded border p-2.5 flex items-center justify-between text-xs ${colors.bg} ${colors.text}`}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold">
            {row.full_name || row.invited_name || row.invited_email || "—"}
          </p>
          <p className="text-[11px] opacity-70 mt-0.5">
            {[row.invited_email, row.phone].filter(Boolean).join(" · ")}
            {row.user_id ? ` · ${t("administrators.users.active")}` : ` · ${t("administrators.users.pending")}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <div className={`${colors.badge} text-white px-2 py-1 rounded font-semibold text-[10px] whitespace-nowrap`}>
            {(row.role || "member").toUpperCase()}
          </div>
          {isCurrentUserAdmin && !isOwner && (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => removeMember(row)}
              >
                <Trash2 className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("administrators.header.label")}</p>
        <h1 className="text-2xl font-extrabold mt-1">
          {currentTab === "hospital-network" ? t("administrators.header.hospitalNetwork") : t("administrators.header.userManagement")}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {currentTab === "hospital-network"
            ? t("administrators.header.hospitalDesc")
            : t("administrators.header.userDesc")}
        </p>
      </div>

      {!isCurrentUserAdmin && currentTab === "users" && (
        <div className="rounded border bg-amber-50 border-amber-200 text-amber-800 p-2.5 text-xs">
          <p className="font-semibold">📖 {t("administrators.readOnly.label")}</p>
          <p className="mt-0.5">{t("administrators.readOnly.description")}</p>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={(val) => setSearchParams({ tab: val })} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="users" className="text-xs">{t("administrators.tabs.users")}</TabsTrigger>
          <TabsTrigger value="hospital-network" className="text-xs">{t("administrators.tabs.hospitals")}</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b bg-card">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t("administrators.users.title")} ({members.length})
              </h2>
              {isCurrentUserAdmin && (
                <Button size="sm" onClick={() => setAddOpen(true)} className="h-7 text-xs">
                  <UserPlus className="mr-1 h-3 w-3" /> {t("common.add")}
                </Button>
              )}
            </div>

            <div className="p-2.5 space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("administrators.users.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-4">
                  <Loader2 className="h-3 w-3 animate-spin" /> {t("common.loading")}
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {searchQuery ? t("administrators.users.noMatch") : t("administrators.users.noUsers")}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredMembers.map(renderMemberCard)}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hospital-network" className="space-y-3">
          <HospitalNetworkScreen />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("administrators.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("common.name")} *</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={t("administrators.dialog.fullNamePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.email")}</Label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder={t("administrators.dialog.emailPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.role")} *</Label>
              <Select value={addRole} onValueChange={setAddRole}>
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
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder={t("administrators.dialog.phonePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("userAdmin.shiftPattern")}</Label>
              <Input
                value={addShift}
                onChange={(e) => setAddShift(e.target.value)}
                placeholder={t("administrators.dialog.shiftPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={addMember} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
