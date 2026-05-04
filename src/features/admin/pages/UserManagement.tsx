import { useState, useEffect } from "react";
import { Loader2, ShieldAlert, Users, Pencil, Save, X, Shield } from "lucide-react";
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

interface UserRecord {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  status: string;
  holarchelp_enabled?: boolean;
}

interface EditState {
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export default function UserManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ first_name: "", last_name: "", email: "", role: "" });
  const [saving, setSaving] = useState(false);
  

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_users_admin");
    if (!error && data) {
      const baseUsers = data as UserRecord[];
      const ids = baseUsers.map(u => u.user_id);
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, holarchelp_enabled" as any)
          .in("id", ids);
        const map = new Map((profs || []).map((p: any) => [p.id, !!p.holarchelp_enabled]));
        setUsers(baseUsers.map(u => ({ ...u, holarchelp_enabled: map.get(u.user_id) || false })));
      } else {
        setUsers(baseUsers);
      }
    }
    setLoading(false);
  };

  const toggleGuardian = async (userId: string, current: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ holarchelp_enabled: !current } as any)
      .eq("id", userId);
    if (error) {
      toast({ title: "Failed to toggle Guardian", description: error.message, variant: "destructive" });
      return;
    }
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, holarchelp_enabled: !current } : u));
    toast({ title: !current ? "Guardian enabled" : "Guardian disabled" });
  };

  const splitName = (fullName: string | null) => {
    const name = fullName || "";
    const idx = name.indexOf(" ");
    return { first: idx > -1 ? name.slice(0, idx) : name, last: idx > -1 ? name.slice(idx + 1) : "" };
  };

  const startEditing = (user: UserRecord) => {
    const { first, last } = splitName(user.full_name);
    setEditingId(user.user_id);
    setEditState({ first_name: first, last_name: last, email: user.email, role: user.role });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({ first_name: "", last_name: "", email: "", role: "" });
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

      // Update email if changed
      const currentUser = users.find(u => u.user_id === userId);
      if (currentUser && currentUser.email !== editState.email) {
        const { data, error: emailError } = await supabase.functions.invoke('admin-update-email', {
          body: { userId, newEmail: editState.email },
        });
        if (emailError) throw emailError;
        if (data?.error) throw new Error(data.error);
      }

      // Update role if changed
      if (currentUser && currentUser.role !== editState.role) {
        if (currentUser.role !== "none") {
          await supabase.from("user_roles").delete().eq("user_id", userId);
        }
        if (editState.role !== "none") {
          const { error: roleError } = await supabase
            .from("user_roles")
            .insert({ user_id: userId, role: editState.role as any });
          if (roleError) throw roleError;
        }
      }

      toast({ title: "User updated", description: "Changes saved successfully." });
      setEditingId(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  const roleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge variant="destructive">Admin</Badge>;
      case "doctor": return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Doctor</Badge>;
      case "patient": return <Badge className="bg-green-600 text-white hover:bg-green-700">Patient</Badge>;
      default: return <Badge variant="outline">None</Badge>;
    }
  };

  const statusBadge = (status: string) => {
    return status === "pending"
      ? <Badge variant="outline" className="border-amber-500 text-amber-600">Pending</Badge>
      : <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            User Management
          </h1>
          <p className="mt-1 text-muted-foreground text-[12px]">View and edit registered users and their roles</p>
        </div>
        <div className="flex gap-2">
          <InviteUserDialog />
        </div>
      </div>

      <div className="rounded-lg border border-primary bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First Name</TableHead>
              <TableHead>Last Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead><span className="inline-flex items-center gap-1"><Shield className="h-3.5 w-3.5" />Guardian</span></TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const { first, last } = splitName(u.full_name);
              return (
                <TableRow key={u.user_id}>
                  <TableCell>
                    {editingId === u.user_id ? (
                      <Input value={editState.first_name} onChange={(e) => setEditState(s => ({ ...s, first_name: e.target.value }))} className="h-8 w-32" />
                    ) : (
                      <span className="font-medium">{first || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === u.user_id ? (
                      <Input value={editState.last_name} onChange={(e) => setEditState(s => ({ ...s, last_name: e.target.value }))} className="h-8 w-32" />
                    ) : (
                      <span>{last || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === u.user_id ? (
                      <Input value={editState.email} onChange={(e) => setEditState(s => ({ ...s, email: e.target.value }))} className="h-8 w-48" />
                    ) : (
                      u.email
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === u.user_id ? (
                      <Select value={editState.role} onValueChange={(v) => setEditState(s => ({ ...s, role: v }))}>
                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor</SelectItem>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      roleBadge(u.role)
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={!!u.holarchelp_enabled}
                      onCheckedChange={() => toggleGuardian(u.user_id, !!u.holarchelp_enabled)}
                      aria-label="Toggle Guardian module"
                    />
                  </TableCell>
                  <TableCell>{statusBadge(u.status)}</TableCell>
                  <TableCell>{format(new Date(u.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {editingId === u.user_id ? (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => saveUser(u.user_id)} disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={cancelEditing}>
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
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No users found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
