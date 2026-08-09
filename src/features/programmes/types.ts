export type FoodGroup = "protein" | "carbohydrate" | "vegetable" | "fat";

export const FOOD_GROUPS: { key: FoodGroup; label: string; badge: string; column: string }[] = [
  {
    key: "protein",
    label: "Proteins",
    badge: "bg-rose-100 text-rose-800 border-rose-200",
    column: "border-rose-200",
  },
  {
    key: "carbohydrate",
    label: "Carbohydrates",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    column: "border-amber-200",
  },
  {
    key: "vegetable",
    label: "Vegetables",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    column: "border-emerald-200",
  },
  {
    key: "fat",
    label: "Fats",
    badge: "bg-sky-100 text-sky-800 border-sky-200",
    column: "border-sky-200",
  },
];

export const foodGroupBadge = (group: string) =>
  FOOD_GROUPS.find((g) => g.key === group)?.badge ?? "bg-muted text-foreground border-border";

/** The five daily eating slots a patient sees. */
export const MEAL_SLOTS: { key: string; label: string }[] = [
  { key: "breakfast", label: "Breakfast" },
  { key: "snack_am", label: "Snack" },
  { key: "lunch", label: "Lunch" },
  { key: "snack_pm", label: "Snack" },
  { key: "dinner", label: "Dinner" },
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Vula reward matrix for programme adherence and weigh-ins. */
export const VULA_MATRIX = {
  /** Per meal slot ticked. */
  mealSlotTick: 1,
  /** Extra for completing every meal slot in a day. */
  mealDayComplete: 2,
  /** Per exercise day ticked. */
  exerciseDayTick: 3,
  /** Per kilogram of weight lost at a doctor weigh-in. */
  perKilogramLost: 50,
} as const;

export const KG_PER_STONE = 6.35029318;

export const kgToStones = (kg: number) => kg / KG_PER_STONE;

export interface MealPlan {
  id: string;
  patient_id: string;
  created_by: string;
  name: string;
  notes: string | null;
  is_active: boolean;
}

export interface MealPlanFood {
  id: string;
  plan_id: string;
  food_group: FoodGroup;
  name: string;
  grams: number;
  energy_kj: number | null;
  sort_order: number;
}

export interface MealSlotInstruction {
  id: string;
  plan_id: string;
  slot_key: string;
  instruction_kind: "choose_one" | "energy_target" | "free";
  instruction_text: string | null;
  target_energy: number | null;
  energy_unit: "kJ" | "kcal";
}

export interface MealSlotItem {
  id: string;
  plan_id: string;
  day_of_week: number;
  slot_key: string;
  food_id: string | null;
  food_name: string;
  food_group: FoodGroup;
  grams: number;
  unit_multiplier: number;
}

export interface ExercisePlan {
  id: string;
  patient_id: string;
  name: string;
  notes: string | null;
  is_active: boolean;
}

export interface ExercisePlanDay {
  id: string;
  plan_id: string;
  day_of_week: number;
  description: string;
}

export interface AdherenceRow {
  id: string;
  patient_id: string;
  entry_date: string;
  kind: "meal" | "exercise";
  slot_key: string;
  completed: boolean;
  vulas_awarded: number;
}

export interface WeighIn {
  id: string;
  patient_id: string;
  weight_kg: number;
  previous_weight_kg: number | null;
  kg_lost: number;
  vulas_awarded: number;
  recorded_at: string;
}
