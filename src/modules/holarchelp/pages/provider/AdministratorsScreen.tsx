import { toastError } from "@/lib/userMessage";
import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useProviderAccess } from "../../components/ProviderGate";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Trash2, UserPlus, Loader2, ShieldCheck, Edit2, Search, Phone, Mail, Copy } from "lucide-react";
import { toast } from "sonner";
import HospitalNetworkScreen from "./ambulance/HospitalNetworkScreen";
import FleetOperationsScreen from "./ambulance/FleetOperationsScreen";
import CrewAssignmentsTab from "./CrewAssignmentsTab";

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
  profile_phone?: string | null;
  profile_email?: string | null;
}

const ADMIN_ROLES = new Set(["admin", "owner", "manager", "er_admin"]);

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrators",
  dispatcher: "Dispatchers",
  driver: "Drivers",
  emt: "EMTs",
  er_admin: "ER_Admin",
  manager: "Managers",
  member: "Members",
  nurse: "Nurses",
  owner: "Owners",
  paramedic: "Paramedics",
  supervisor: "Supervisors",
};

// Alphabetically ordered crew role options for the Add member dropdown.
const CREW_ROLE_OPTIONS = [
  "admin",
  "dispatcher",
  "driver",
  "emt",
  "er_admin",
  "manager",
  "nurse",
  "paramedic",
  "supervisor",
].sort((a, b) =>
  (ROLE_LABELS[a] ?? a).localeCompare(ROLE_LABELS[b] ?? b),
);

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
          ((profiles as any[]) ?? []).map((p) => [p.id, p]),
        );
        rows.forEach((r) => {
          if (r.user_id) {
            const p = map.get(r.user_id);
            if (p) {
              r.full_name = p.full_name ?? null;
            }
          }
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

  // Filter then group by role
  const groupedByRole = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? members.filter(
          (m) =>
            (m.full_name || "").toLowerCase().includes(q) ||
            (m.invited_name || "").toLowerCase().includes(q) ||
            (m.invited_email || "").toLowerCase().includes(q) ||
            (m.profile_email || "").toLowerCase().includes(q) ||
            (m.phone || "").toLowerCase().includes(q) ||
            (m.profile_phone || "").toLowerCase().includes(q) ||
            (m.role || "").toLowerCase().includes(q)
        )
      : members;

    const groups = new Map<string, MemberRow[]>();
    for (const m of filtered) {
      const key = (m.role || "member").toLowerCase();
      const bucket = groups.get(key) ?? [];
      bucket.push(m);
      groups.set(key, bucket);
    }
    // Alphabetical order by display label.
    const ordered: { role: string; rows: MemberRow[] }[] = [];
    const keys = Array.from(groups.keys()).sort((a, b) => {
      const la = ROLE_LABELS[a] ?? a;
      const lb = ROLE_LABELS[b] ?? b;
      return la.localeCompare(lb);
    });
    for (const role of keys) {
      ordered.push({ role, rows: groups.get(role)! });
    }
    return ordered;
  }, [members, searchQuery]);

  // When user is searching, auto-expand matching groups; otherwise all collapsed.
  const expandedValues = useMemo(() => {
    if (!searchQuery.trim()) return [] as string[];
    return groupedByRole.map((g) => g.role);
  }, [searchQuery, groupedByRole]);

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
      toastError(error, "We couldn't complete that. Please try again.");
      return;
    }
    toast.success(t("userAdmin.memberRemoved"));
    qc.invalidateQueries({ queryKey: ["provider-members"] });
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const renderMemberRow = (row: MemberRow) => {
    const isOwner = row.user_id === ownerId;
    const phone = row.phone || row.profile_phone || "";
    const email = row.invited_email || row.profile_email || "";
    const name = row.full_name || row.invited_name || email || "—";
    const isPending = !row.user_id;
    return (
      <div
        key={row.id}
        className="rounded-xl border border-border bg-card p-2.5 flex flex-wrap items-center gap-2 text-xs"
      >
        <div className="flex-1 min-w-[180px]">
          <p className="font-semibold text-foreground">{name}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px]">
            {phone ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <a href={`tel:${phone}`} className="hover:text-primary">{phone}</a>
                <button
                  onClick={() => copy(phone, "Phone")}
                  className="opacity-60 hover:opacity-100"
                  aria-label="Copy phone"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <span className="text-muted-foreground/60">No phone</span>
            )}
            {email ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3 w-3" />
                <a href={`mailto:${email}`} className="hover:text-primary">{email}</a>
                <button
                  onClick={() => copy(email, "Email")}
                  className="opacity-60 hover:opacity-100"
                  aria-label="Copy email"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <span className="text-muted-foreground/60">No email</span>
            )}
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
            isPending
              ? "bg-warning/10 text-warning"
              : "bg-success/10 text-success"
          }`}
        >
          {isPending ? t("administrators.users.pending") : t("administrators.users.active")}
        </span>
        {isCurrentUserAdmin && !isOwner && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => removeMember(row)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t("administrators.header.label")}
        </p>
        <h1 className="text-2xl font-extrabold mt-1 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Admin
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Users, fleet, crew assignments and affiliated hospitals.
        </p>
      </div>

      {!isCurrentUserAdmin && currentTab === "users" && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 text-warning p-2.5 text-xs">
          <p className="font-semibold">{t("administrators.readOnly.label")}</p>
          <p className="mt-0.5">{t("administrators.readOnly.description")}</p>
        </div>
      )}

      <Tabs
        value={currentTab}
        onValueChange={(val) => setSearchParams({ tab: val })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
          <TabsTrigger value="crew" className="text-xs">Crew</TabsTrigger>
          <TabsTrigger value="fleet" className="text-xs">Fleet Admin</TabsTrigger>
          <TabsTrigger value="hospitals" className="text-xs">Hospitals</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {t("administrators.users.title")} ({members.length})
              </h2>
              {isCurrentUserAdmin && (
                <Button
                  size="sm"
                  onClick={() => setAddOpen(true)}
                  className="h-7 text-xs"
                >
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
              ) : groupedByRole.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {searchQuery
                    ? t("administrators.users.noMatch")
                    : t("administrators.users.noUsers")}
                </p>
              ) : (
                <Accordion
                  type="multiple"
                  value={expandedValues}
                  className="space-y-2"
                >
                  {groupedByRole.map(({ role, rows }) => {
                    const activeCount = rows.filter((r) => r.user_id).length;
                    const pendingCount = rows.length - activeCount;
                    return (
                      <AccordionItem
                        key={role}
                        value={role}
                        className="rounded-xl border-2 border-primary/40 bg-background overflow-hidden data-[state=open]:bg-primary/5"
                      >
                        <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                          <div className="flex flex-1 items-center justify-between pr-2">
                            <span className="font-semibold">
                              {ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                            <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="rounded-full bg-muted px-2 py-0.5 font-semibold tabular-nums">
                                {rows.length}
                              </span>
                              {activeCount > 0 && (
                                <span className="text-success">● {activeCount} active</span>
                              )}
                              {pendingCount > 0 && (
                                <span className="text-warning">● {pendingCount} pending</span>
                              )}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-2 pb-2">
                          <div className="space-y-1.5">
                            {rows.map(renderMemberRow)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-3">
          <FleetOperationsScreen />
        </TabsContent>

        <TabsContent value="crew" className="space-y-3">
          <CrewAssignmentsTab providerId={providerId} />
        </TabsContent>

        <TabsContent value="hospitals" className="space-y-3">
          <HospitalNetworkScreen />
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
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
                      {ROLE_LABELS[r] ?? r.charAt(0).toUpperCase() + r.slice(1)}
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
