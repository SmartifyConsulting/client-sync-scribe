import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Beaker, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabTemplate {
  condition_name: string;
  recommended_labs: string[];
  urgency: string;
}

interface LabOrderingPanelProps {
  patientUserId: string | null;
  incidentId?: string | null;
  className?: string;
}

export function LabOrderingPanel({
  patientUserId,
  incidentId,
  className,
}: LabOrderingPanelProps) {
  const [templates, setTemplates] = useState<LabTemplate[]>([]);
  const [selectedLabs, setSelectedLabs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<Map<string, number>>(new Map());
  const [orderingLabs, setOrderingLabs] = useState(false);

  useEffect(() => {
    if (!patientUserId) return;

    const fetchLabTemplates = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_recommended_labs", {
          p_patient_id: patientUserId,
        });

        if (!error && data) {
          setTemplates(data);

          // Check for duplicates
          const allLabs = data.flatMap((t: LabTemplate) => t.recommended_labs);
          const dupData = new Map<string, number>();

          allLabs.forEach((lab) => {
            const count = allLabs.filter((l) => l === lab).length;
            if (count > 1) dupData.set(lab, count);
          });

          setDuplicates(dupData);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLabTemplates();
  }, [patientUserId]);

  const handleOrderLabs = async () => {
    if (!patientUserId || selectedLabs.size === 0) return;

    setOrderingLabs(true);
    try {
      const { error } = await supabase.from("patient_lab_orders").insert({
        patient_user_id: patientUserId,
        incident_id: incidentId,
        lab_tests: Array.from(selectedLabs),
        urgency: Array.from(selectedLabs).some((lab) =>
          templates.some(
            (t) => t.urgency === "stat" && t.recommended_labs.includes(lab)
          )
        )
          ? "stat"
          : "routine",
      });

      if (!error) {
        setSelectedLabs(new Set());
        alert("Labs ordered successfully!");
      }
    } finally {
      setOrderingLabs(false);
    }
  };

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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Duplicate Alert */}
      {duplicates.size > 0 && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">⚠️ Duplicate Labs Detected</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-1">
              {Array.from(duplicates.entries()).map(([lab, count]) => (
                <p key={lab} className="text-xs">
                  • {lab}: ordered {count} times in last 24 hours
                </p>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Lab Templates */}
      {templates.length > 0 ? (
        <div className="space-y-3">
          {templates.map((template, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Beaker className="h-4 w-4" />
                    {template.condition_name}
                  </CardTitle>
                  <Badge
                    variant={
                      template.urgency === "stat"
                        ? "destructive"
                        : template.urgency === "urgent"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {template.urgency}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {template.recommended_labs.map((lab) => (
                    <div key={lab} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedLabs.has(lab)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedLabs);
                          if (checked) {
                            newSelected.add(lab);
                          } else {
                            newSelected.delete(lab);
                          }
                          setSelectedLabs(newSelected);
                        }}
                      />
                      <span className="text-xs">
                        {lab}
                        {duplicates.has(lab) && (
                          <Badge
                            variant="outline"
                            className="ml-2 text-[10px] bg-warning/20"
                          >
                            Duplicate
                          </Badge>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={handleOrderLabs}
            disabled={selectedLabs.size === 0 || orderingLabs}
            className="w-full"
          >
            {orderingLabs ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ordering Labs...
              </>
            ) : (
              <>
                <Beaker className="mr-2 h-4 w-4" />
                Order {selectedLabs.size} Lab Tests
              </>
            )}
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No lab templates for this patient's conditions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
