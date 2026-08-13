import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * True when the signed-in doctor is attached to at least one hospital —
 * used to decide whether "My Shifts" belongs in their sidebar.
 */
export function useHospitalAffiliation() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["hospital-affiliation", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [a, b] = await Promise.all([
        supabase
          .from("doctor_hospital_affiliations")
          // Inner-joining the hospital ignores rows pointing at hospitals that
          // no longer exist (stale demo data).
          .select("id, hospitals!inner(id)")
          .eq("doctor_id", user!.id)
          .eq("status", "active")
          .limit(1),
        supabase
          .from("hospital_doctor_affiliations")
          .select("id, hospitals!inner(id)")
          .eq("doctor_id", user!.id)
          .eq("is_active", true)
          .limit(1),
      ]);
      return (a.data?.length ?? 0) > 0 || (b.data?.length ?? 0) > 0;
    },
  });

  return { hasHospitalAffiliation: !!data, loading: isLoading };
}
