import { useState, useEffect, useMemo } from "react";
import { Loader2, Pencil, X, Shield, Trash2, Users } from "lucide-react";
import { useAutosave } from "@/features/admin/hooks/useAutosave";
import { AutosaveIndicator } from "@/features/admin/components/AutosaveIndicator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { groupByCountry, sortedCountries, countryFlag } from "@/pages/admin/_shared/grouping";
import { AdminPanel } from "@/pages/admin/_shared/AdminPanel";
import { StatusDot, statusToTone } from "@/pages/admin/_shared/StatusDot";
import { EmptyState } from "@/pages/admin/_shared/EmptyState";
import { RowSkeleton } from "@/pages/admin/_shared/RowSkeleton";
import { Toolbar } from "@/pages/admin/_shared/Toolbar";

type RawRole = "doctor" | "patient" | "admin" | "hospital_staff" | "ambulance_staff" | "blood_bank" | "pharmacy_staff" | "nurse";
type RoleEnum = RawRole | "none";
type UsersKind = "patient" | "doctor" | "admin" | "emergency";

const EMERGENCY_ROLES: RoleEnum[] = ["hospital_staff", "ambulance_staff", "blood_bank", "pharmacy_staff"];

const ROLE_OPTIONS: { value: RawRole; label: string }[] = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "admin", label: "Admin" },
  { value: "ambulance_staff", label: "Ambulance / ER" },
  { value: "hospital_staff", label: "Hospital" },
  { value: "pharmacy_staff", label: "Pharmacy" },
  { value: "blood_bank", label: "Blood bank" },
  { value: "nurse", label: "Nurse" },
];

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

interface UserRecord {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string; // from get_users_admin (joined user_roles row, may be 'none')
  created_at: string;
  status: string;
  holarchelp_enabled?: boolean;
  company?: string | null;
  country?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface EditState {
  first_name: string;
  last_name: string;
  email: string;
}

interface UsersTabProps {
  kind: UsersKind;
}

export default function UsersTab({ kind }: UsersTabProps) {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ first_name: "", last_name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: UserRecord; newRole: RawRole } | null>(null);
  const [roleSaving, setRoleSaving] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, kind]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_users_admin");
    if (error) {
      console.error("get_users_admin failed", error);
      toast({ title: "Failed to load users", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const baseUsers = (data || []) as UserRecord[];
    const ids = baseUsers.map((u) => u.user_id);

    if (ids.length) {
      const [profsRes, doctorPracticeRes, hospitalsRes, hospMembersRes] = await Promise.all([
        supabase.from("profiles").select("id, holarchelp_enabled, specialty, country, mobile_number" as any).in("id", ids),
        supabase.from("practice_members" as any).select("doctor_id, practices(name)").in("doctor_id", ids),
        supabase.from("holarchelp_hospitals" as any).select("owner_id, address, city, country").in("owner_id", ids),
        supabase.from("holarchelp_hospital_members" as any).select("user_id, hospital_id, holarchelp_hospitals(address, city, country)").in("user_id", ids),
      ]);

      const helpMap = new Map<string, boolean>();
      const countryMap = new Map<string, string | null>();
      const phoneMap = new Map<string, string | null>();
      const docCompanyMap = new Map<string, string>();
      const hospitalAddrMap = new Map<string, string>();
      (profsRes.data || []).forEach((p: any) => {
        helpMap.set(p.id, !!p.holarchelp_enabled);
        countryMap.set(p.id, p.country ?? null);
        phoneMap.set(p.id, p.mobile_number ?? null);
        if (p.specialty) docCompanyMap.set(p.id, p.specialty);
      });
      (doctorPracticeRes.data || []).forEach((m: any) => {
        if (m?.practices?.name) docCompanyMap.set(m.doctor_id, m.practices.name);
      });
      const formatAddr = (h: any) => [h?.address, h?.city, h?.country].filter(Boolean).join(", ");
      (hospitalsRes.data || []).forEach((h: any) => {
        const formatted = formatAddr(h);
        if (h.owner_id && formatted && !hospitalAddrMap.has(h.owner_id)) hospitalAddrMap.set(h.owner_id, formatted);
      });
      (hospMembersRes.data || []).forEach((m: any) => {
        const formatted = formatAddr(m?.holarchelp_hospitals);
        if (m.user_id && formatted && !hospitalAddrMap.has(m.user_id)) hospitalAddrMap.set(m.user_id, formatted);
      });

      const merged = baseUsers.map((u) => ({
        ...u,
        holarchelp_enabled: helpMap.get(u.user_id) || false,
        country: countryMap.get(u.user_id) ?? null,
        phone: phoneMap.get(u.user_id) ?? null,
        company: u.role === "doctor" ? docCompanyMap.get(u.user_id) || null : null,
        address: u.role === "hospital_staff" ? hospitalAddrMap.get(u.user_id) || null : null,
      }));

      // Dedupe by user_id, preferring highest-priority role
      const priority = (r: string) =>
        ({ admin: 6, ambulance_staff: 5, hospital_staff: 5, pharmacy_staff: 5, blood_bank: 5, nurse: 4, doctor: 3, patient: 2, none: 1 } as any)[r] ?? 0;
      const byId = new Map<string, UserRecord>();
      for (const u of merged) {
        const existing = byId.get(u.user_id);
        if (!existing || priority(u.role) > priority(existing.role)) byId.set(u.user_id, u);
      }
      setUsers(Array.from(byId.values()));
    } else {
      setUsers(baseUsers);
    }
    setLoading(false);
  };

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list: UserRecord[];
    if (kind === "patient") {
      list = users.filter((u) => (u.role === "patient" || u.role === "none") && !EMERGENCY_ROLES.includes(u.role as RoleEnum));
    } else if (kind === "doctor") {
      list = users.filter((u) => u.role === "doctor");
    } else if (kind === "admin") {
      list = users.filter((u) => u.role === "admin");
    } else {
      list = users.filter((u) => EMERGENCY_ROLES.includes(u.role as RoleEnum));
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((u) =>
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q),
    );
  }, [users, kind, search]);

  const grouped = useMemo(() => {
    if (kind === "emergency") {
      // Group by provider kind instead of country
      const out: Record<string, UserRecord[]> = {};
      for (const u of filtered) {
        const label = ROLE_LABEL[u.role] || "Other";
        (out[label] ||= []).push(u);
      }
      return out;
    }
    return groupByCountry(filtered, (u) => u.country);
  }, [filtered, kind]);
  const groups = useMemo(() => {
    if (kind === "emergency") return Object.keys(grouped).sort();
    return sortedCountries(grouped);
  }, [grouped, kind]);

  const toggleHolarcHelp = async (userId: string, current: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ holarchelp_enabled: !current } as any)
      .eq("id", userId);
    if (error) {
      toast({ title: "Failed to toggle HolarcHelp", description: error.message, variant: "destructive" });
      return;
    }
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, holarchelp_enabled: !current } : u)));
    toast({ title: !current ? "HolarcHelp enabled" : "HolarcHelp disabled" });
  };

  const splitName = (fullName: string | null) => {
    const name = fullName || "";
    const idx = name.indexOf(" ");
    return { first: idx > -1 ? name.slice(0, idx) : name, last: idx > -1 ? name.slice(idx + 1) : "" };
  };

  const startEditing = (user: UserRecord) => {
    const { first, last } = splitName(user.full_name);
    setEditingId(user.user_id);
    setEditState({ first_name: first, last_name: last, email: user.email });
  };

  const cancelEditing = () => setEditingId(null);

  const saveEdit = async (userId: string, next: EditState, original: UserRecord) => {
    const combinedName = `${next.first_name} ${next.last_name}`.trim();
    if (combinedName !== (original.full_name || "")) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: combinedName })
        .eq("id", userId);
      if (profileError) throw profileError;
    }

    if (next.email && next.email !== original.email && /.+@.+\..+/.test(next.email)) {
      const { data, error: emailError } = await supabase.functions.invoke("admin-update-email", {
        body: { userId, newEmail: next.email },
      });
      if (emailError) throw emailError;
      if (data?.error) throw new Error(data.error);
    }

    setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, full_name: combinedName, email: next.email } : u));
  };

  const editingUser = useMemo(() => users.find((u) => u.user_id === editingId) || null, [users, editingId]);
  const autosave = useAutosave(
    editState,
    async (val) => {
      if (!editingId || !editingUser) return;
      await saveEdit(editingId, val, editingUser);
    },
    { enabled: !!editingId, delay: 600 },
  );

  const deleteUser = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: pendingDelete.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setUsers((prev) => prev.filter((u) => u.user_id !== pendingDelete.user_id));
      toast({ title: "User deleted" });
      setPendingDelete(null);
    } catch (e: any) {
      toast({ title: "Failed to delete user", description: e.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleRoleSelect = (user: UserRecord, newRole: RawRole) => {
    if (newRole === user.role) return;
    if (newRole === "admin" || user.role === "admin") {
      setPendingRoleChange({ user, newRole });
      return;
    }
    void applyRoleChange(user, newRole);
  };

  const applyRoleChange = async (user: UserRecord, newRole: RawRole) => {
    setRoleSaving(user.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-set-user-role", {
        body: { userId: user.user_id, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Role updated", description: `${user.email} → ${ROLE_LABEL[newRole]}` });
      setPendingRoleChange(null);
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Failed to change role", description: e.message, variant: "destructive" });
    } finally {
      setRoleSaving(null);
    }
  };

  const showCompany = kind === "doctor";
  const noun =
    kind === "doctor" ? "healthcare providers" :
    kind === "admin" ? "administrators" :
    kind === "emergency" ? "emergency providers" : "patients";

  const renderRows = (rows: UserRecord[]) => (
    <div className="admin-table-wrap">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-0">
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Email</TableHead>
            {showCompany && <TableHead>Practice</TableHead>}
            <TableHead>Role</TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3" />HolarcHelp</span>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[88px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u) => {
            const { first, last } = splitName(u.full_name);
            const isEditing = editingId === u.user_id;
            const currentRole = u.role === "none" ? "patient" : (u.role as RawRole);
            return (
              <TableRow key={u.user_id} className={isEditing ? "bg-[hsl(var(--admin-accent-soft))]" : ""}>
                <TableCell>
                  {isEditing ? (
                    <Input value={editState.first_name} onChange={(e) => setEditState((s) => ({ ...s, first_name: e.target.value }))} className="h-7 w-32 text-[12.5px]" />
                  ) : (
                    <span className="font-medium text-[hsl(var(--admin-text-primary))]">{first || "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input value={editState.last_name} onChange={(e) => setEditState((s) => ({ ...s, last_name: e.target.value }))} className="h-7 w-32 text-[12.5px]" />
                  ) : (
                    <span>{last || "—"}</span>
                  )}
                </TableCell>
                <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                  {isEditing ? (
                    <Input value={editState.email} onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))} className="h-7 w-52 text-[12.5px]" />
                  ) : (
                    u.email
                  )}
                </TableCell>
                {showCompany && (
                  <TableCell>{u.company || "—"}</TableCell>
                )}
                <TableCell>
                  <Select
                    value={currentRole}
                    onValueChange={(v) => handleRoleSelect(u, v as RawRole)}
                    disabled={roleSaving === u.user_id}
                  >
                    <SelectTrigger className="h-7 w-[140px] text-[11.5px]">
                      {roleSaving === u.user_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value} className="text-[12px]">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={!!u.holarchelp_enabled}
                    onCheckedChange={() => toggleHolarcHelp(u.user_id, !!u.holarchelp_enabled)}
                    aria-label="Toggle HolarcHelp module"
                    className="scale-90"
                  />
                </TableCell>
                <TableCell><StatusDot tone={statusToTone(u.status)} /></TableCell>
                <TableCell className="text-[hsl(var(--admin-text-tertiary))]">{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <div className="flex justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveUser(u.user_id)} disabled={saving}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing} disabled={saving}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--admin-text-tertiary))] hover:text-[hsl(var(--admin-text-primary))]" onClick={() => startEditing(u)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--admin-text-tertiary))] hover:text-destructive" onClick={() => setPendingDelete(u)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <AdminPanel
        title={`${filtered.length} ${noun}`}
        description={kind === "emergency" ? "Grouped by provider type. Expand to manage." : "Grouped by country. Expand to view, edit, or remove."}
        bodyClassName="p-0"
        actions={
          <Toolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={`Search ${noun}…`}
          />
        }
      >
        {loading ? (
          <RowSkeleton rows={6} cols={showCompany ? 9 : 8} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={`No ${noun} ${search ? "match your search" : "yet"}`}
            description={search ? "Try a different name or email." : undefined}
          />
        ) : (
          <Accordion type="multiple" className="divide-y divide-[hsl(var(--admin-border-subtle))]">
            {groups.map((group) => {
              const rows = grouped[group];
              return (
                <AccordionItem
                  key={group}
                  value={group}
                  className="border-0"
                >
                  <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-[hsl(var(--admin-accent-soft))]">
                    <div className="flex items-center gap-2.5">
                      {kind !== "emergency" && (
                        <span className="text-[14px] leading-none">{countryFlag(group)}</span>
                      )}
                      <span className="text-[12.5px] font-semibold text-[hsl(var(--admin-text-primary))]">{group}</span>
                      <span className="text-[11px] text-[hsl(var(--admin-text-tertiary))]">{rows.length}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-0 border-t border-[hsl(var(--admin-border-subtle))]">
                    {renderRows(rows)}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </AdminPanel>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !deleting && !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <strong>{pendingDelete?.email}</strong>'s account and profile. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingRoleChange} onOpenChange={(o) => !roleSaving && !o && setPendingRoleChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role?</AlertDialogTitle>
            <AlertDialogDescription>
              Change <strong>{pendingRoleChange?.user.email}</strong> from <strong>{ROLE_LABEL[pendingRoleChange?.user.role || ""] || pendingRoleChange?.user.role}</strong> to <strong>{ROLE_LABEL[pendingRoleChange?.newRole || ""]}</strong>? This grants or revokes admin-level access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!roleSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingRoleChange && applyRoleChange(pendingRoleChange.user, pendingRoleChange.newRole)}
              disabled={!!roleSaving}
            >
              {roleSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
