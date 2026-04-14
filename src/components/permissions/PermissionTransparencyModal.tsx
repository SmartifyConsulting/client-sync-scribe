import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  FileText,
  User,
  Sparkles,
  ClipboardList,
  Mic,
  Brain,
  PenTool,
  Receipt,
  FileEdit,
  FileBadge,
  AlertTriangle,
  Heart,
  Image,
  Video,
  TestTube,
  ScanLine,
  Hospital,
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
  icon: React.ComponentType<any>;
  subItems?: string[];
}

const sharedItems: PermissionItem[] = [
  { label: "AI Session Summaries", icon: Sparkles },
  { label: "Patient Information", icon: User },
  { label: "Patient Medical Overview", icon: ClipboardList },
  {
    label: "Documents",
    icon: FileText,
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
  { label: "Full Transcriptions", icon: FileText },
  { label: "Raw Audio Recordings", icon: Mic },
  { label: "AI Diagnostics", icon: Brain },
  { label: "Clinical Drawings/Sketches", icon: PenTool },
  { label: "Invoices & Billing Data", icon: Receipt },
  { label: "Doctor Referrals", icon: FileEdit },
  { label: "Medical Certificates", icon: FileBadge },
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
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Shared with Care Team
          </h4>
          <div className="space-y-2">
            {sharedItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label}>
                  <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <Icon className="h-4 w-4 text-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                  {item.subItems && (
                    <div className="ml-11 mt-1 flex flex-wrap gap-1.5">
                      {item.subItems.map((sub) => (
                        <span
                          key={sub}
                          className="text-xs rounded-full bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Private Items */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            Private — Not Shared
          </h4>
          <div className="space-y-2">
            {privateItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5 opacity-60"
                >
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
              );
            })}
          </div>
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
