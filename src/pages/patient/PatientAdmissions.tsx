import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdmissionsView } from "@/features/sessions/admissions/AdmissionsView";

type WardAdmission = {
  incident_id: string;
  ward_name: string | null;
  bed_number: string | null;
  admitted_at: string;
  status: string;
};

export default function PatientAdmissions() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [wardAdmissions, setWardAdmissions] = useState<WardAdmission[]>([]);
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

      // Ward admissions from the ER/hospital flow — same records the
      // hospital's bedside chart is built on, looked up via the incident
      // this patient's own account triggered.
      const { data: admissions } = await supabase
        .from("hospital_inpatient_admissions" as any)
        .select("incident_id, bed_number, admitted_at, status, ward_id, patient_user_id")
        .eq("patient_user_id", user.id)
        .is("discharged_at", null)
        .order("admitted_at", { ascending: false });
      const rows = ((admissions as any) ?? []) as any[];
      const wardIds = Array.from(new Set(rows.map((r) => r.ward_id).filter(Boolean)));
      const wardNames: Record<string, string> = {};
      if (wardIds.length) {
        const { data: wards } = await supabase.from("hospital_wards" as any).select("id, name").in("id", wardIds);
        ((wards as any) ?? []).forEach((w: any) => { wardNames[w.id] = w.name; });
      }
      if (!cancelled) {
        setWardAdmissions(rows.filter((r) => r.incident_id).map((r) => ({
          incident_id: r.incident_id,
          ward_name: r.ward_id ? wardNames[r.ward_id] ?? null : null,
          bed_number: r.bed_number,
          admitted_at: r.admitted_at,
          status: r.status,
        })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BedDouble className="h-5 w-5 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">My Admissions</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {wardAdmissions.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Ward Admissions</h2>
              {wardAdmissions.map((a) => (
                <Link
                  key={a.incident_id}
                  to={`/patient/ward-admission/${a.incident_id}`}
                  className="flex items-center justify-between rounded-xl border-2 border-primary bg-card px-4 py-3 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-foreground">{a.ward_name ?? "Ward"}{a.bed_number ? ` · Bed ${a.bed_number}` : ""}</p>
                    <p className="text-xs text-muted-foreground">Admitted {new Date(a.admitted_at).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary" />
                </Link>
              ))}
            </div>
          )}

          {patientId ? (
            <AdmissionsView patientId={patientId} canEdit />
          ) : (
            <p className="text-sm text-muted-foreground">No patient record found for your account yet.</p>
          )}
        </>
      )}
    </div>
  );
}
