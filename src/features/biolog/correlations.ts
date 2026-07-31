import { BiologEntry, BiologPayload } from "./types";

export interface CorrelationDefinition {
  id: string;
  title: string;
  group: string;
  inputVar: string;
  outcomeVars: string[];
  description: string;
  isCustom?: boolean;
}

/**
 * Starter correlations everybody gets. Users can disable these and add their own
 * on the Customise tab — nothing here is hard-wired into the engine.
 */
export const BUILT_IN_CORRELATIONS: CorrelationDefinition[] = [
  {
    id: "energy_pain_food",
    title: "Energy vs Food",
    group: "Diet & physical state",
    inputVar: "food",
    outcomeVars: ["energy"],
    description: "How your stamina tracks with what you ate.",
  },
  {
    id: "allergies_food",
    title: "Allergies vs Food",
    group: "Diet & physical state",
    inputVar: "food",
    outcomeVars: ["allergies"],
    description: "Links the timing of a reaction back to specific meals.",
  },
  {
    id: "energy_mood_meds",
    title: "Energy & Mood vs Medication",
    group: "Diet & physical state",
    inputVar: "medication",
    outcomeVars: ["energy", "stateofmind"],
    description: "Whether your medication or supplements move your baseline.",
  },
  {
    id: "focus_motivation_food",
    title: "Focus & Motivation vs Food",
    group: "Mental & cognitive state",
    inputVar: "food",
    outcomeVars: ["focus", "motivation"],
    description: "Identifies the meals that keep you sharp instead of foggy.",
  },
  {
    id: "motivation_exercise",
    title: "Motivation vs Exercise",
    group: "Mental & cognitive state",
    inputVar: "exercise",
    outcomeVars: ["motivation"],
    description: "Does moving your body make you more driven?",
  },
  {
    id: "motivation_pain",
    title: "Motivation vs Pain",
    group: "Mental & cognitive state",
    inputVar: "joints",
    outcomeVars: ["motivation"],
    description: "How much your physical discomfort drains your drive.",
  },
  {
    id: "sleep_exercise",
    title: "Sleep vs Exercise",
    group: "Exercise & result",
    inputVar: "exercise",
    outcomeVars: ["sleep"],
    description: "Whether training days give you better rest.",
  },
  {
    id: "mood_energy_exercise",
    title: "Mood & Energy vs Exercise",
    group: "Exercise & result",
    inputVar: "exercise",
    outcomeVars: ["stateofmind", "energy"],
    description: "The long-term effect of regular movement on how you feel.",
  },
];

const payloadOf = (entry: BiologEntry): BiologPayload =>
  (entry.payload ?? {}) as BiologPayload;

/** Numeric value for an outcome variable on a given day, or null when unlogged. */
export function getValue(entry: BiologEntry, key: string): number | null {
  const payload = payloadOf(entry);

  if (key === "performance") {
    const perfs = (payload.exercises ?? [])
      .map((e) => e.performance)
      .filter((p): p is number => typeof p === "number");
    return perfs.length ? perfs.reduce((a, b) => a + b, 0) / perfs.length : null;
  }

  const val = payload.ratings?.[key];
  return typeof val === "number" ? val : null;
}

/** Was the "input" present on this day? Supports a comma-separated list of variables (matches if any are present). */
export function hasInput(entry: BiologEntry, inputVar: string): boolean {
  if (inputVar.includes(",")) {
    return inputVar.split(",").some((v) => hasInput(entry, v.trim()));
  }

  const payload = payloadOf(entry);

  if (inputVar === "food") {
    return (payload.meals ?? []).some((m) => (m.foods?.length ?? 0) > 0);
  }
  if (inputVar === "exercise") {
    return (payload.exercises ?? []).length > 0;
  }
  if (inputVar === "medication") {
    return (payload.medications ?? []).some((m) => m.taken);
  }
  if (inputVar.startsWith("food:")) {
    const food = inputVar.slice(5).toLowerCase();
    return (payload.meals ?? []).some((m) =>
      (m.foods ?? []).some((f) => f.toLowerCase() === food),
    );
  }
  if (inputVar.startsWith("exercise:")) {
    const name = inputVar.slice(9).toLowerCase();
    return (payload.exercises ?? []).some((e) => e.name?.toLowerCase() === name);
  }
  if (inputVar.startsWith("medication:")) {
    const label = inputVar.slice(11).toLowerCase();
    return (payload.medications ?? []).some(
      (m) => m.taken && m.label?.toLowerCase() === label,
    );
  }

  // A rating used as an input counts as "present" on high days.
  const val = getValue(entry, inputVar);
  return val != null && val >= 6;
}

const LABELS: Record<string, string> = {
  stateofmind: "State of mind",
  joints: "Pain",
  focus: "Focus",
  energy: "Energy",
  allergies: "Allergy / reaction",
  sleep: "Sleep quality",
  appetite: "Appetite",
  motivation: "Motivation",
  stress: "Stress",
  performance: "Performance",
  food: "Food",
  exercise: "Exercise",
  medication: "Medication",
};

export function friendlyLabel(key: string): string {
  if (key.includes(",")) {
    return key.split(",").map((k) => friendlyLabel(k.trim())).join(" or ");
  }
  if (key.includes(":")) {
    const [prefix, value] = key.split(":");
    return `${value} (${LABELS[prefix] ?? prefix})`;
  }
  return LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

export interface InsightResult {
  /** Human-readable sentences, one per outcome variable. */
  lines: string[];
  /** Strongest absolute percentage change found, used for sorting. */
  strength: number;
  /** True when there simply isn't enough logged data yet. */
  insufficient: boolean;
  daysWith: number;
  daysWithout: number;
}

export function computeInsight(
  entries: BiologEntry[],
  corr: Pick<CorrelationDefinition, "inputVar" | "outcomeVars">,
): InsightResult {
  const base: InsightResult = {
    lines: [],
    strength: 0,
    insufficient: true,
    daysWith: 0,
    daysWithout: 0,
  };

  if (entries.length < 3) {
    return { ...base, lines: ["Not enough data yet — keep checking in."] };
  }

  const withInput = entries.filter((e) => hasInput(e, corr.inputVar));
  const withoutInput = entries.filter((e) => !hasInput(e, corr.inputVar));

  base.daysWith = withInput.length;
  base.daysWithout = withoutInput.length;

  if (withInput.length < 2 || withoutInput.length < 2) {
    return { ...base, lines: ["Not enough days to compare yet."] };
  }

  const lines: string[] = [];
  let strength = 0;

  for (const outcomeKey of corr.outcomeVars) {
    const valsWith = withInput
      .map((e) => getValue(e, outcomeKey))
      .filter((v): v is number => v != null);
    const valsWithout = withoutInput
      .map((e) => getValue(e, outcomeKey))
      .filter((v): v is number => v != null);

    if (!valsWith.length || !valsWithout.length) continue;

    const avgWith = valsWith.reduce((a, b) => a + b, 0) / valsWith.length;
    const avgWithout = valsWithout.reduce((a, b) => a + b, 0) / valsWithout.length;
    if (avgWithout === 0) continue;

    const pctChange = Math.round(((avgWith - avgWithout) / avgWithout) * 100);
    strength = Math.max(strength, Math.abs(pctChange));

    const label = friendlyLabel(outcomeKey);
    const inputLabel = friendlyLabel(corr.inputVar);

    if (Math.abs(pctChange) < 5) {
      lines.push(`${label} shows no significant change with ${inputLabel}.`);
    } else if (pctChange > 0) {
      lines.push(`${label} is ${pctChange}% higher on ${inputLabel} days.`);
    } else {
      lines.push(`${label} is ${Math.abs(pctChange)}% lower on ${inputLabel} days.`);
    }
  }

  if (!lines.length) {
    return { ...base, lines: ["Not enough outcome data logged yet."] };
  }

  return { lines, strength, insufficient: false, daysWith: base.daysWith, daysWithout: base.daysWithout };
}
