import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Lightbulb, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreatmentOption {
  condition: string;
  recommended_meds: string[];
  alternate_options: string[];
  contraindicated_meds: string[];
  evidence_level: string;
  safe_for_patient: boolean;
  blocking_reason: string | null;
}

interface TreatmentSuggestionsProps {
  patientUserId: string | null;
  patientConditions?: string[];
  className?: string;
}

export function TreatmentSuggestions({
  patientUserId,
  patientConditions,
  className,
}: TreatmentSuggestionsProps) {
  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conditions, setConditions] = useState<string[]>(patientConditions || []);

  // Fetch patient conditions if not provided
  useEffect(() => {
    if (patientConditions || !patientUserId) return;

    const fetchConditions = async () => {
      const { data, error: err } = await supabase
        .from("patient_medical_history")
        .select("condition_name")
        .eq("patient_user_id", patientUserId)
        .eq("status", "active");

      if (!err && data) {
        setConditions(data.map((d) => d.condition_name));
      }
    };

    fetchConditions();
  }, [patientUserId, patientConditions]);

  // Fetch treatment options for each condition
  useEffect(() => {
    if (!patientUserId || conditions.length === 0) return;

    const fetchTreatments = async () => {
      setLoading(true);
      setError(null);

      try {
        const treatmentPromises = conditions.map((condition) =>
          supabase.rpc("get_treatment_options", {
            p_patient_id: patientUserId,
            p_condition_name: condition,
          })
        );

        const results = await Promise.all(treatmentPromises);

        const allTreatments: TreatmentOption[] = [];
        results.forEach((result) => {
          if (!result.error && result.data && result.data.length > 0) {
            allTreatments.push(...result.data);
          }
        });

        setTreatments(allTreatments);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTreatments();
  }, [patientUserId, conditions]);

  if (!patientUserId) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        No patient selected
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Treatment Options</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const unsafeTreatments = treatments.filter((t) => !t.safe_for_patient);
  const safeTreatments = treatments.filter((t) => t.safe_for_patient);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Safety Alert */}
      {unsafeTreatments.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-bold">
            ⚠️ Unsafe Treatment Options
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-1">
              {unsafeTreatments.map((treatment, i) => (
                <p key={i} className="text-sm">
                  <strong>{treatment.condition}:</strong> {treatment.blocking_reason}
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Treatment Recommendations */}
      {safeTreatments.length > 0 ? (
        <div className="space-y-3">
          {safeTreatments.map((treatment, i) => (
            <TreatmentCard key={i} treatment={treatment} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-2 py-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <p className="text-sm font-semibold">No Conditions to Treat</p>
              <p className="text-xs text-muted-foreground">
                Patient has no active conditions
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Treatment options verified against patient allergies and interactions
      </p>
    </div>
  );
}

interface TreatmentCardProps {
  treatment: TreatmentOption;
}

function TreatmentCard({ treatment }: TreatmentCardProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              {treatment.condition}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {treatment.evidence_level}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Recommended Medications */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <p className="text-xs font-semibold">Recommended Medications</p>
          </div>
          <div className="space-y-1 pl-6">
            {treatment.recommended_meds.map((med, i) => (
              <div key={i} className="text-xs p-1.5 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded">
                <p className="font-semibold text-green-900 dark:text-green-300">✓ {med}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alternate Options */}
        {treatment.alternate_options.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2">Alternative Options</p>
            <div className="space-y-1 pl-0">
              {treatment.alternate_options.map((med, i) => (
                <div key={i} className="text-xs p-1.5 bg-muted rounded">
                  <p className="text-muted-foreground">• {med}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contraindicated Medications */}
        {treatment.contraindicated_meds.length > 0 && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <p className="text-xs font-semibold text-warning">Contraindicated</p>
            </div>
            <ul className="space-y-1 pl-6">
              {treatment.contraindicated_meds.map((med, i) => (
                <li key={i} className="text-xs text-warning/80">
                  ✗ {med}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
