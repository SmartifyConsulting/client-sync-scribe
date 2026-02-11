import { useState, useEffect } from "react";
import { Loader2, ShieldAlert, Users, Pencil, Save, X } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface UserRecord {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface EditState {
  full_name: string;
  role: string;
}

export default function UserManagement() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ full_name: "", role: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_users_admin");
    if (!error && data) setUsers(data as UserRecord[]);
    setLoading(false);
  };

  const startEditing = (user: UserRecord) => {
    setEditingId(user.user_id);
    setEditState({ full_name: user.full_name || "", role: user.role });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditState({ full_name: "", role: "" });
  };

  const saveUser = async (userId: string) => {
    setSaving(true);
    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: editState.full_name })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update role if changed
      const currentUser = users.find(u => u.user_id === userId);
      if (currentUser && currentUser.role !== editState.role) {
        if (currentUser.role !== "none") {
          // Delete existing role
          await supabase.from("user_roles").delete().eq("user_id", userId);
        }
        if (editState.role !== "none") {
          // Insert new role
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
      case "admin":
        return <Badge variant="destructive">Admin</Badge>;
      case "doctor":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Doctor</Badge>;
      case "patient":
        return <Badge className="bg-green-600 text-white hover:bg-green-700">Patient</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Users className="h-7 w-7 text-primary" />
          User Management
        </h1>
        <p className="mt-1 text-muted-foreground">
          View and edit registered users and their roles
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell>
                  {editingId === u.user_id ? (
                    <Input
                      value={editState.full_name}
                      onChange={(e) => setEditState(s => ({ ...s, full_name: e.target.value }))}
                      className="h-8 w-48"
                    />
                  ) : (
                    <span className="font-medium">{u.full_name || "—"}</span>
                  )}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  {editingId === u.user_id ? (
                    <Select
                      value={editState.role}
                      onValueChange={(v) => setEditState(s => ({ ...s, role: v }))}
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
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
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
