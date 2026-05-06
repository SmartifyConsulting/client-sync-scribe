import { useState, useEffect, useMemo } from "react";
import { Loader2, Pencil, Save, X, Shield, Hospital, Ambulance, Droplet, Users, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteUserDialog } from "@/components/InviteUserDialog";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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

type RoleEnum = "doctor" | "patient" | "admin" | "hospital_staff" | "ambulance_staff" | "blood_bank" | "pharmacy_staff" | "none";
type Category = "patient" | "provider" | "emergency" | "admin" | "none";
type EmergencyKind = "hospital_staff" | "ambulance_staff" | "blood_bank";

const EMERGENCY_ROLES: RoleEnum[] = ["hospital_staff", "ambulance_staff", "blood_bank", "pharmacy_staff"];

const roleToCategory = (role: string): Category => {
  if (role === "patient") return "patient";
  if (role === "doctor") return "provider";
  if (role === "admin") return "admin";
  if (EMERGENCY_ROLES.includes(role as RoleEnum)) return "emergency";
  return "none";
};

const emergencyIcon = (k: string) => {
  if (k === "hospital_staff") return { Icon: Hospital, label: "Hospital" };
  if (k === "ambulance_staff") return { Icon: Ambulance, label: "Ambulance" };
  if (k === "blood_bank") return { Icon: Droplet, label: "Blood Bank" };
  return null;
};

interface UserRecord {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  status: string;
  holarchelp_enabled?: boolean;
  company?: string | null;
}

interface EditState {
  first_name: string;
  last_name: string;
  email: string;
  category: Category;
  emergency_kind: EmergencyKind;
}

export default function UsersTab() {
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({
    first_name: "", last_name: "", email: "", category: "none", emergency_kind: "hospital_staff",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

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
    const ids = baseUsers.map(u => u.user_id);

    if (ids.length) {
      const [profsRes, hospRes, ambRes, bloodRes, doctorPracticeRes] = await Promise.all([
        supabase.from("profiles").select("id, holarchelp_enabled, specialty, practice_address" as any).in("id", ids),
        supabase.from("holarchelp_hospitals").select("owner_id, name").in("owner_id", ids),
        supabase.from("holarchelp_ambulance_providers").select("owner_id, company_name").in("owner_id", ids),
        supabase.from("blood_bank_providers" as any).select("owner_id, name").in("owner_id", ids),
        supabase.from("practice_members" as any).select("doctor_id, practice_id, practices(name)").in("doctor_id", ids),
      ]);

      const helpMap = new Map<string, boolean>();
      const docCompanyMap = new Map<string, string>();
      (profsRes.data || []).forEach((p: any) => {
        helpMap.set(p.id, !!p.holarchelp_enabled);
        if (p.specialty) docCompanyMap.set(p.id, p.specialty);
      });
      (doctorPracticeRes.data || []).forEach((m: any) => {
        if (m?.practices?.name) docCompanyMap.set(m.doctor_id, m.practices.name);
      });

      const companyMap = new Map<string, string>();
      (hospRes.data || []).forEach((h: any) => companyMap.set(h.owner_id, h.name));
      (ambRes.data || []).forEach((a: any) => companyMap.set(a.owner_id, a.company_name));
      (bloodRes.data || []).forEach((b: any) => companyMap.set(b.owner_id, b.name));

      const merged = baseUsers.map(u => ({
        ...u,
        holarchelp_enabled: helpMap.get(u.user_id) || false,
        company: companyMap.get(u.user_id) || (u.role === "doctor" ? docCompanyMap.get(u.user_id) || null : null),
      }));
      // Emergency provider accounts live on the Providers tab
      setUsers(merged.filter(u => !EMERGENCY_ROLES.includes(u.role as RoleEnum)));
    } else {
      setUsers(baseUsers);
    }
    setLoading(false);
  };

  const toggleHolarcHelp = async (userId: string, current: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ holarchelp_enabled: !current } as any)
      .eq("id", userId);
    if (error) {
      toast({ title: "Failed to toggle HolarcHelp", description: error.message, variant: "destructive" });
      return;
    }
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, holarchelp_enabled: !current } : u));
    toast({ title: !current ? "HolarcHelp enabled" : "HolarcHelp disabled" });
  };

  const splitName = (fullName: string | null) => {
    const name = fullName || "";
    const idx = name.indexOf(" ");
    return { first: idx > -1 ? name.slice(0, idx) : name, last: idx > -1 ? name.slice(idx + 1) : "" };
  };

  const startEditing = (user: UserRecord) => {
    const { first, last } = splitName(user.full_name);
    const cat = roleToCategory(user.role);
    setEditingId(user.user_id);
    setEditState({
      first_name: first,
      last_name: last,
      email: user.email,
      category: cat,
      emergency_kind: cat === "emergency" ? (user.role as EmergencyKind) : "hospital_staff",
    });
  };

  const cancelEditing = () => setEditingId(null);

  const resolveTargetRole = (s: EditState): RoleEnum => {
    switch (s.category) {
      case "patient": return "patient";
      case "provider": return "doctor";
      case "admin": return "admin";
      case "emergency": return s.emergency_kind;
      default: return "none";
    }
  };

  const saveUser = async (userId: string) => {
    setSaving(true);
    try {
      const combinedName = `${editState.first_name} ${editState.last_name}`.trim();
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: combinedName })
        .eq("id", userId);
      if (profileError) throw profileError;

      const currentUser = users.find(u => u.user_id === userId);
      if (currentUser && currentUser.email !== editState.email) {
        const { data, error: emailError } = await supabase.functions.invoke('admin-update-email', {
          body: { userId, newEmail: editState.email },
        });
        if (emailError) throw emailError;
        if (data?.error) throw new Error(data.error);
      }

      const targetRole = resolveTargetRole(editState);
      if (currentUser && currentUser.role !== targetRole) {
        if (currentUser.role !== "none") {
          const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
          if (delErr) throw delErr;
        }
        if (targetRole !== "none") {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: targetRole as any });
          if (roleError) throw roleError;
        }
      }

      toast({ title: "User updated", description: "Changes saved successfully." });
      setEditingId(null);
      fetchUsers();
    } catch (error: any) {
      console.error("saveUser failed", error);
      toast({ title: "Error saving", description: error.message || "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const categoryBadge = (role: string) => {
    const cat = roleToCategory(role);
    switch (cat) {
      case "admin": return <Badge variant="destructive" className="text-sm">Admin</Badge>;
      case "provider": return <Badge className="bg-blue-600 text-white hover:bg-blue-700 text-sm">Healthcare Provider</Badge>;
      case "patient": return <Badge className="bg-teal-600 text-white hover:bg-teal-700 text-sm">Patient</Badge>;
      case "emergency": {
        const ei = emergencyIcon(role);
        if (!ei) return <Badge variant="outline" className="text-sm">None</Badge>;
        const { Icon, label } = ei;
        return (
          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit p-1.5" title={label} aria-label={label}>
            <Icon className="h-4 w-4" />
          </Badge>
        );
      }
      default: return <Badge variant="outline" className="text-sm">None</Badge>;
    }
  };

  const statusBadge = (status: string) =>
    status === "pending"
      ? <Badge variant="outline" className="border-amber-500 text-amber-600 text-sm">Pending</Badge>
      : <Badge variant="outline" className="border-green-500 text-green-600 text-sm">Active</Badge>;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const patients = useMemo(
    () => users.filter(u => u.role === "patient" || u.role === "admin" || u.role === "none"),
    [users],
  );
  const providers = useMemo(() => users.filter(u => u.role === "doctor"), [users]);

  const renderTable = (rows: UserRecord[]) => (
    <div className="rounded-lg border border-primary bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Company / Practice</TableHead>
            <TableHead><span className="inline-flex items-center gap-1.5"><Shield className="h-4 w-4" />HolarcHelp</span></TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u) => {
            const { first, last } = splitName(u.full_name);
            const isEditing = editingId === u.user_id;
            return (
              <TableRow key={u.user_id}>
                <TableCell>
                  {isEditing ? (
                    <Input value={editState.first_name} onChange={(e) => setEditState(s => ({ ...s, first_name: e.target.value }))} className="h-8 w-32" />
                  ) : (
                    <span className="font-medium">{first || "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input value={editState.last_name} onChange={(e) => setEditState(s => ({ ...s, last_name: e.target.value }))} className="h-8 w-32" />
                  ) : (
                    <span>{last || "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <Input value={editState.email} onChange={(e) => setEditState(s => ({ ...s, email: e.target.value }))} className="h-8 w-48" />
                  ) : (
                    u.email
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex flex-col gap-1">
                      <Select value={editState.category} onValueChange={(v) => setEditState(s => ({ ...s, category: v as Category }))}>
                        <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="provider">Healthcare Provider</SelectItem>
                          <SelectItem value="emergency">Emergency Service</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                      {editState.category === "emergency" && (
                        <Select value={editState.emergency_kind} onValueChange={(v) => setEditState(s => ({ ...s, emergency_kind: v as EmergencyKind }))}>
                          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hospital_staff">Hospital</SelectItem>
                            <SelectItem value="ambulance_staff">Ambulance</SelectItem>
                            <SelectItem value="blood_bank">Blood Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : (
                    categoryBadge(u.role)
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{u.company || "—"}</span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={!!u.holarchelp_enabled}
                    onCheckedChange={() => toggleHolarcHelp(u.user_id, !!u.holarchelp_enabled)}
                    aria-label="Toggle HolarcHelp module"
                  />
                </TableCell>
                <TableCell>{statusBadge(u.status)}</TableCell>
                <TableCell>{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => saveUser(u.user_id)} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEditing} disabled={saving}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => startEditing(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No users found</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <InviteUserDialog />
      </div>

      <Tabs defaultValue="patients">
        <TabsList className="bg-primary">
          <TabsTrigger value="patients" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white gap-1.5">
            <Users className="h-4 w-4" />Patients
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{patients.length}</span>
          </TabsTrigger>
          <TabsTrigger value="providers" className="data-[state=active]:bg-white data-[state=active]:text-foreground text-white gap-1.5">
            <Stethoscope className="h-4 w-4" />Healthcare Providers
            <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{providers.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="patients" className="mt-4">{renderTable(patients)}</TabsContent>
        <TabsContent value="providers" className="mt-4">{renderTable(providers)}</TabsContent>
      </Tabs>
    </div>
  );
}
