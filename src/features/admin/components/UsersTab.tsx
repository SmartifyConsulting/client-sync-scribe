import { useState, useEffect, useMemo } from "react";
import { Loader2, Pencil, X, Shield, Trash2, Users, KeyRound, Copy, Check, FileSearch } from "lucide-react";
import { PendingProviderReviewDialog } from "@/features/admin/components/PendingProviderReviewDialog";
import { Badge } from "@/components/ui/badge";
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
import { CreateTestUserDialog } from "@/features/admin/components/CreateTestUserDialog";

type RawRole = "doctor" | "patient" | "admin" | "hospital_staff" | "ambulance_staff" | "blood_bank" | "pharmacy_staff" | "nurse";
type RoleEnum = RawRole | "none";
type UsersKind = "patient" | "doctor" | "admin" | "emergency";

const EMERGENCY_ROLES: RoleEnum[] = ["hospital_staff", "ambulance_staff", "blood_bank", "pharmacy_staff"];

const ROLE_OPTIONS: { value: RawRole; label: string }[] = [
  { value: "patient", label: "Patient" },
  { value: "doctor", label: "Doctor" },
  { value: "admin", label: "Admin" },
  { value: "ambulance_staff", label: "Emergency Response / ER" },
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
  const [pendingMfaReset, setPendingMfaReset] = useState<UserRecord | null>(null);
  const [mfaResetting, setMfaResetting] = useState(false);
  const [mfaResetResult, setMfaResetResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copiedTemp, setCopiedTemp] = useState(false);
  const [pendingStatusMap, setPendingStatusMap] = useState<Map<string, string>>(new Map());
  const [reviewUserId, setReviewUserId] = useState<string | null>(null);



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
      const [profsRes, doctorPracticeRes, hospitalsRes, hospMembersRes, ambProvRes] = await Promise.all([
        supabase.from("profiles").select("id, holarchelp_enabled, specialty, country, mobile_number" as any).in("id", ids),
        supabase.from("practice_members" as any).select("doctor_id, practices(name)").in("doctor_id", ids),
        supabase.from("holarchelp_hospitals" as any).select("owner_id, address, city, country, status").in("owner_id", ids),
        supabase.from("holarchelp_hospital_members" as any).select("user_id, hospital_id, holarchelp_hospitals(address, city, country)").in("user_id", ids),
        supabase.from("holarchelp_ambulance_providers" as any).select("owner_id, status").in("owner_id", ids),
      ]);

      const statusMap = new Map<string, string>();
      (hospitalsRes.data || []).forEach((h: any) => { if (h.owner_id && h.status) statusMap.set(h.owner_id, h.status); });
      (ambProvRes.data || []).forEach((a: any) => { if (a.owner_id && a.status) statusMap.set(a.owner_id, a.status); });
      setPendingStatusMap(statusMap);


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
      toast({ title: "Role updated", description: `${user.email} â†’ ${ROLE_LABEL[newRole]}` });
      setPendingRoleChange(null);
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Failed to change role", description: e.message, variant: "destructive" });
    } finally {
      setRoleSaving(null);
    }
  };

  const resetUserAccess = async () => {
    if (!pendingMfaReset) return;
    setMfaResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-mfa", {
        body: { user_id: pendingMfaReset.user_id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Reset failed");
      setMfaResetResult({ email: pendingMfaReset.email, tempPassword: data.temp_password });
      setPendingMfaReset(null);
      toast({ title: "Access reset", description: `Share the temporary password with ${pendingMfaReset.email} securely.` });
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message, variant: "destructive" });
    } finally {
      setMfaResetting(false);
    }
  };

  const copyTempPassword = async () => {
    if (!mfaResetResult) return;
    try {
      await navigator.clipboard.writeText(mfaResetResult.tempPassword);
      setCopiedTemp(true);
      setTimeout(() => setCopiedTemp(false), 1800);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };


  const showCompany = kind === "doctor";
  const showAddress = kind === "emergency";
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
            <TableHead>Phone</TableHead>
            {showAddress && <TableHead>Address</TableHead>}
            {showCompany && <TableHead>Practice</TableHead>}
            <TableHead>Role</TableHead>
            <TableHead>
              <span className="inline-flex items-center gap-1.5"><Shield className="h-3 w-3" />HolarcHelp</span>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[110px] text-right">Actions</TableHead>
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
                    <span className="font-medium text-[hsl(var(--admin-text-primary))]">{first || "â€”"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input value={editState.last_name} onChange={(e) => setEditState((s) => ({ ...s, last_name: e.target.value }))} className="h-7 w-32 text-[12.5px]" />
                  ) : (
                    <span>{last || "â€”"}</span>
                  )}
                </TableCell>
                <TableCell className="text-[hsl(var(--admin-text-secondary))]">
                  {isEditing ? (
                    <Input value={editState.email} onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))} className="h-7 w-52 text-[12.5px]" />
                  ) : (
                    u.email
                  )}
                </TableCell>
                <TableCell className="text-[hsl(var(--admin-text-secondary))] text-sm tabular-nums">{u.phone || "â€”"}</TableCell>
                {showAddress && (
                  <TableCell className="text-[hsl(var(--admin-text-secondary))] text-sm max-w-[260px] truncate" title={u.address || ""}>
                    {u.address || "â€”"}
                  </TableCell>
                )}
                {showCompany && (
                  <TableCell>{u.company || "â€”"}</TableCell>
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
                        <SelectItem key={r.value} value={r.value} className="text-sm">{r.label}</SelectItem>
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
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusDot tone={statusToTone(u.status)} />
                    {pendingStatusMap.get(u.user_id) === "pending" && (
                      <Badge variant="outline" className="text-sm px-1.5 py-0 border-amber-400 text-amber-700 dark:text-amber-300">Pending approval</Badge>
                    )}
                    {pendingStatusMap.get(u.user_id) === "rejected" && (
                      <Badge variant="outline" className="text-sm px-1.5 py-0 border-destructive text-destructive">Rejected</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-[hsl(var(--admin-text-tertiary))]">{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell className="text-right">
                  {isEditing ? (
                    <div className="flex justify-end items-center gap-1.5">
                      <AutosaveIndicator status={autosave.status} error={autosave.error} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing} title="Close">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-0.5">
                      {pendingStatusMap.has(u.user_id) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600 hover:text-amber-700" onClick={() => setReviewUserId(u.user_id)} title="Review submission">
                          <FileSearch className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--admin-text-tertiary))] hover:text-[hsl(var(--admin-text-primary))]" onClick={() => startEditing(u)} title="Edit user">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--admin-text-tertiary))] hover:text-primary" onClick={() => setPendingMfaReset(u)} title="Reset access (clear authenticator + set temporary password)">
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[hsl(var(--admin-text-tertiary))] hover:text-destructive" onClick={() => setPendingDelete(u)} title="Delete user">
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
          <div className="flex items-center gap-2">
            <Toolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={`Search ${noun}â€¦`}
            />
            <CreateTestUserDialog onCreated={fetchUsers} />
          </div>
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
                      <span className="text-sm text-[hsl(var(--admin-text-tertiary))]">{rows.length}</span>
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

      <AlertDialog open={!!pendingMfaReset} onOpenChange={(o) => !mfaResetting && !o && setPendingMfaReset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset access for {pendingMfaReset?.email}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>This will:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Unenrol the user's authenticator app</li>
                  <li>Wipe their backup codes</li>
                  <li>Set a temporary password that you'll share with them</li>
                </ol>
                <p>
                  They'll set a new password and enrol a new authenticator at next sign-in.
                  <strong> Only do this after verifying their identity</strong> (ID document,
                  video call, or known clinical details).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mfaResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resetUserAccess} disabled={mfaResetting}>
              {mfaResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!mfaResetResult} onOpenChange={(o) => !o && setMfaResetResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temporary password generated</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  Share this with <strong>{mfaResetResult?.email}</strong> through a secure
                  channel (in person, encrypted message). They must sign in with it and choose
                  a new password.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-3 py-2 rounded font-mono text-base select-all">
                    {mfaResetResult?.tempPassword}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyTempPassword} title="Copy">
                    {copiedTemp ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  This password won't be shown again. Their authenticator and backup codes have
                  been cleared â€” they'll be prompted to set up a new authenticator after they
                  sign in.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setMfaResetResult(null)}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PendingProviderReviewDialog
        open={!!reviewUserId}
        ownerUserId={reviewUserId}
        onClose={() => setReviewUserId(null)}
        onActioned={fetchUsers}
      />
    </>

  );
}

