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
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type AccessPermission = "patient_info" | "calendar" | "session_summaries" | "prescription_history";

interface PermissionOption {
  id: AccessPermission;
  label: string;
  description: string;
}

const permissionOptions: PermissionOption[] = [
  {
    id: "patient_info",
    label: "Patient Information",
    description: "View your personal and medical details",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "View and manage your appointments",
  },
  {
    id: "session_summaries",
    label: "Session Summaries",
    description: "View summaries from your consultations",
  },
  {
    id: "prescription_history",
    label: "Prescription History",
    description: "View your prescription records",
  },
];

interface InviteDoctorDialogProps {
  prefillPracticeNumber?: string;
  prefillRegistrationNumber?: string;
}

export function InviteDoctorDialog({ prefillPracticeNumber, prefillRegistrationNumber }: InviteDoctorDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [practiceNumber, setPracticeNumber] = useState(prefillPracticeNumber || "");
  const [registrationNumber, setRegistrationNumber] = useState(prefillRegistrationNumber || "");
  const [selectedPermissions, setSelectedPermissions] = useState<AccessPermission[]>([
    "patient_info",
    "calendar",
    "session_summaries",
    "prescription_history",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      if (prefillPracticeNumber) setPracticeNumber(prefillPracticeNumber);
      if (prefillRegistrationNumber) setRegistrationNumber(prefillRegistrationNumber);
    }
  }, [open, prefillPracticeNumber, prefillRegistrationNumber]);

  const handlePermissionToggle = (permission: AccessPermission) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSubmit = async () => {
    if (!practiceNumber.trim() || !registrationNumber.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both practice number and registration number.",
        variant: "destructive",
      });
      return;
    }

    if (selectedPermissions.length === 0) {
      toast({
        title: "No permissions selected",
        description: "Please select at least one permission to grant.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Check if a request already exists for this doctor
      const { data: existingRequest, error: checkError } = await supabase
        .from("doctor_access_requests")
        .select("*")
        .eq("patient_user_id", user.id)
        .eq("doctor_practice_number", practiceNumber.trim())
        .eq("doctor_registration_number", registrationNumber.trim())
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          toast({
            title: "Request already pending",
            description: "You have already sent a request to this doctor.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Update existing request if it was declined or expired
        const { error: updateError } = await supabase
          .from("doctor_access_requests")
          .update({
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingRequest.id);

        if (updateError) throw updateError;
      } else {
        // Create new access request
        const { error: insertError } = await supabase
          .from("doctor_access_requests")
          .insert({
            patient_user_id: user.id,
            doctor_practice_number: practiceNumber.trim(),
            doctor_registration_number: registrationNumber.trim(),
            status: "pending",
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Request sent",
        description: "Your access request has been sent to the doctor. They will need to accept it to gain access.",
      });

      // Reset form
      setPracticeNumber("");
      setRegistrationNumber("");
      setSelectedPermissions(["patient_info", "calendar", "session_summaries", "prescription_history"]);
      setOpen(false);
    } catch (error: any) {
      console.error("Failed to send access request:", error);
      toast({
        title: "Failed to send request",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Doctor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Invite a Healthcare Provider
          </DialogTitle>
          <DialogDescription>
            Enter the doctor's practice and registration numbers to send them an access request.
            They will need to accept your request before they can view your information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Doctor Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="practiceNumber">Practice Number</Label>
              <Input
                id="practiceNumber"
                placeholder="e.g., PR123456"
                value={practiceNumber}
                onChange={(e) => setPracticeNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Doctor Registration Number</Label>
              <Input
                id="registrationNumber"
                placeholder="e.g., MP123456"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <Label>Access Permissions</Label>
            <p className="text-sm text-muted-foreground">
              Select what information this doctor can access:
            </p>
            <div className="space-y-3">
              {permissionOptions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-start space-x-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={permission.id}
                    checked={selectedPermissions.includes(permission.id)}
                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={permission.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {permission.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {permission.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Request"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
