export type BiologGroup = "physical" | "mental";

export interface BiologSection {
  id: string;
  user_id: string;
  key: string;
  label: string;
  group_name: BiologGroup | string;
  enabled: boolean;
  sort_order: number;
  is_custom: boolean;
}

export interface BiologFood {
  id: string;
  user_id: string;
  name: string;
  category: string;
  serving_size: string | null;
  kilojoules: number | null;
  calories: number | null;
}

export interface BiologExercise {
  id: string;
  user_id: string;
  name: string;
  category: string;
  unit: string;
}

export interface BiologMedication {
  id: string;
  user_id: string;
  label: string;
  dose_amount: number | null;
  dose_unit: string | null;
}

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface EntryMeal {
  slot: MealSlot;
  foods: string[];
  /** Time of day the meal was eaten, e.g. "08:30" — useful for intermittent-fasting tracking. */
  time?: string | null;
}

export interface EntryExercise {
  name: string;
  duration?: number | null;
  /** Legacy 1-10 effort score; still shown as "Effort". */
  performance?: number | null;
  /** 1-10 how hard you pushed. */
  intensity?: number | null;
  /** 1-10 how hard it felt (RPE). */
  effort?: number | null;
  /** Cardio: distance in km. */
  distance?: number | null;
  /** Cardio: average heart rate (bpm). */
  heartRate?: number | null;
  /** Strength: sets / reps / weight in kg. */
  sets?: number | null;
  reps?: number | null;
  weight?: number | null;
  note?: string | null;
}


export interface EntryMedication {
  label: string;
  taken: boolean;
  quantity?: number;
}

/** Everything captured in a single day of the biolog. */
export interface BiologPayload {
  /** section key -> 1..10 rating */
  ratings: Record<string, number>;
  meals: EntryMeal[];
  exercises: EntryExercise[];
  medications: EntryMedication[];
  /** Body weight in kg. */
  weight?: number | null;
}

export interface BiologEntry {
  id: string;
  user_id: string;
  entry_date: string;
  payload: BiologPayload;
  note: string | null;
}

export interface BiologCorrelationRow {
  id: string;
  user_id: string;
  title: string;
  group_name: string;
  input_variable: string;
  outcome_variables: string[];
  enabled: boolean;
  is_custom: boolean;
}

export interface BiologProgramme {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  kind: "diet" | "exercise" | "mixed" | string;
  duration_days: number;
  targets: { label: string; detail?: string }[];
}

export interface BiologProgrammeAssignment {
  id: string;
  programme_id: string;
  patient_user_id: string;
  assigned_by: string;
  start_date: string;
  end_date: string | null;
  status: string;
  programme?: BiologProgramme;
}

export const DEFAULT_SECTIONS: {
  key: string;
  label: string;
  group_name: BiologGroup;
}[] = [
  { key: "weight", label: "Weight", group_name: "physical" },
  { key: "energy", label: "Energy", group_name: "physical" },
  { key: "sleep", label: "Sleep quality", group_name: "physical" },
  { key: "joints", label: "Pain", group_name: "physical" },
  { key: "appetite", label: "Appetite", group_name: "physical" },
  { key: "allergies", label: "Allergy / reaction", group_name: "physical" },
  { key: "stateofmind", label: "State of mind", group_name: "mental" },
  { key: "focus", label: "Focus", group_name: "mental" },
  { key: "motivation", label: "Motivation", group_name: "mental" },
  { key: "stress", label: "Stress", group_name: "mental" },
];

export const EMPTY_PAYLOAD: BiologPayload = {
  ratings: {},
  meals: [],
  exercises: [],
  medications: [],
};

export const MEAL_SLOTS: { slot: MealSlot; label: string }[] = [
  { slot: "breakfast", label: "Breakfast" },
  { slot: "lunch", label: "Lunch" },
  { slot: "dinner", label: "Dinner" },
  { slot: "snack", label: "Snacks" },
];
