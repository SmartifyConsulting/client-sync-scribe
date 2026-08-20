import { usePatientContext, type PatientContext } from "../hooks/usePatientContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Activity,
  Pill,
  Beaker,
  ImageIcon,
  History,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface PatientContextPanelProps {
  patientUserId: string | null;
  admissionId?: string;
  className?: string;
}

/**
 * Patient Context Panel for ER staff
 * Displays medical history, allergies, medications, labs, and imaging
 */
export function PatientContextPanel({
  patientUserId,
  admissionId,
  className,
}: PatientContextPanelProps) {
  const { context, loading, error, getCriticalAllergies, getAbnormalLabs } =
    usePatientContext({
      patientUserId,
      enabled: !!patientUserId,
    });

  if (!patientUserId) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No patient selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Patient Context</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!context) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No patient data available
      </div>
    );
  }

  const criticalAllergies = getCriticalAllergies();
  const abnormalLabs = getAbnormalLabs();

  return (
    <div className={cn("space-y-4", className)}>
      {/* CRITICAL ALERTS */}
      {criticalAllergies.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive text-base font-bold">
            🔴 CRITICAL ALLERGIES
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-1">
              {criticalAllergies.map((allergy) => (
                <p key={allergy.id} className="text-destructive font-semibold">
                  {allergy.allergen} - {allergy.reaction}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* TABS */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs">
            Overview
          </TabsTrigger>
          <TabsTrigger value="medications" className="text-xs">
            Meds
          </TabsTrigger>
          <TabsTrigger value="labs" className="text-xs">
            Labs
          </TabsTrigger>
          <TabsTrigger value="imaging" className="text-xs">
            Imaging
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs">
            History
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Allergies Summary */}
          {context.allergies.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Allergies ({context.allergies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {context.allergies.map((allergy) => (
                  <div
                    key={allergy.id}
                    className="flex items-start gap-2 p-2 rounded border"
                  >
                    <Badge
                      variant={
                        allergy.severity === "severe"
                          ? "destructive"
                          : "secondary"
                      }
                      className="mt-0.5"
                    >
                      {allergy.severity}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{allergy.allergen}</p>
                      <p className="text-xs text-muted-foreground">
                        {allergy.reaction}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Active Medications */}
          {context.current_medications.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Pill className="h-4 w-4" />
                  Current Medications ({context.current_medications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {context.current_medications.slice(0, 3).map((med) => (
                  <div key={med.id} className="text-xs p-2 bg-muted rounded">
                    <p className="font-semibold">{med.medication}</p>
                    <p className="text-muted-foreground">
                      {med.dosage} • {med.frequency}
                    </p>
                    {med.pharmacy && (
                      <p className="text-muted-foreground text-[11px] mt-1">
                        🏪 {med.pharmacy}
                      </p>
                    )}
                  </div>
                ))}
                {context.current_medications.length > 3 && (
                  <p className="text-xs text-muted-foreground italic">
                    +{context.current_medications.length - 3} more medications
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Abnormal Labs Alert */}
          {abnormalLabs.length > 0 && (
            <Card className="border-warning/50 bg-warning/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-warning">
                  <Beaker className="h-4 w-4" />
                  ⚠️ Abnormal Lab Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {abnormalLabs.slice(0, 3).map((lab) => (
                  <div key={lab.id} className="text-xs p-2 bg-white rounded">
                    <p className="font-semibold">{lab.test}</p>
                    <p className="text-warning">
                      {lab.value} {lab.unit} (Normal: {lab.normal_min}-
                      {lab.normal_max})
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-1">
                      {format(new Date(lab.date), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Medical History */}
          {context.medical_history.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Medical History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {context.medical_history.map((history) => (
                  <div key={history.id} className="text-xs p-2 bg-muted rounded">
                    <p className="font-semibold">{history.condition}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {history.status}
                      </Badge>
                      {history.diagnosed_date && (
                        <span className="text-muted-foreground">
                          {format(new Date(history.diagnosed_date), "MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* MEDICATIONS TAB */}
        <TabsContent value="medications" className="space-y-4">
          {context.current_medications.length > 0 ? (
            <div className="space-y-2">
              {context.current_medications.map((med) => (
                <Card key={med.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{med.medication}</p>
                        <p className="text-xs text-muted-foreground">
                          {med.dosage} • {med.route} • {med.frequency}
                        </p>
                      </div>
                      <Badge variant={med.status === "active" ? "default" : "outline"}>
                        {med.status}
                      </Badge>
                    </div>
                    {med.indication && (
                      <p className="text-xs text-muted-foreground mb-2">
                        <strong>Indication:</strong> {med.indication}
                      </p>
                    )}
                    {med.pharmacy && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Pharmacy:</strong> {med.pharmacy}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No medications found
            </p>
          )}
        </TabsContent>

        {/* LABS TAB */}
        <TabsContent value="labs" className="space-y-4">
          {context.recent_labs.length > 0 ? (
            <div className="space-y-2">
              {context.recent_labs.map((lab) => (
                <Card
                  key={lab.id}
                  className={lab.status === "critical" ? "border-destructive/50 bg-destructive/5" : ""}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{lab.test}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lab.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge
                        variant={
                          lab.status === "abnormal"
                            ? "secondary"
                            : lab.status === "critical"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {lab.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-mono mb-1">
                      <strong>{lab.value}</strong> {lab.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Normal: {lab.normal_min}-{lab.normal_max} {lab.unit}
                    </p>
                    {lab.facility && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Lab: {lab.facility}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No lab results found
            </p>
          )}
        </TabsContent>

        {/* IMAGING TAB */}
        <TabsContent value="imaging" className="space-y-4">
          {context.recent_imaging.length > 0 ? (
            <div className="space-y-2">
              {context.recent_imaging.map((img) => (
                <Card key={img.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          {img.type}
                          {img.region && ` - ${img.region}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(img.date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="outline">Reviewed</Badge>
                    </div>
                    {img.findings && (
                      <p className="text-xs mb-2 p-2 bg-muted rounded">
                        {img.findings}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {img.dicom_url && (
                        <a
                          href={img.dicom_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          [View DICOM]
                        </a>
                      )}
                      {img.report_url && (
                        <a
                          href={img.report_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          [View Report]
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No imaging found
            </p>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          {context.medical_history.length > 0 ? (
            <div className="space-y-2">
              {context.medical_history.map((history) => (
                <Card key={history.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">
                          {history.condition}
                        </p>
                        {history.diagnosed_date && (
                          <p className="text-xs text-muted-foreground">
                            Diagnosed: {format(new Date(history.diagnosed_date), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{history.status}</Badge>
                    </div>
                    {history.severity && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Severity: {history.severity}
                      </p>
                    )}
                    {history.notes && (
                      <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                        {history.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No medical history found
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
