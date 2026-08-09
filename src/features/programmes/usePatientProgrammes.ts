import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type {
  AdherenceRow,
  ExercisePlan,
  ExercisePlanDay,
  MealPlan,
  MealPlanFood,
  MealSlotInstruction,
  MealSlotItem,
  WeighIn,
} from "./types";
import { VULA_MATRIX } from "./types";

const db = supabase as any;

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Sunday-based start of the week containing `base`, shifted by `weekOffset` weeks. */
export function weekStart(base: Date, weekOffset = 0) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + weekOffset * 7);
  return d;
}

export function weekDays(start: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/* ------------------------------- meal plan ------------------------------- */

export function useMealPlan(patientId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const plan = useQuery({
    queryKey: ["meal-plan", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("meal_plans")
        .select("*")
        .eq("patient_id", patientId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as MealPlan) ?? null;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await db
        .from("meal_plans")
        .insert({ patient_id: patientId, created_by: user?.id, name: "Eating Plan" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meal-plan", patientId] }),
  });

  return { plan: plan.data ?? null, loading: plan.isLoading, createPlan: create };
}

export function useMealPlanFoods(planId?: string) {
  const qc = useQueryClient();
  const key = ["meal-plan-foods", planId];

  const query = useQuery({
    queryKey: key,
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await db
        .from("meal_plan_foods")
        .select("*")
        .eq("plan_id", planId)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data || []) as MealPlanFood[];
    },
  });

  const addFood = useMutation({
    mutationFn: async (input: { food_group: string; name: string; grams: number; energy_kj?: number | null }) => {
      const { error } = await db.from("meal_plan_foods").insert({ ...input, plan_id: planId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateFood = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<MealPlanFood> }) => {
      const { error } = await db.from("meal_plan_foods").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const removeFood = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("meal_plan_foods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { foods: query.data ?? [], loading: query.isLoading, addFood, updateFood, removeFood };
}

export function useMealSlotInstructions(planId?: string) {
  const qc = useQueryClient();
  const key = ["meal-slot-instructions", planId];

  const query = useQuery({
    queryKey: key,
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await db.from("meal_plan_slot_instructions").select("*").eq("plan_id", planId);
      if (error) throw error;
      return (data || []) as MealSlotInstruction[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: {
      slot_key: string;
      instruction_kind: string;
      instruction_text?: string | null;
      target_energy?: number | null;
      energy_unit?: string;
    }) => {
      const { error } = await db.from("meal_plan_slot_instructions").upsert(
        {
          plan_id: planId,
          slot_key: input.slot_key,
          instruction_kind: input.instruction_kind,
          instruction_text: input.instruction_text ?? null,
          target_energy: input.target_energy ?? null,
          energy_unit: input.energy_unit ?? "kJ",
        },
        { onConflict: "plan_id,slot_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { instructions: query.data ?? [], save };
}

export function useMealSlotItems(planId?: string) {
  const qc = useQueryClient();
  const key = ["meal-slot-items", planId];

  const query = useQuery({
    queryKey: key,
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await db.from("meal_plan_slot_items").select("*").eq("plan_id", planId);
      if (error) throw error;
      return (data || []) as MealSlotItem[];
    },
  });

  const addItem = useMutation({
    mutationFn: async (input: {
      day_of_week: number;
      slot_key: string;
      food: MealPlanFood;
      unit_multiplier?: number;
    }) => {
      const { error } = await db.from("meal_plan_slot_items").insert({
        plan_id: planId,
        day_of_week: input.day_of_week,
        slot_key: input.slot_key,
        food_id: input.food.id,
        food_name: input.food.name,
        food_group: input.food.food_group,
        grams: input.food.grams,
        unit_multiplier: input.unit_multiplier ?? 1,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const setMultiplier = useMutation({
    mutationFn: async ({ id, unit_multiplier }: { id: string; unit_multiplier: number }) => {
      const { error } = await db.from("meal_plan_slot_items").update({ unit_multiplier }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("meal_plan_slot_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { items: query.data ?? [], addItem, setMultiplier, removeItem };
}

/* ----------------------------- exercise plan ----------------------------- */

export function useExercisePlan(patientId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const plan = useQuery({
    queryKey: ["exercise-plan", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await db
        .from("exercise_plans")
        .select("*")
        .eq("patient_id", patientId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ExercisePlan) ?? null;
    },
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await db
        .from("exercise_plans")
        .insert({ patient_id: patientId, created_by: user?.id, name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercise-plan", patientId] }),
  });

  return { plan: plan.data ?? null, loading: plan.isLoading, createPlan: create };
}

export function useExercisePlanDays(planId?: string) {
  const qc = useQueryClient();
  const key = ["exercise-plan-days", planId];

  const query = useQuery({
    queryKey: key,
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await db.from("exercise_plan_days").select("*").eq("plan_id", planId);
      if (error) throw error;
      return (data || []) as ExercisePlanDay[];
    },
  });

  const saveDay = useMutation({
    mutationFn: async (input: { day_of_week: number; description: string }) => {
      const { error } = await db
        .from("exercise_plan_days")
        .upsert({ plan_id: planId, ...input }, { onConflict: "plan_id,day_of_week" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { days: query.data ?? [], saveDay };
}

/* ------------------------------- adherence ------------------------------- */

export function useProgrammeAdherence(patientId?: string, from?: string, to?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["programme-adherence", patientId, from, to];

  const query = useQuery({
    queryKey: key,
    enabled: !!patientId && !!from && !!to,
    queryFn: async () => {
      const { data, error } = await db
        .from("programme_adherence")
        .select("*")
        .eq("patient_id", patientId)
        .gte("entry_date", from)
        .lte("entry_date", to);
      if (error) throw error;
      return (data || []) as AdherenceRow[];
    },
  });

  const toggle = useMutation({
    mutationFn: async (input: {
      entry_date: string;
      kind: "meal" | "exercise";
      slot_key?: string;
      existing?: AdherenceRow;
    }) => {
      const slot_key = input.slot_key ?? "day";
      if (input.existing) {
        const { error } = await db.from("programme_adherence").delete().eq("id", input.existing.id);
        if (error) throw error;
        return { awarded: 0 };
      }

      const vulas =
        input.kind === "exercise" ? VULA_MATRIX.exerciseDayTick : VULA_MATRIX.mealSlotTick;

      const { error } = await db.from("programme_adherence").insert({
        patient_id: patientId,
        entry_date: input.entry_date,
        kind: input.kind,
        slot_key,
        completed: true,
        vulas_awarded: vulas,
      });
      if (error) throw error;

      // Vulas land in the shared rewards ledger so the wallet stays the source of truth.
      await db.from("patient_rewards").insert({
        patient_id: patientId,
        reward_type: "programme_adherence",
        visit_category: input.kind === "exercise" ? "exercise_programme" : "eating_plan",
        awarded_by: user?.id,
        lollipops_count: vulas,
      });

      return { awarded: vulas };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["programme-adherence", patientId] });
      qc.invalidateQueries({ queryKey: ["patient-rewards"] });
    },
  });

  return { adherence: query.data ?? [], toggle };
}

/* -------------------------------- weigh-in ------------------------------- */

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
