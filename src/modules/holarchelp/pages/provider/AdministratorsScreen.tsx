import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useProviderAccess } from "../../components/ProviderGate";
import { useAuth } from "@/hooks/useAuth";

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
import { Trash2, UserPlus, Loader2, ShieldCheck, Edit2, Search } from "lucide-react";
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

const ROLE_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  admin: { bg: "bg-destructive/10", text: "text-destructive", badge: "bg-destructive" },
  owner: { bg: "bg-destructive/10", text: "text-destructive", badge: "bg-destructive" },
  manager: { bg: "bg-destructive/10", text: "text-destructive", badge: "bg-destructive" },
  paramedic: { bg: "bg-success/10", text: "text-success", badge: "bg-success" },
  emt: { bg: "bg-primary/10", text: "text-primary", badge: "bg-primary" },
  driver: { bg: "bg-warning/10", text: "text-warning", badge: "bg-warning" },
  dispatcher: { bg: "bg-accent/40", text: "text-accent-foreground", badge: "bg-accent" },
  nurse: { bg: "bg-accent/40", text: "text-accent-foreground", badge: "bg-accent" },
  supervisor: { bg: "bg-accent/40", text: "text-accent-foreground", badge: "bg-accent" },
};

export default function AdministratorsScreen() {
  const { providerId, providerType } = useProviderAccess();
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { t } = useTranslation();
  const qc = useQueryClient();
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
    return ROLE_COLORS[roleLower] || { bg: "bg-muted", text: "text-muted-foreground", badge: "bg-gray-600" };
  };

  const renderMemberCard = (row: MemberRow) => {
    const colors = getRoleColor(row.role);
    const isOwner = row.user_id === ownerId;
    return (
      <div
        key={row.id}
        className={`rounded-lg border p-4 ${colors.bg} ${colors.text}`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-semibold text-lg">
              {row.full_name || row.invited_name || row.invited_email || "—"}
            </div>
            <div className="text-sm opacity-75 mt-1">
              {[row.invited_email, row.phone].filter(Boolean).join(" · ")}
              {row.shift_pattern ? ` · ${row.shift_pattern}` : ""}
              {" · "}
              {row.user_id ? t("common.active") : t("common.pending")}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`${colors.badge} text-white px-4 py-2 rounded text-sm font-semibold`}>
              {(row.role || "member").toUpperCase()}
            </div>
          </div>
        </div>
        {isCurrentUserAdmin && !isOwner && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-current border-opacity-20">
            <Button size="sm" variant="ghost" className="flex-1 text-sm">
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-sm"
              onClick={() => removeMember(row)}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Administration</p>
        <h1 className="text-3xl font-extrabold mt-2">User Management</h1>
        <p className="text-sm text-muted-foreground mt-2">Manage all users, admins, and crew members</p>
      </div>

      {!isCurrentUserAdmin && (
        <div className="rounded-lg bg-warning/10 border border-amber-200 text-warning p-4">
          <p className="font-semibold">📖 Read-Only View</p>
          <p className="text-sm mt-1">Only Admin users can add, edit, or remove members</p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Users ({members.length})
          </CardTitle>
          {isCurrentUserAdmin && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" /> Add User
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("common.loading")}
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? "No users match your search" : "No users yet"}
            </p>
          ) : (
            <div className="grid gap-3">
              {filteredMembers.map(renderMemberCard)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("common.name")} *</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("common.email")}</Label>
              <Input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="user@example.com"
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
                placeholder="+27 82 555 0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("userAdmin.shiftPattern")}</Label>
              <Input
                value={addShift}
                onChange={(e) => setAddShift(e.target.value)}
                placeholder="Mon–Fri 07:00–19:00"
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
