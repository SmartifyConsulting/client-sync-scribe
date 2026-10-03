import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  User, 
  Mail, 
  Loader2, 
  CheckCircle, 
  UserCheck,
  UserX,
  EyeOff,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type AccessPermission = "patient_info" | "calendar" | "session_summaries" | "prescription_history";

interface PermissionOption {
  id: AccessPermission;
  label: string;
  description: string;
}

const permissionOptions: PermissionOption[] = [
  { id: "patient_info", label: "Client Information", description: "View your personal and financial details" },
  { id: "calendar", label: "Calendar", description: "View and manage your appointments" },
  { id: "session_summaries", label: "Consultation Summaries", description: "View summaries from your consultations" },
  { id: "prescription_history", label: "Documentation", description: "View your documents and records" },
];

interface ApprovedInvite {
  id: string;
  doctor_practice_number: string;
  doctor_registration_number: string;
  created_at: string;
  doctor_name?: string;
  permissions?: AccessPermission[];
}

interface IncomingInvitation {
  id: string;
  sender_id: string;
  recipient_email: string;
  message: string | null;
  status: string;
  created_at: string;
  sender_name?: string;
}

export default function PatientAccessManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [approvedInvites, setApprovedInvites] = useState<ApprovedInvite[]>([]);
  const [incomingInvitations, setIncomingInvitations] = useState<IncomingInvitation[]>([]);
  const [roundTableEnabled, setRoundTableEnabled] = useState(false);
  const [updatingRoundTable, setUpdatingRoundTable] = useState(false);
  const [permissionsPerInvitation, setPermissionsPerInvitation] = useState<Record<string, AccessPermission[]>>({});

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Initialize permissions for new incoming invitations
  useEffect(() => {
    const newPerms: Record<string, AccessPermission[]> = { ...permissionsPerInvitation };
    let changed = false;
    for (const inv of incomingInvitations) {
      if (!newPerms[inv.id]) {
        newPerms[inv.id] = ["patient_info", "calendar", "session_summaries", "prescription_history"];
        changed = true;
      }
    }
    if (changed) setPermissionsPerInvitation(newPerms);
  }, [incomingInvitations]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch outgoing invites that were accepted
      const { data: acceptedRequests, error: reqError } = await supabase
        .from("doctor_access_requests")
        .select("*")
        .eq("patient_user_id", user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (reqError) throw reqError;

      // Get doctor names and permissions for accepted requests
      const approvedWithNames: ApprovedInvite[] = [];
      for (const req of acceptedRequests || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, id")
          .eq("practice_number", req.doctor_practice_number)
          .eq("doctor_number", req.doctor_registration_number)
          .maybeSingle();

        // Fetch granted permissions from doctor_patient_access
        let permissions: AccessPermission[] | undefined;
        if (profile?.id) {
          const { data: access } = await supabase
            .from("doctor_patient_access")
            .select("permissions")
            .eq("doctor_id", profile.id)
            .eq("patient_user_id", user.id)
            .eq("is_active", true)
            .maybeSingle();
          permissions = access?.permissions as AccessPermission[] | undefined;
        }

        approvedWithNames.push({
          ...req,
          doctor_name: profile?.full_name || undefined,
          permissions,
        });
      }
      setApprovedInvites(approvedWithNames);

      // Fetch incoming invitations (pending only)
      const { data: incoming, error: incomingError } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("recipient_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (incomingError) throw incomingError;

      const incomingWithNames: IncomingInvitation[] = [];
      for (const inv of incoming || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", inv.sender_id)
          .maybeSingle();

        incomingWithNames.push({
          ...inv,
          sender_name: profile?.full_name || undefined,
        });
      }
      setIncomingInvitations(incomingWithNames);

      // Fetch round table preference
      const { data: profileData } = await supabase
        .from("profiles")
        .select("round_table_enabled")
        .eq("id", user.id)
        .single();

      setRoundTableEnabled(profileData?.round_table_enabled || false);
    } catch (error: any) {
      console.error("Error fetching invite data:", error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (invitationId: string, permission: AccessPermission) => {
    setPermissionsPerInvitation((prev) => {
      const current = prev[invitationId] || [];
      const updated = current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission];
      return { ...prev, [invitationId]: updated };
    });
  };

  const handleInvitationAction = async (invitationId: string, action: "accepted" | "declined" | "ignored") => {
    if (action === "accepted") {
      const perms = permissionsPerInvitation[invitationId] || [];
      if (perms.length === 0) {
        toast({
          title: "No permissions selected",
          description: "Please select at least one permission to grant before accepting.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const newStatus = action === "ignored" ? "declined" : action;
      
      const { error } = await supabase
        .from("user_invitations")
        .update({ status: newStatus })
        .eq("id", invitationId);

      if (error) throw error;

      const actionLabel = action === "accepted" ? "accepted" : action === "declined" ? "declined" : "ignored";
      toast({
        title: `Invitation ${actionLabel}`,
        description: action === "accepted" 
          ? "The doctor now has access to your profile." 
          : `The invitation has been ${actionLabel}.`,
      });

      if (action === "accepted") {
        const invitation = incomingInvitations.find(i => i.id === invitationId);
        if (invitation) {
          await supabase.from("doctor_patient_access").insert({
            doctor_id: invitation.sender_id,
            patient_user_id: user!.id,
            permissions: permissionsPerInvitation[invitationId] || [],
            is_active: true,
          });
        }
      }

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRoundTableToggle = async (enabled: boolean) => {
    if (!user) return;
    setUpdatingRoundTable(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ round_table_enabled: enabled })
        .eq("id", user.id);

      if (error) throw error;

      setRoundTableEnabled(enabled);
      toast({
        title: enabled ? "Round Table enabled" : "Round Table disabled",
        description: enabled 
          ? "All your doctors can now exchange thoughts about your care."
          : "Doctors can no longer see the Round Table for your profile.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingRoundTable(false);
    }
  };

  const permissionLabel = (p: string) => {
    const found = permissionOptions.find((o) => o.id === p);
    return found ? found.label : p;
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
      <div>
        <h1 className="page-title">Invites</h1>
        <p className="text-muted-foreground text-xs">Manage your wealth manager invitations and preferences</p>
      </div>

      {/* Round Table Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Round Table Access
          </CardTitle>
          <CardDescription>
            Allow all your doctors to exchange thoughts and collaborate on your care
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div className="space-y-1">
              <Label htmlFor="round-table-toggle" className="font-medium">
                Enable Round Table
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, all doctors on your profile can view and contribute to your Round Table discussions.
              </p>
            </div>
            <Switch
              id="round-table-toggle"
              checked={roundTableEnabled}
              onCheckedChange={handleRoundTableToggle}
              disabled={updatingRoundTable}
            />
          </div>
        </CardContent>
      </Card>

      {/* Incoming Invitations */}
      {incomingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations from doctors requesting to connect with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {incomingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-lg border border-border bg-amber-50/50 dark:bg-amber-900/10"
                >
                  {/* Doctor info row */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {invitation.sender_name || "Unknown Wealth Manager"}
                      </p>
                      {invitation.message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {invitation.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Received {format(new Date(invitation.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  {/* Permission checkboxes */}
                  <div className="px-4 pb-2">
                    <Label className="text-sm font-medium">Grant access to:</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {permissionOptions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-start space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={`${invitation.id}-${perm.id}`}
                            checked={(permissionsPerInvitation[invitation.id] || []).includes(perm.id)}
                            onCheckedChange={() => handlePermissionToggle(invitation.id, perm.id)}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`${invitation.id}-${perm.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {perm.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex justify-end gap-2 px-4 pb-4 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleInvitationAction(invitation.id, "ignored")}
                      title="Ignore"
                    >
                      <EyeOff className="h-4 w-4 mr-1" />
                      Ignore
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInvitationAction(invitation.id, "declined")}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleInvitationAction(invitation.id, "accepted")}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Approved Invitations
          </CardTitle>
          <CardDescription>
            Invitations you sent that have been approved by doctors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvedInvites.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No approved invitations yet.
            </p>
          ) : (
            <div className="space-y-4">
              {approvedInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 dark:bg-primary/15">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {invite.doctor_name || `Practice: ${invite.doctor_practice_number}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Registration: {invite.doctor_registration_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Approved {format(new Date(invite.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                    <Badge className="bg-sky-50 text-primary dark:bg-primary/15 dark:text-primary">
                      Approved
                    </Badge>
                  </div>
                  {invite.permissions && invite.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-14">
                      {invite.permissions.map((p) => (
                        <Badge key={p} variant="secondary" className="text-xs">
                          {permissionLabel(p)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
