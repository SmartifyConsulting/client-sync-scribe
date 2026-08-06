import { useEffect, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TestResultsPanel } from "@/modules/holarchelp/components/TestResultsPanel";

/** Same TestResultsPanel component the hospital's bedside chart uses under
 *  Overview → Test Results, so patients and hospital staff see identical
 *  data/formatting for the same lab results. */
export default function PatientLabResults() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("patients")
        .select("id")
        .eq("patient_user_id", user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setPatientId(data?.id ?? null);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Lab Results</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : patientId ? (
        <TestResultsPanel patientId={patientId} />
      ) : (
        <p className="text-sm text-muted-foreground">No patient record found for your account yet.</p>
      )}
    </div>
  );
}
