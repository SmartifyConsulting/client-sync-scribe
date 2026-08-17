import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type NurseWardAssignment = {
  nurseId: string;
  nurseName: string;
  hospitalId: string;
  hospitalName: string | null;
  wardId: string | null;
  wardName: string | null;
};

/**
 * The hospital and ward the signed-in nurse is rostered to. A nurse only ever
 * works one ward, and both the UI and the database policies scope her patient
 * access to it.
 */
export function useNurseWard() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<NurseWardAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setAssignment(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("hospital_nurses" as any)
        .select("id, full_name, hospital_id, ward_id")
        .eq("linked_user_id", user.id)
        .limit(1)
        .maybeSingle();

      const row = data as any;
      if (!row) {
        if (!cancelled) {
          setAssignment(null);
          setLoading(false);
        }
        return;
      }

      const [{ data: hospital }, wardRes] = await Promise.all([
        supabase
          .from("holarchelp_hospitals" as any)
          .select("name")
          .eq("id", row.hospital_id)
          .maybeSingle(),
        row.ward_id
          ? supabase.from("hospital_wards" as any).select("name").eq("id", row.ward_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

      if (cancelled) return;
      setAssignment({
        nurseId: row.id,
        nurseName: row.full_name,
        hospitalId: row.hospital_id,
        hospitalName: (hospital as any)?.name ?? null,
        wardId: row.ward_id ?? null,
        wardName: (wardRes as any)?.data?.name ?? null,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { assignment, loading };
}
