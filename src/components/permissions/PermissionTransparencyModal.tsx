import { useState } from "react";
import { useTranslation } from "react-i18next";
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

// These will be populated from i18n translations
export const getSharedItems = (t: any): PermissionItem[] => [
  { label: t("permissions.aiSessionSummaries") },
  { label: t("permissions.patientInformation") },
  { label: t("permissions.medicalOverview") },
  {
    label: t("permissions.documents"),
    subItems: [
      t("permissions.prescriptions"),
      t("permissions.hospitalAdmissions"),
      t("permissions.patientImages"),
      t("permissions.patientVideos"),
      t("permissions.testResults"),
      t("permissions.scans"),
    ],
  },
];

export const getPrivateItems = (t: any): PermissionItem[] => [
  { label: t("permissions.fullTranscriptions") },
  { label: t("permissions.rawAudioRecordings") },
  { label: t("permissions.aiDiagnostics") },
  { label: t("permissions.clinicalDrawings") },
  { label: t("permissions.invoicesAndBilling") },
  { label: t("permissions.medicalCertificates") },
];

// What other doctors on the patient's profile will see vs. what stays private to this practice
const getDoctorSharedItems = (t: any): PermissionItem[] => [
  { label: t("permissions.doctorContribution") },
  { label: t("permissions.visitSummary") },
  { label: t("permissions.issuedPrescriptions") },
  { label: t("permissions.medicalHistory") },
  { label: t("permissions.credentials") },
  { label: t("permissions.aboutMe") },
];

const getDoctorPrivateItems = (t: any): PermissionItem[] => [
  { label: t("permissions.sessionHistory") },
  { label: t("permissions.rawAudioRecordings") },
  { label: t("permissions.fullTranscriptions") },
  { label: t("permissions.invoicesAndBilling") },
  { label: t("permissions.medicalCertificates") },
  { label: t("permissions.draftNotes") },
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
  confirmLabel,
  mode = "patient_invites_doctor",
}: PermissionTransparencyModalProps) {
  const { t } = useTranslation();
  const [showHolisticWarning] = useState(false);
  const isDoctorMode = mode === "doctor_invites_patient";

  const sharedHeading = isDoctorMode
    ? t("dialogs.sharedWithPatientCareTeam")
    : t("dialogs.sharedWithCareTeam");
  const privateHeading = isDoctorMode
    ? t("dialogs.privateToYourPractice")
    : t("dialogs.privateNotShared");
  const sharedList = isDoctorMode ? getDoctorSharedItems(t) : getSharedItems(t);
  const privateList = isDoctorMode ? getDoctorPrivateItems(t) : getPrivateItems(t);

  const RowList = ({
    allowed,
    denied,
  }: {
    allowed: PermissionItem[];
    denied: PermissionItem[];
  }) => (
    <ul className="space-y-1.5 text-xs text-foreground">
      {allowed.map((item) => (
        <li key={`ok-${item.label}`}>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>{item.label}</span>
          </div>
          {item.subItems && (
            <ul className="mt-1 space-y-1 pl-5">
              {item.subItems.map((sub) => (
                <li key={sub} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                  <span>{sub}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
      {denied.map((item) => (
        <li key={`no-${item.label}`} className="flex items-start gap-2">
          <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );

  const content = (
    <div className="space-y-4 rounded-lg border-2 border-dark-orange p-4">
      {isDoctorMode && (
        <p className="text-xs text-muted-foreground">
          {t("dialogs.otherDoctorsWillSee")}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Column 1: what is shared / not shared with the care team */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            {sharedHeading}
          </h4>
          <RowList allowed={sharedList} denied={privateList} />
        </div>

        {/* Column 2: what other practitioners can access */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-2">
            {t(
              "dialogs.otherPractitionersAccess",
              "What other wealth managers can access from your consultation",
            )}
          </h4>
          <RowList allowed={getDoctorSharedItems(t)} denied={getDoctorPrivateItems(t)} />
        </div>
      </div>


      {/* Patient-facing holistic nudge */}
      {isPatientFacing && !isDoctorMode && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Heart className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">{t("dialogs.holisticHealthSharing")}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("dialogs.holisticHealthDescription")}
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
            {t("dialogs.limitingAccessWarning")}
          </AlertDescription>
        </Alert>
      )}

      {onConfirm && (
        <div className="pt-2 border-t border-border">
          <Button className="w-full" onClick={onConfirm}>
            {confirmLabel || t("dialogs.iUnderstand")}
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
            {t("dialogs.dataSharing")}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

// Backward-compatible aliases for older imports.
export { getSharedItems as sharedItems, getPrivateItems as privateItems };
