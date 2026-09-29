import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PermissionTransparencyModal } from "@/components/permissions/PermissionTransparencyModal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type AccessPermission = "patient_info" | "calendar" | "session_summaries" | "prescription_history";

interface InviteDoctorDialogProps {
  prefillDoctorId?: string;
  prefillPracticeNumber?: string;
  prefillRegistrationNumber?: string;
  prefillDoctorName?: string;
  prefillAvatarUrl?: string;
  prefillSpecialty?: string;
}

export function InviteDoctorDialog({
  prefillDoctorId,
  prefillPracticeNumber,
  prefillRegistrationNumber,
  prefillDoctorName,
  prefillAvatarUrl,
  prefillSpecialty,
}: InviteDoctorDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<AccessPermission[]>([
    "patient_info", "calendar", "session_summaries", "prescription_history",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  const handleSubmit = async () => {
    if (selectedPermissions.length === 0) {
      toast({ title: "No permissions selected", description: "Please select at least one permission to grant.", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Not authenticated", description: "Please sign in to continue.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      // Resolve target doctor via SECURITY DEFINER RPC (bypasses profiles RLS,
      // which otherwise hides doctor profiles from patients without an existing link).
      let doctorRow: { id: string; practice_number: string | null; doctor_number: string | null } | null = null;

      if (prefillDoctorId) {
        const { data, error } = await supabase
          .rpc("get_doctor_invite_card", { _doctor_id: prefillDoctorId });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          doctorRow = {
            id: (row as any).id,
            practice_number: (row as any).practice_number ?? null,
            doctor_number: (row as any).doctor_number ?? null,
          };
        }
      } else if (prefillPracticeNumber && prefillRegistrationNumber) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, practice_number, doctor_number")
          .eq("practice_number", prefillPracticeNumber.trim())
          .eq("doctor_number", prefillRegistrationNumber.trim())
          .maybeSingle();
        if (error) throw error;
        doctorRow = data as any;
      }

      if (!doctorRow) {
        toast({ title: "Wealth Manager not found", description: "We couldn't locate this provider's account.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const practiceNum = doctorRow.practice_number ?? prefillPracticeNumber ?? null;
      const registrationNum = doctorRow.doctor_number ?? prefillRegistrationNumber ?? null;

      if (!practiceNum || !registrationNum) {
        toast({
          title: "Missing registration details",
          description: "This provider has no firm or registration number on file; please contact support to connect.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }


      // Check for existing request (use doctor_id when available, fall back to numbers)
      let existingRequest: any = null;
      const baseQuery = supabase
        .from("doctor_access_requests")
        .select("*")
        .eq("patient_user_id", user.id);

      if (practiceNum && registrationNum) {
        const { data, error } = await baseQuery
          .eq("doctor_practice_number", practiceNum)
          .eq("doctor_registration_number", registrationNum)
          .maybeSingle();
        if (error) throw error;
        existingRequest = data;
      }

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          toast({ title: "Request already pending", description: "You have already sent a request to this wealth manager.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        const { error: updateError } = await supabase
          .from("doctor_access_requests")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", existingRequest.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("doctor_access_requests")
          .insert({
            patient_user_id: user.id,
            doctor_practice_number: practiceNum,
            doctor_registration_number: registrationNum,
            status: "pending",
            patient_name: profile?.full_name || null,
            patient_avatar_url: profile?.avatar_url || null,
          } as any);
        if (insertError) throw insertError;
      }

      // Create notification for the doctor (via SECURITY DEFINER RPC — RLS blocks
      // direct cross-user inserts on notifications)
      try {
        const { error: notifErr } = await supabase.rpc("create_doctor_invite_notification" as any, {
          _doctor_id: doctorRow.id,
          _title: "Patient Invitation",
          _description: `${profile?.full_name || "A patient"} has invited you to their panel of healthcare providers.`,
          _reference_id: user.id,
        });
        if (notifErr) throw notifErr;
      } catch (notifErr: any) {
        console.error("Failed to create notification:", notifErr);
        toast({
          title: "Request sent, notification delayed",
          description: "The provider will see your request, but the in-app alert could not be created.",
        });
      }

      toast({ title: "Request sent", description: "Your access request has been sent to the wealth manager." });
      setSelectedPermissions(["patient_info", "calendar", "session_summaries", "prescription_history"]);
      setOpen(false);
    } catch (error: any) {
      console.error("Failed to send access request:", error);
      toast({ title: "Failed to send request", description: error.message || "Please try again later.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Invite a Healthcare Provider
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add this healthcare provider to your panel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* Selected Doctor Info */}
          {prefillDoctorName && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-green-500 bg-green-50/30">
              <Avatar className="h-10 w-10">
                {prefillAvatarUrl && <AvatarImage src={prefillAvatarUrl} alt={prefillDoctorName} />}
                <AvatarFallback className="text-xs font-semibold">
                  {prefillDoctorName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{prefillDoctorName}</p>
                {prefillSpecialty && (
                  <Badge variant="secondary" className="text-xs mt-0.5">{prefillSpecialty}</Badge>
                )}
                {!prefillSpecialty && <p className="text-xs text-muted-foreground">Selected wealth manager</p>}
              </div>
            </div>
          )}

          {/* Permission Transparency */}
          <div className="space-y-2">
            <Label>Data Sharing Transparency</Label>
            <p className="text-xs text-muted-foreground">What your wealth manager will and won't be able to see:</p>
            <PermissionTransparencyModal inline isPatientFacing />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-3 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>) : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
