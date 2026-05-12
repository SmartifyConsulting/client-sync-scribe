import { useState, useEffect, useMemo } from "react";
import { Loader2, Pencil, Save, X, Shield, Trash2 } from "lucide-react";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { groupByCountry, sortedCountries, countryFlag } from "@/pages/admin/_shared/grouping";

type RoleEnum = "doctor" | "patient" | "admin" | "hospital_staff" | "ambulance_staff" | "blood_bank" | "pharmacy_staff" | "none";
type UsersKind = "patient" | "doctor" | "admin";

const EMERGENCY_ROLES: RoleEnum[] = ["hospital_staff", "ambulance_staff", "blood_bank", "pharmacy_staff"];

interface UserRecord {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  status: string;
  holarchelp_enabled?: boolean;
  company?: string | null;
  country?: string | null;
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
      const [profsRes, doctorPracticeRes] = await Promise.all([
        supabase.from("profiles").select("id, holarchelp_enabled, specialty, country" as any).in("id", ids),
        supabase.from("practice_members" as any).select("doctor_id, practices(name)").in("doctor_id", ids),
      ]);

      const helpMap = new Map<string, boolean>();
      const countryMap = new Map<string, string | null>();
      const docCompanyMap = new Map<string, string>();
      (profsRes.data || []).forEach((p: any) => {
        helpMap.set(p.id, !!p.holarchelp_enabled);
        countryMap.set(p.id, p.country ?? null);
        if (p.specialty) docCompanyMap.set(p.id, p.specialty);
      });
      (doctorPracticeRes.data || []).forEach((m: any) => {
        if (m?.practices?.name) docCompanyMap.set(m.doctor_id, m.practices.name);
      });

      const merged = baseUsers.map((u) => ({
        ...u,
        holarchelp_enabled: helpMap.get(u.user_id) || false,
        country: countryMap.get(u.user_id) ?? null,
        company: u.role === "doctor" ? docCompanyMap.get(u.user_id) || null : null,
      }));

      // Dedupe by user_id, preferring highest-priority role
      const priority = (r: string) => ({ admin: 4, doctor: 3, patient: 2, none: 1 } as any)[r] ?? 0;
      const byId = new Map<string, UserRecord>();
      for (const u of merged) {
        const existing = byId.get(u.user_id);
        if (!existing || priority(u.role) > priority(existing.role)) byId.set(u.user_id, u);
      }
      const deduped = Array.from(byId.values()).filter(
        (u) => !EMERGENCY_ROLES.includes(u.role as RoleEnum),
      );
      setUsers(deduped);
    } else {
      setUsers(baseUsers);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (kind === "patient") {
      // Patients sub-tab: people who are patients, plus accounts with no role yet
      return users.filter((u) => u.role === "patient" || u.role === "none");
    }
    if (kind === "doctor") return users.filter((u) => u.role === "doctor");
    return users.filter((u) => u.role === "admin");
  }, [users, kind]);

  const grouped = useMemo(() => groupByCountry(filtered, (u) => u.country), [filtered]);
  const countries = useMemo(() => sortedCountries(grouped), [grouped]);

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

  const saveUser = async (userId: string) => {
    setSaving(true);
    try {
      const combinedName = `${editState.first_name} ${editState.last_name}`.trim();
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: combinedName })
        .eq("id", userId);
      if (profileError) throw profileError;

      const currentUser = users.find((u) => u.user_id === userId);
      if (currentUser && currentUser.email !== editState.email) {
        const { data, error: emailError } = await supabase.functions.invoke("admin-update-email", {
          body: { userId, newEmail: editState.email },
        });
        if (emailError) throw emailError;
        if (data?.error) throw new Error(data.error);
      }

      toast({ title: "User updated" });
      setEditingId(null);
      fetchUsers();
    } catch (error: any) {
      console.error("saveUser failed", error);
      toast({ title: "Error saving", description: error.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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

  const statusDot = (status: string) => {
    const map: Record<string, { color: string; label: string }> = {
      pending: { color: "bg-amber-500", label: "Pending" },
      suspended: { color: "bg-slate-400", label: "Suspended" },
      active: { color: "bg-emerald-500", label: "Active" },
    };
    const s = map[status] ?? map.active;
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground">
        <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
        {s.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-card p-10 text-center text-sm text-muted-foreground">
        No {kind === "doctor" ? "healthcare providers" : kind === "admin" ? "administrators" : "patients"} yet.
      </div>
    );
  }

  const showCompany = kind === "doctor";

  const renderRows = (rows: UserRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9 text-[11px] uppercase tracking-wide">First Name</TableHead>
          <TableHead className="h-9 text-[11px] uppercase tracking-wide">Last Name</TableHead>
          <TableHead className="h-9 text-[11px] uppercase tracking-wide">Email</TableHead>
          {showCompany && (
            <TableHead className="h-9 text-[11px] uppercase tracking-wide">Practice</TableHead>
          )}
          <TableHead className="h-9 text-[11px] uppercase tracking-wide">
            <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />HolarcHelp</span>
          </TableHead>
          <TableHead className="h-9 text-[11px] uppercase tracking-wide">Status</TableHead>
          <TableHead className="h-9 text-[11px] uppercase tracking-wide">Joined</TableHead>
          <TableHead className="h-9 w-[96px] text-right text-[11px] uppercase tracking-wide">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-border/50">
        {rows.map((u) => {
          const { first, last } = splitName(u.full_name);
          const isEditing = editingId === u.user_id;
          return (
            <TableRow key={u.user_id} className="hover:bg-muted/40">
              <TableCell className="py-2 text-[12px]">
                {isEditing ? (
                  <Input value={editState.first_name} onChange={(e) => setEditState((s) => ({ ...s, first_name: e.target.value }))} className="h-8 w-32" />
                ) : (
                  <span className="font-medium">{first || "—"}</span>
                )}
              </TableCell>
              <TableCell className="py-2 text-[12px]">
                {isEditing ? (
                  <Input value={editState.last_name} onChange={(e) => setEditState((s) => ({ ...s, last_name: e.target.value }))} className="h-8 w-32" />
                ) : (
                  <span>{last || "—"}</span>
                )}
              </TableCell>
              <TableCell className="py-2 text-[12px] text-muted-foreground">
                {isEditing ? (
                  <Input value={editState.email} onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))} className="h-8 w-48" />
                ) : (
                  u.email
                )}
              </TableCell>
              {showCompany && (
                <TableCell className="py-2 text-[12px]">{u.company || "—"}</TableCell>
              )}
              <TableCell className="py-2">
                <Switch
                  checked={!!u.holarchelp_enabled}
                  onCheckedChange={() => toggleHolarcHelp(u.user_id, !!u.holarchelp_enabled)}
                  aria-label="Toggle HolarcHelp module"
                />
              </TableCell>
              <TableCell className="py-2">{statusDot(u.status)}</TableCell>
              <TableCell className="py-2 text-[12px] text-muted-foreground">{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
              <TableCell className="py-2 text-right">
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
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => startEditing(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setPendingDelete(u)}>
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
  );

  return (
    <>
      <Accordion type="multiple" defaultValue={countries.slice(0, 2)} className="space-y-2">
        {countries.map((country) => {
          const rows = grouped[country];
          return (
            <AccordionItem
              key={country}
              value={country}
              className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <AccordionTrigger className="px-4 py-2.5 hover:no-underline hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <span className="text-base">{countryFlag(country)}</span>
                  <span className="text-[13px] font-semibold">{country}</span>
                  <span className="text-[11px] text-muted-foreground">{rows.length} {rows.length === 1 ? "user" : "users"}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t border-border/50">
                <div className="overflow-x-auto">{renderRows(rows)}</div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

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
    </>
  );
}
