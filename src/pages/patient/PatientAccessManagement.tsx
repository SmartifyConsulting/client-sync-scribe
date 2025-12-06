import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Shield, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Clock, 
  XCircle,
  Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { InviteDoctorDialog } from "@/components/patient/InviteDoctorDialog";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AccessPermission = "patient_info" | "calendar" | "session_summaries" | "prescription_history";

interface DoctorAccess {
  id: string;
  doctor_id: string;
  permissions: AccessPermission[];
  granted_at: string;
  is_active: boolean;
  doctor_profile?: {
    full_name: string | null;
    practice_number: string | null;
    doctor_number: string | null;
  };
}

interface AccessRequest {
  id: string;
  doctor_practice_number: string;
  doctor_registration_number: string;
  status: string;
  created_at: string;
}

const permissionLabels: Record<AccessPermission, string> = {
  patient_info: "Patient Information",
  calendar: "Calendar",
  session_summaries: "Session Summaries",
  prescription_history: "Prescription History",
};

const statusConfig = {
  pending: { color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  accepted: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  declined: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

export default function PatientAccessManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [grantedAccess, setGrantedAccess] = useState<DoctorAccess[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [editingAccess, setEditingAccess] = useState<DoctorAccess | null>(null);
  const [editPermissions, setEditPermissions] = useState<AccessPermission[]>([]);

  useEffect(() => {
    if (user) {
      fetchAccessData();
    }
  }, [user]);

  const fetchAccessData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch granted access
      const { data: accessData, error: accessError } = await supabase
        .from("doctor_patient_access")
        .select("*")
        .eq("patient_user_id", user.id)
        .eq("is_active", true);

      if (accessError) throw accessError;

      // Fetch doctor profiles for granted access
      const accessWithProfiles: DoctorAccess[] = [];
      for (const access of accessData || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, practice_number, doctor_number")
          .eq("id", access.doctor_id)
          .single();

        accessWithProfiles.push({
          ...access,
          permissions: access.permissions as AccessPermission[],
          doctor_profile: profile || undefined,
        });
      }
      setGrantedAccess(accessWithProfiles);

      // Fetch pending requests
      const { data: requestData, error: requestError } = await supabase
        .from("doctor_access_requests")
        .select("*")
        .eq("patient_user_id", user.id)
        .order("created_at", { ascending: false });

      if (requestError) throw requestError;
      setPendingRequests(requestData || []);
    } catch (error: any) {
      console.error("Error fetching access data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from("doctor_patient_access")
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", accessId);

      if (error) throw error;

      toast({
        title: "Access revoked",
        description: "The doctor no longer has access to your information.",
      });

      fetchAccessData();
    } catch (error: any) {
      toast({
        title: "Error revoking access",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("doctor_access_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "The access request has been cancelled.",
      });

      fetchAccessData();
    } catch (error: any) {
      toast({
        title: "Error cancelling request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditPermissions = (access: DoctorAccess) => {
    setEditingAccess(access);
    setEditPermissions([...access.permissions]);
  };

  const handleSavePermissions = async () => {
    if (!editingAccess) return;

    try {
      const { error } = await supabase
        .from("doctor_patient_access")
        .update({ permissions: editPermissions })
        .eq("id", editingAccess.id);

      if (error) throw error;

      toast({
        title: "Permissions updated",
        description: "Doctor access permissions have been updated.",
      });

      setEditingAccess(null);
      fetchAccessData();
    } catch (error: any) {
      toast({
        title: "Error updating permissions",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePermission = (permission: AccessPermission) => {
    setEditPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Access Management</h1>
          <p className="text-muted-foreground">Manage who can access your health information</p>
        </div>
        <InviteDoctorDialog />
      </div>

      {/* Active Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Doctors with Access
          </CardTitle>
          <CardDescription>
            Healthcare providers who currently have access to your information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grantedAccess.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No doctors currently have access to your information.
            </p>
          ) : (
            <div className="space-y-4">
              {grantedAccess.map((access) => (
                <div
                  key={access.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="font-semibold">
                        {access.doctor_profile?.full_name || "Unknown Doctor"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Practice: {access.doctor_profile?.practice_number || "N/A"} • 
                        Reg: {access.doctor_profile?.doctor_number || "N/A"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {access.permissions.map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {permissionLabels[perm]}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Connected since {format(new Date(access.granted_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPermissions(access)}
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Access?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove {access.doctor_profile?.full_name || "this doctor"}'s 
                            access to your health information. They will no longer be able to view 
                            your data. You can always invite them again later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleRevokeAccess(access.id)}>
                            Revoke Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            Access requests waiting for doctor approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No pending access requests.
            </p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => {
                const config = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                const StatusIcon = config.icon;
                
                return (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        Practice: {request.doctor_practice_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Registration: {request.doctor_registration_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent {format(new Date(request.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge className={config.color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                    {request.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
      <Dialog open={!!editingAccess} onOpenChange={() => setEditingAccess(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Update the access permissions for {editingAccess?.doctor_profile?.full_name || "this doctor"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(Object.keys(permissionLabels) as AccessPermission[]).map((permission) => (
              <div
                key={permission}
                className="flex items-center space-x-3 rounded-lg border border-border p-3"
              >
                <Checkbox
                  id={`edit-${permission}`}
                  checked={editPermissions.includes(permission)}
                  onCheckedChange={() => togglePermission(permission)}
                />
                <Label htmlFor={`edit-${permission}`} className="flex-1 cursor-pointer">
                  {permissionLabels[permission]}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAccess(null)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={editPermissions.length === 0}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
