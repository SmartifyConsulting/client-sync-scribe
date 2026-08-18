import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeartHandshake } from "lucide-react";
import { RateNurseControl } from "@/components/admissions/RateNurseControl";

type NurseAssignment = {
  id: string;
  nurse_id: string | null;
  nurse_name: string;
  care_role: string;
};

/** Attending nurses for a ward admission, with a rate-and-award control for
 *  patients to recognise good care — used on the patient's own read-only
 *  view of their bedside chart. */
export function AdmissionCareTeam({ admissionId }: { admissionId: string | null | undefined }) {
  const [nurses, setNurses] = useState<NurseAssignment[]>([]);

  useEffect(() => {
    if (!admissionId) { setNurses([]); return; }
    let cancelled = false;
    supabase
      .from("hospital_nurse_assignments")
      .select("id, nurse_id, nurse_name, care_role")
      .eq("admission_id", admissionId)
      .is("released_at", null)
      .then(({ data }) => {
        if (!cancelled) setNurses(((data as any) ?? []) as NurseAssignment[]);
      });
    return () => { cancelled = true; };
  }, [admissionId]);

  if (!admissionId || !nurses.length) return null;

  return (
    <div className="rounded-xl border border-primary bg-card p-4 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <HeartHandshake className="h-3.5 w-3.5" /> Your Care Team
      </p>
      <div className="space-y-3">
        {nurses.map((n) => (
          <div key={n.id} className="rounded-lg bg-muted/30 p-3">
            <p className="text-sm font-semibold text-foreground">{n.nurse_name}</p>
            <p className="text-xs text-muted-foreground capitalize mb-1.5">{n.care_role?.replace(/_/g, " ") || "Nurse"}</p>
            <RateNurseControl
              admissionId={admissionId}
              recordTable="hospital_nurse_assignments"
              recordId={n.id}
              nurseId={n.nurse_id}
              nurseName={n.nurse_name}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
