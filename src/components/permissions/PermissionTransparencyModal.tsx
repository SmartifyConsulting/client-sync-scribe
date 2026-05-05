import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Heart,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PermissionItem {
  label: string;
  subItems?: string[];
}

const sharedItems: PermissionItem[] = [
  { label: "Your AI Session Summaries" },
  { label: "Your Patient Information" },
  { label: "Your Patient Medical Overview" },
  {
    label: "Your Documents",
    subItems: [
      "Prescriptions",
      "Hospital Admissions",
      "Patient Images",
      "Patient Videos",
      "Test Results",
      "Scans",
    ],
  },
];

const privateItems: PermissionItem[] = [
  { label: "Full Transcriptions" },
  { label: "Raw Audio Recordings" },
  { label: "AI Diagnostics" },
  { label: "Clinical Drawings/Sketches" },
  { label: "Invoices & Billing Data" },
  { label: "Medical Certificates" },
];

// What other doctors on the patient's profile will see vs. what stays private to this practice
const doctorSharedItems: PermissionItem[] = [
  { label: "Your contribution to the patient's AI Summary" },
  { label: "Your visit summary on the patient's timeline" },
  { label: "Prescriptions you issue" },
  { label: "Information relevant to the patient's ailments and medical history" },
  { label: "Your Credentials" },
  { label: "Your About Me" },
];

const doctorPrivateItems: PermissionItem[] = [
  { label: "Full Session History details" },
  { label: "Raw Audio Recordings" },
  { label: "Full Transcriptions" },
  { label: "Invoices & Billing for your practice" },
  { label: "Medical Certificates you issue" },
  { label: "Your Draft Notes" },
];

interface PermissionTransparencyModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
  isPatientFacing?: boolean;
  onConfirm?: () => void;
  confirmLabel?: string;
  mode?: "patient_invites_doctor" | "doctor_invites_patient";
}

export function PermissionTransparencyModal({
  open,
  onOpenChange,
  inline = false,
  isPatientFacing = false,
  onConfirm,
  confirmLabel = "I Understand",
  mode = "patient_invites_doctor",
}: PermissionTransparencyModalProps) {
  const [showHolisticWarning] = useState(false);
  const isDoctorMode = mode === "doctor_invites_patient";

  const sharedHeading = isDoctorMode
    ? "Shared with Patient's Care Team"
    : "Shared with Care Team";
  const privateHeading = isDoctorMode
    ? "Private to Your Practice — Not Shared"
    : "Private — Not Shared";
  const sharedList = isDoctorMode ? doctorSharedItems : sharedItems;
  const privateList = isDoctorMode ? doctorPrivateItems : privateItems;

  const content = (
    <div className="space-y-4">
      {isDoctorMode && (
        <p className="text-xs text-muted-foreground">
          What other doctors on this patient's profile will and won't see from your sessions and records.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: Shared Items */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {sharedHeading}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-foreground">
            {sharedList.map((item) => (
              <li key={item.label}>
                {item.label}
                {item.subItems && (
                  <ul className="list-disc list-inside ml-4 mt-0.5 space-y-0.5 text-muted-foreground">
                    {item.subItems.map((sub) => (
                      <li key={sub}>{sub}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Column 2: Private Items */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            {privateHeading}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-foreground">
            {privateList.map((item) => (
              <li key={item.label}>{item.label}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Patient-facing holistic nudge */}
      {isPatientFacing && !isDoctorMode && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Heart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Holistic Health Sharing</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sharing your AI Session Summaries, Patient Information, and Medical Overview
                helps your doctors see the full picture of your health for the safest and most accurate care.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Holistic warning alert */}
      {isPatientFacing && !isDoctorMode && showHolisticWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Important:</strong> Limiting access to your profile may prevent your doctors
            from seeing the holistic view of your health which ensures the safest and most accurate care.
          </AlertDescription>
        </Alert>
      )}

      {onConfirm && (
        <div className="pt-2 border-t border-border">
          <Button className="w-full" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Data Sharing Transparency
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

export { sharedItems, privateItems };
