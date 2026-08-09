import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { WeighIn } from "./types";
import { VULA_MATRIX } from "./types";

const db = supabase as any;

/** Doctor-recorded weigh-ins and the Vulas awarded for weight lost. */
export function useWeighIns(patientId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["patient-weigh-ins", patientId];

  const query = useQuery({
    queryKey: key,
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("patient_weigh_ins")
        .select("*")
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false });
      if (error) throw error;
      return (data || []) as WeighIn[];
    },
  });

  const record = useMutation({
    mutationFn: async (input: { weight_kg: number; awardVulas: boolean }) => {
      const previous = query.data?.[0]?.weight_kg ?? null;
      const kgLost = previous ? Math.max(0, previous - input.weight_kg) : 0;
      const vulas = input.awardVulas ? Math.round(kgLost * VULA_MATRIX.perKilogramLost) : 0;

      const { error } = await db.from("patient_weigh_ins").insert({
        patient_id: patientId,
        recorded_by: user?.id,
        weight_kg: input.weight_kg,
        previous_weight_kg: previous,
        kg_lost: kgLost,
        vulas_awarded: vulas,
      });
      if (error) throw error;

      if (vulas > 0) {
        await db.from("patient_rewards").insert({
          patient_id: patientId,
          reward_type: "weight_loss",
          visit_category: "weigh_in",
          awarded_by: user?.id,
          lollipops_count: vulas,
        });
      }

      return { kgLost, vulas };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["patient-rewards"] });
    },
  });

  return { weighIns: query.data ?? [], latest: query.data?.[0] ?? null, record };
}
