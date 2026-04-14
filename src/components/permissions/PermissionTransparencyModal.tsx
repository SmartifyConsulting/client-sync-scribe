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

interface PermissionTransparencyModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
  isPatientFacing?: boolean;
  onConfirm?: () => void;
  confirmLabel?: string;
}

export function PermissionTransparencyModal({
  open,
  onOpenChange,
  inline = false,
  isPatientFacing = false,
  onConfirm,
  confirmLabel = "I Understand",
}: PermissionTransparencyModalProps) {
  const [showHolisticWarning, setShowHolisticWarning] = useState(false);

  const content = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: Shared Items */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Shared with Care Team
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-foreground">
            {sharedItems.map((item) => (
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
            Private — Not Shared
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            {privateItems.map((item) => (
              <li key={item.label}>{item.label}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Patient-facing holistic nudge */}
      {isPatientFacing && (
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
      {isPatientFacing && showHolisticWarning && (
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
