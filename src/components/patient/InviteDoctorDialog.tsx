import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
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
  prefillPracticeNumber?: string;
  prefillRegistrationNumber?: string;
  prefillDoctorName?: string;
  prefillAvatarUrl?: string;
  prefillSpecialty?: string;
}

export function InviteDoctorDialog({ prefillPracticeNumber, prefillRegistrationNumber, prefillDoctorName, prefillAvatarUrl, prefillSpecialty }: InviteDoctorDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [practiceNumber, setPracticeNumber] = useState(prefillPracticeNumber || "");
  const [registrationNumber, setRegistrationNumber] = useState(prefillRegistrationNumber || "");
  const [selectedPermissions, setSelectedPermissions] = useState<AccessPermission[]>([
    "patient_info", "calendar", "session_summaries", "prescription_history",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();

  useEffect(() => {
    if (open) {
      if (prefillPracticeNumber) setPracticeNumber(prefillPracticeNumber);
      if (prefillRegistrationNumber) setRegistrationNumber(prefillRegistrationNumber);
    }
  }, [open, prefillPracticeNumber, prefillRegistrationNumber]);

  const handleSubmit = async () => {
    if (!practiceNumber.trim() || !registrationNumber.trim()) {
      toast({ title: "Missing information", description: "Please enter both practice number and registration number.", variant: "destructive" });
      return;
    }
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
      const { data: existingRequest, error: checkError } = await supabase
        .from("doctor_access_requests")
        .select("*")
        .eq("patient_user_id", user.id)
        .eq("doctor_practice_number", practiceNumber.trim())
        .eq("doctor_registration_number", registrationNumber.trim())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          toast({ title: "Request already pending", description: "You have already sent a request to this doctor.", variant: "destructive" });
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
            doctor_practice_number: practiceNumber.trim(),
            doctor_registration_number: registrationNumber.trim(),
            status: "pending",
            patient_name: profile?.full_name || null,
          } as any);
        if (insertError) throw insertError;
      }

      // Create notification for the doctor
      try {
        const { data: doctorProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("practice_number", practiceNumber.trim())
          .eq("doctor_number", registrationNumber.trim())
          .maybeSingle();

        if (doctorProfile) {
          await supabase.from("notifications").insert({
            user_id: doctorProfile.id,
            type: "access_request",
            title: "Patient Invitation",
            description: `${profile?.full_name || "A patient"} has invited you to their panel of healthcare providers.`,
            is_read: false,
          });
        }
      } catch (notifErr) {
        console.error("Failed to create notification:", notifErr);
      }

      toast({ title: "Request sent", description: "Your access request has been sent to the doctor." });
      setPracticeNumber("");
      setRegistrationNumber("");
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Invite a Healthcare Provider
          </DialogTitle>
          <DialogDescription>
            Enter the doctor's practice and registration numbers to send an invitation.
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
                  <Badge variant="secondary" className="text-[10px] mt-0.5">{prefillSpecialty}</Badge>
                )}
                {!prefillSpecialty && <p className="text-[10px] text-muted-foreground">Selected healthcare provider</p>}
              </div>
            </div>
          )}

          {/* Doctor Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="practiceNumber">Practice Number</Label>
              <Input id="practiceNumber" placeholder="e.g., PR123456" value={practiceNumber} onChange={(e) => setPracticeNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Doctor Registration Number</Label>
              <Input id="registrationNumber" placeholder="e.g., MP123456" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} />
            </div>
          </div>

          {/* Permission Transparency */}
          <div className="space-y-2">
            <Label>Data Sharing Transparency</Label>
            <p className="text-[10px] text-muted-foreground">What your doctor will and won't be able to see:</p>
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