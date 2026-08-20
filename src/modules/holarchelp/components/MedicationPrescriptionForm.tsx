import { useState, useEffect } from "react";
import { useMedicationSafety } from "../hooks/useMedicationSafety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MedicationPrescriptionFormProps {
  patientUserId: string | null;
  patientName?: string;
  onPrescribe?: (medicationName: string) => Promise<void>;
  disabled?: boolean;
}

export function MedicationPrescriptionForm({
  patientUserId,
  patientName,
  onPrescribe,
  disabled,
}: MedicationPrescriptionFormProps) {
  const [medicationName, setMedicationName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [lastCheckedMed, setLastCheckedMed] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { validateMedication, checking } = useMedicationSafety(patientUserId);
  const [safetyResult, setSafetyResult] = useState<any>(null);

  // Auto-check medication when it changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (medicationName.trim() && medicationName !== lastCheckedMed) {
        validateMedication(medicationName).then((result) => {
          setSafetyResult(result);
          setLastCheckedMed(medicationName);
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [medicationName, lastCheckedMed, validateMedication]);

  const handlePrescribe = async () => {
    if (!medicationName.trim()) return;
    if (!safetyResult?.isSafe) return;

    setSubmitting(true);
    try {
      if (onPrescribe) {
        await onPrescribe(medicationName);
        setMedicationName("");
        setDosage("");
        setFrequency("");
        setSafetyResult(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!patientUserId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No patient selected
      </div>
    );
  }

  const isBlocked = safetyResult && !safetyResult.isSafe && safetyResult.blocks?.length > 0;
  const hasWarnings = safetyResult && safetyResult.warnings?.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Prescribe Medication
          </CardTitle>
          {patientName && (
            <p className="text-xs text-muted-foreground mt-1">Patient: {patientName}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold">Medication Name *</label>
            <Input
              value={medicationName}
              onChange={(e) => setMedicationName(e.target.value)}
              placeholder="e.g., Lisinopril, Amoxicillin"
              disabled={disabled || checking}
              className="h-9"
            />
            {checking && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking safety...
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold">Dosage</label>
              <Input
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 10mg"
                disabled={disabled}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold">Frequency</label>
              <Input
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="e.g., daily"
                disabled={disabled}
                className="h-9"
              />
            </div>
          </div>

          {/* Safety Check Results */}
          {safetyResult && (
            <div className="space-y-2">
              {/* BLOCKED - Cannot prescribe */}
              {isBlocked && (
                <Alert className="border-destructive/50 bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <AlertTitle className="text-destructive font-bold">
                    ⛔ PRESCRIPTION BLOCKED
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="space-y-1">
                      {safetyResult.blocks.map((block: string, i: number) => (
                        <p key={i} className="text-sm font-semibold text-destructive">
                          • {block}
                        </p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* WARNINGS - Can prescribe but with caution */}
              {hasWarnings && !isBlocked && (
                <Alert className="border-warning/50 bg-warning/10">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertTitle className="text-warning">⚠️ Safety Warnings</AlertTitle>
                  <AlertDescription className="mt-2">
                    <div className="space-y-1">
                      {safetyResult.warnings.map((warning: string, i: number) => (
                        <p key={i} className="text-xs text-warning">
                          • {warning}
                        </p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* SAFE - No issues */}
              {safetyResult.isSafe && !hasWarnings && (
                <Alert className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700 dark:text-green-300">
                    ✓ Safe to Prescribe
                  </AlertTitle>
                  <AlertDescription className="text-xs text-green-600 dark:text-green-400 mt-1">
                    No allergies or drug interactions detected
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary Badge */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    isBlocked
                      ? "destructive"
                      : hasWarnings
                        ? "secondary"
                        : "outline"
                  }
                  className={cn(
                    isBlocked && "bg-destructive text-white",
                    hasWarnings && "bg-warning text-black"
                  )}
                >
                  {safetyResult.checkSummary}
                </Badge>
              </div>
            </div>
          )}

          <Button
            onClick={handlePrescribe}
            disabled={
              disabled ||
              !medicationName.trim() ||
              !dosage.trim() ||
              !frequency.trim() ||
              isBlocked ||
              checking ||
              !safetyResult ||
              submitting
            }
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Prescribing...
              </>
            ) : (
              "Prescribe Medication"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This form checks for allergies and drug interactions before prescribing
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
