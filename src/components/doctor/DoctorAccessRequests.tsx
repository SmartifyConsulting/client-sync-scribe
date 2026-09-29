import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Loader2,
  CheckCircle,
  XCircle,
  Check,
  X,
  Calendar as CalendarIcon,
  FileText,
  Pill,
} from "lucide-react";

const GRANTED_ACCESS = [
  "Patient profile & contact details",
  "Appointments and calendar with this patient",
  "Session summaries and clinical notes",
  "Prescription history and repeats",
  "Documents the patient has shared",
  "Adding tasks, prescriptions and documents",
];

// What OTHER practitioners on the patient's panel can / cannot see.
const OTHER_PRACTITIONER_ACCESS: { label: string; allowed: boolean }[] = [
  { label: "Round Table notes and shared care-team discussions", allowed: true },
  { label: "Consultations the client has explicitly shared with them", allowed: true },
  { label: "Documents the client has shared with them", allowed: true },
  { label: "Medication, allergy and condition lists", allowed: true },
  { label: "Your private advice notes not shared to the care team", allowed: false },
  { label: "The client's Emotional Journal / Ask Indigro chats", allowed: false },
  { label: "Records from wealth managers not shared with them", allowed: false },
  { label: "The client's fees and subscription details", allowed: false },
];

const DENIED_ACCESS = [
  "Private Emotional Journal / Ask Holarc chats",
  "Records from practitioners not shared with you",
  "The patient's billing and subscription details",
  "Editing or deleting another doctor's records",
];

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
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

const FULL_PERMISSIONS: AccessPermission[] = [
  "patient_info",
  "calendar",
  "session_summaries",
  "prescription_history",
];

const ACCESS_ITEMS = [
  { icon: User, label: "Client Information", desc: "Contact details, demographics and clinical profile." },
  { icon: CalendarIcon, label: "Calendar", desc: "Their upcoming appointments and availability." },
  { icon: FileText, label: "Consultation Summaries", desc: "AI-generated summaries of past consultations." },
  { icon: Pill, label: "Documentation", desc: "Prescriptions, results and other shared documents." },
];

export function DoctorAccessRequests() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [grantedInfo, setGrantedInfo] = useState<{ patientName: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

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
          .select("full_name, avatar_url")
          .eq("id", request.patient_user_id)
          .single();

        requestsWithProfiles.push({
          ...request,
          patient_profile: {
            full_name: patientProfile?.full_name || (request as any).patient_name || null,
            avatar_url: patientProfile?.avatar_url || (request as any).patient_avatar_url || null,
          },
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

  const handleAcceptRequest = async (request: AccessRequest) => {
    if (!user) return;
    setProcessingId(request.id);

    try {
      const { error: accessError } = await supabase
        .from("doctor_patient_access")
        .upsert(
          {
            doctor_id: user.id,
            patient_user_id: request.patient_user_id,
            permissions: FULL_PERMISSIONS,
            is_active: true,
            revoked_at: null,
          } as any,
          { onConflict: "doctor_id,patient_user_id" }
        );

      if (accessError) throw accessError;

      const { error: updateError } = await supabase
        .from("doctor_access_requests")
        .update({ status: "accepted" })
        .eq("id", request.id);

      if (updateError) throw updateError;

      const patientUserId = request.patient_user_id;
      // Reuse ANY existing (non-archived) record for this patient account —
      // creating a second one splits their session/document history in two.
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", patientUserId)
        .neq("status", "archived")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!existingPatient) {
        const { data: patientProfile } = await supabase
          .from("profiles")
          .select("full_name, mobile_number")
          .eq("id", patientUserId)
          .maybeSingle();

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
          name: patientProfile?.full_name || request.patient_profile?.full_name || "Unknown Patient",
          phone: patientProfile?.mobile_number || null,
          email: patientEmail,
          status: "active",
        });
        if (insertError) throw insertError;
      }

      await supabase.from("notifications").insert({
        user_id: request.patient_user_id,
        type: "access_accepted",
        title: "Invitation Accepted",
        description: `Dr. ${profile?.full_name || "Your doctor"} has accepted your invitation.`,
        is_read: false,
      });

      const patientName = request.patient_profile?.full_name || "this patient";
      setGrantedInfo({ patientName });
      fetchRequests();
    } catch (error: any) {
      console.error("Error accepting request:", error);
      toast({
        title: "Error accepting request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineRequest = async (request: AccessRequest) => {
    try {
      const { error } = await supabase
        .from("doctor_access_requests")
        .update({ status: "declined" })
        .eq("id", request.id);
      if (error) throw error;

      await supabase.from("notifications").insert({
        user_id: request.patient_user_id,
        type: "access_declined",
        title: "Invitation Declined",
        description: `A doctor has declined your invitation.`,
        is_read: false,
      });

      toast({ title: "Request declined", description: "The access request has been declined." });
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Error declining request", description: error.message, variant: "destructive" });
    }
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

  if (!profile?.practice_number || !profile?.doctor_number) return null;
  // Keep rendering (so the "Access granted" confirmation dialog can stay
  // visible) even after the list empties out from accepting the last request.
  if (requests.length === 0 && !grantedInfo) return null;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
      <div className="space-y-3">
        {requests.map((request) => {
          const patientName = (request as any).patient_name || request.patient_profile?.full_name || "Unknown Patient";
          const busy = processingId === request.id;
          return (
            <div
              key={request.id}
              className="rounded-2xl border-2 border-crimson bg-card shadow-sm p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={request.patient_profile?.avatar_url || undefined} alt={patientName} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(patientName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{patientName}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {patientName} has invited you on their panel of healthcare providers and has provided access to their health information.
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    {format(new Date(request.created_at), "d MMM yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>

              {/* What this invitation grants — explicit, so the practitioner knows the scope */}
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 min-h-[2rem]">
                      What you will be able to access
                    </p>
                    <ul className="space-y-1">
                      {GRANTED_ACCESS.map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-foreground/80">
                          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {DENIED_ACCESS.map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <X className="h-3.5 w-3.5 shrink-0 mt-0.5 text-crimson" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 min-h-[2rem]">
                      What other practitioners can access
                    </p>
                    <ul className="space-y-1">
                      {OTHER_PRACTITIONER_ACCESS.map((item) => (
                        <li
                          key={item.label}
                          className={`flex items-start gap-1.5 text-xs ${item.allowed ? "text-foreground/80" : "text-muted-foreground"}`}
                        >
                          {item.allowed ? (
                            <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                          ) : (
                            <X className="h-3.5 w-3.5 shrink-0 mt-0.5 text-crimson" />
                          )}
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground mt-3 border-t border-border pt-2">
                  Access is granted per invitation and is revocable by the patient at any time.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => handleDeclineRequest(request)}
                  disabled={busy}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
                <Button
                  className="rounded-xl bg-crimson text-crimson-foreground hover:bg-crimson/90"
                  onClick={() => handleAcceptRequest(request)}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Accept
                </Button>
              </div>
            </div>

          );
        })}
      </div>

      {/* Access-granted info modal — no selection, just confirmation */}
      <Dialog open={!!grantedInfo} onOpenChange={(open) => !open && setGrantedInfo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Access granted
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-foreground">
              You now have access to{" "}
              <span className="font-semibold">{grantedInfo?.patientName}</span>'s information:
            </p>
            <ul className="space-y-2">
              {ACCESS_ITEMS.map((item) => (
                <li
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <item.icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setGrantedInfo(null)} className="w-full sm:w-auto">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

