import { useQuery } from "@tanstack/react-query";
import { Wallet as Pill, Video, Camera, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Prescription {
  id: string;
  medication: string;
  dosage: string | null;
  frequency: string | null;
  status: string;
}

interface PillRef {
  prescription_id: string;
  reference_image_url: string | null;
  baseline_pattern_summary: string | null;
  intake_method: string | null;
}

interface Props {
  patientId: string;
  onTakeMedication: (rxId: string) => void;
}

export function TodaysMedicationsCard({ patientId, onTakeMedication }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ["chronic-prescriptions", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("id, medication, dosage, frequency, status")
        .eq("patient_id", patientId)
        .eq("status", "active");
      if (error) throw error;
      return (data || []) as Prescription[];
    },
    enabled: !!patientId,
  });

  const { data: pillRefs = [] } = useQuery({
    queryKey: ["pill-references", patientId, prescriptions.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (!prescriptions.length) return [] as PillRef[];
      const { data, error } = await supabase
        .from("prescription_pill_references")
        .select("prescription_id, reference_image_url, baseline_pattern_summary, intake_method")
        .in("prescription_id", prescriptions.map((p) => p.id));
      if (error) throw error;
      return (data || []) as PillRef[];
    },
    enabled: prescriptions.length > 0,
  });

  const { data: takenToday = [] } = useQuery({
    queryKey: ["adherence-today", patientId, today, prescriptions.map((p) => p.id).join(",")],
    queryFn: async () => {
      if (!prescriptions.length) return [] as { prescription_id: string; status: string; taken_at: string | null }[];
      const { data } = await supabase
        .from("medication_adherence")
        .select("prescription_id, status, taken_at")
        .eq("patient_id", patientId)
        .eq("scheduled_date", today)
        .in("prescription_id", prescriptions.map((p) => p.id));
      return (data ?? []) as any;
    },
    enabled: prescriptions.length > 0,
  });

  if (isLoading) return null;

  const hasBaseline = (rxId: string) => {
    const ref = pillRefs.find((r) => r.prescription_id === rxId);
    return !!(ref && ref.intake_method && ref.baseline_pattern_summary && ref.reference_image_url);
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pill className="h-5 w-5 text-primary" />
          Today's Medications
        </CardTitle>
        <CardDescription>Record proof to earn your daily Vulas</CardDescription>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No active chronic medications. Ask your doctor to add one.
          </p>
        ) : (
          <div className="space-y-2">
            {prescriptions.map((rx) => {
              const baseline = hasBaseline(rx.id);
              const dosage = rx.dosage?.trim() || "—";
              const frequency = rx.frequency?.trim() || "once daily";
              const taken = takenToday.find((t) => t.prescription_id === rx.id && t.status !== "pending");
              return (
                <div
                  key={rx.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{rx.medication}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {dosage} · {frequency}
                    </p>
                    {taken ? (
                      <p className="text-xs text-primary mt-1">
                        ✅ Already taken today{taken.taken_at ? ` at ${new Date(taken.taken_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </p>
                    ) : (
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">Active</Badge>
                        <Badge variant="outline" className="text-xs px-1.5 py-0">Chronic</Badge>
                      </div>
                    )}
                  </div>
                  {!taken && (
                    <Button size="sm" onClick={() => onTakeMedication(rx.id)} className="shrink-0 gap-1">
                      {baseline ? (<><Video className="h-3.5 w-3.5" />Take</>) : (<><Camera className="h-3.5 w-3.5" />Set up</>)}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
