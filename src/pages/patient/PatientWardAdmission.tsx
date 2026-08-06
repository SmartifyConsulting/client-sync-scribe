import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdmittedPatientChart } from "@/modules/holarchelp/components/AdmittedPatientChart";

/**
 * Patient-facing view of a ward admission — renders the EXACT SAME bedside
 * chart the hospital sees (AdmittedPatientChart), just reached from the
 * patient's own "My Admissions" list instead of the provider console. The
 * chart itself has no edit controls, so this is inherently read-only.
 */
export default function PatientWardAdmission() {
  const { incidentId } = useParams<{ incidentId: string }>();
  const { user } = useAuth();
  const [incident, setIncident] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!incidentId || !user) return;
    let cancelled = false;
    supabase
      .from("holarchelp_incidents" as any)
      .select("*")
      .eq("id", incidentId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const row = (data as any) ?? null;
        // Only the patient this admission belongs to may view it here.
        if (!row || row.user_id !== user.id) {
          setForbidden(true);
        } else {
          setIncident(row);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [incidentId, user]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Link to="/patient/admissions" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to My Admissions
      </Link>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : forbidden || !incidentId ? (
        <p className="text-sm text-muted-foreground">This admission record isn't available.</p>
      ) : (
        <AdmittedPatientChart incidentId={incidentId} incident={incident} />
      )}
    </div>
  );
}
