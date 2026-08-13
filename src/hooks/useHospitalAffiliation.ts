import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * True when the signed-in doctor is attached to at least one hospital that
 * still exists — used to decide whether "My Shifts" belongs in their sidebar.
 * Rows pointing at deleted hospitals (stale demo data) are ignored.
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
          .select("hospital_id")
          .eq("doctor_id", user!.id)
          .eq("status", "active"),
        supabase
          .from("hospital_doctor_affiliations")
          .select("hospital_id")
          .eq("doctor_id", user!.id)
          .eq("is_active", true),
      ]);

      const hospitalIds = [
        ...(a.data ?? []).map((r: { hospital_id: string | null }) => r.hospital_id),
        ...(b.data ?? []).map((r: { hospital_id: string | null }) => r.hospital_id),
      ].filter((id): id is string => !!id);

      if (hospitalIds.length === 0) return false;

      const { data: hospitals } = await supabase
        .from("holarchelp_hospitals")
        .select("id")
        .in("id", hospitalIds as string[])
        .limit(1);

      return ((hospitals as { id: string }[] | null)?.length ?? 0) > 0;
    },
  });

  return { hasHospitalAffiliation: !!data, loading: isLoading };
}
