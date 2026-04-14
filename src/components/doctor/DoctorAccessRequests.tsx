import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  User, 
  Shield, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Clock,
  UserCheck,
  UserX
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AccessPermission = "patient_info" | "calendar" | "session_summaries" | "prescription_history";

interface AccessRequest {
  id: string;
  patient_user_id: string;
  doctor_practice_number: string;
  doctor_registration_number: string;
  status: string;
  created_at: string;
  patient_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

const permissionLabels: Record<AccessPermission, string> = {
  session_summaries: "Session Summaries",
  patient_info: "Patient Information",
  calendar: "Calendar",
  prescription_history: "Documentation",
};

export function DoctorAccessRequests() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [acceptingRequest, setAcceptingRequest] = useState<AccessRequest | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<AccessPermission[]>([
    "patient_info",
    "calendar",
    "session_summaries",
    "prescription_history",
  ]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user && profile) {
      fetchRequests();
    }
  }, [user, profile]);

  const fetchRequests = async () => {
    if (!profile?.practice_number || !profile?.doctor_number) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("doctor_access_requests")
        .select("*")
        .eq("doctor_practice_number", profile.practice_number)
        .eq("doctor_registration_number", profile.doctor_number)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch patient profiles
      const requestsWithProfiles: AccessRequest[] = [];
      for (const request of data || []) {
        const { data: patientProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", request.patient_user_id)
          .single();

        requestsWithProfiles.push({
          ...request,
          patient_profile: patientProfile || undefined,
        });
      }

      setRequests(requestsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!acceptingRequest || !user) return;
    setProcessing(true);

    try {
      // Create the access grant
      const { error: accessError } = await supabase
        .from("doctor_patient_access")
        .insert({
          doctor_id: user.id,
          patient_user_id: acceptingRequest.patient_user_id,
          permissions: selectedPermissions,
          is_active: true,
        });

      if (accessError) throw accessError;

      // Update request status
      const { error: updateError } = await supabase
        .from("doctor_access_requests")
        .update({ status: "accepted" })
        .eq("id", acceptingRequest.id);

      if (updateError) throw updateError;

      // Auto-create patient record for this doctor if one doesn't already exist
      const patientUserId = acceptingRequest.patient_user_id;
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .eq("patient_user_id", patientUserId)
        .maybeSingle();

      if (!existingPatient) {
        // Fetch patient profile info
        const { data: patientProfile } = await supabase
          .from("profiles")
          .select("full_name, mobile_number")
          .eq("id", patientUserId)
          .maybeSingle();

        // Fetch email from auth user via user_invitations or profile email
        let patientEmail: string | null = null;
        const { data: invitations } = await supabase
          .from("user_invitations")
          .select("recipient_email")
          .eq("recipient_id", patientUserId)
          .limit(1);
        if (invitations?.length) patientEmail = invitations[0].recipient_email;

        const { error: insertError } = await supabase.from("patients").insert({
          user_id: user.id,
          patient_user_id: patientUserId,
          name: patientProfile?.full_name || acceptingRequest.patient_profile?.full_name || "Unknown Patient",
          phone: patientProfile?.mobile_number || null,
          email: patientEmail,
          status: "active",
        });

        if (insertError) {
          console.error("Error creating patient record:", insertError);
          throw insertError;
        }
      }

      toast({
        title: "Access granted",
        description: `You now have access to ${acceptingRequest.patient_profile?.full_name || "this patient"}'s information. They have been added to your patient list.`,
      });

      setAcceptingRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error accepting request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeclineRequest = async (request: AccessRequest) => {
    try {
      const { error } = await supabase
        .from("doctor_access_requests")
        .update({ status: "declined" })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Request declined",
        description: "The access request has been declined.",
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error declining request",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePermission = (permission: AccessPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!profile?.practice_number || !profile?.doctor_number) {
    return null;
  }

  if (requests.length === 0) {
    return null;
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => {
          const patientName = (request as any).patient_name || request.patient_profile?.full_name || "Unknown Patient";
          return (
            <div
              key={request.id}
              className="rounded-2xl border-2 border-green-500 bg-card shadow-sm p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {getInitials(patientName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{patientName}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {patientName} has invited you on their panel of healthcare providers and has provided access to their health information.
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2">
                    {format(new Date(request.created_at), "d MMM yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => handleDeclineRequest(request)}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Decline
                </Button>
                <Button
                  size="sm"
                  className="flex-1 rounded-xl text-xs"
                  onClick={() => {
                    setAcceptingRequest(request);
                    setSelectedPermissions(["patient_info", "calendar", "session_summaries", "prescription_history"]);
                  }}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Accept
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Accept Dialog with Permission Selection */}
      <Dialog open={!!acceptingRequest} onOpenChange={() => setAcceptingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Patient Request</DialogTitle>
            <DialogDescription>
              Select the information you want to access for{" "}
              {acceptingRequest?.patient_profile?.full_name || "this patient"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(Object.keys(permissionLabels) as AccessPermission[]).map((permission) => (
              <div
                key={permission}
                className="flex items-center space-x-3 rounded-lg border border-border p-3"
              >
                <Checkbox
                  id={`accept-${permission}`}
                  checked={selectedPermissions.includes(permission)}
                  onCheckedChange={() => togglePermission(permission)}
                />
                <Label htmlFor={`accept-${permission}`} className="flex-1 cursor-pointer">
                  {permissionLabels[permission]}
                </Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptingRequest(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAcceptRequest} 
              disabled={processing || selectedPermissions.length === 0}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
