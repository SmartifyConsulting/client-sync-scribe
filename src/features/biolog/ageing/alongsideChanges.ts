/**
 * Compares Biolog daily data across the interval between the two most recent
 * biological-age assessments. Strictly associative — nothing here implies cause.
 */

import type { BiologEntry } from "../types";

export interface AlongsideChange {
  label: string;
  detail: string;
  direction: "positive" | "watch";
}

interface Aggregates {
  count: number;
  exerciseDays: number;
  loggedDays: number;
  averages: Record<string, number>;
  medicationTaken: number;
  medicationTotal: number;
  weight: number | null;
}

function aggregate(entries: BiologEntry[]): Aggregates {
  const ratingTotals: Record<string, { sum: number; n: number }> = {};
  let exerciseDays = 0;
  let medicationTaken = 0;
  let medicationTotal = 0;
  const weights: number[] = [];

  for (const e of entries) {
    const p = e.payload || ({} as BiologEntry["payload"]);
    for (const [key, value] of Object.entries(p.ratings || {})) {
      if (typeof value !== "number") continue;
      ratingTotals[key] ||= { sum: 0, n: 0 };
      ratingTotals[key].sum += value;
      ratingTotals[key].n += 1;
    }
    if ((p.exercises || []).length > 0) exerciseDays += 1;
    for (const m of p.medications || []) {
      medicationTotal += 1;
      if (m.taken) medicationTaken += 1;
    }
    if (typeof p.weight === "number") weights.push(p.weight);
  }

  const averages: Record<string, number> = {};
  for (const [key, v] of Object.entries(ratingTotals)) averages[key] = v.sum / v.n;

  return {
    count: entries.length,
    exerciseDays,
    loggedDays: entries.length,
    averages,
    medicationTaken,
    medicationTotal,
    weight: weights.length ? weights[weights.length - 1] : null,
  };
}

const RATING_LABELS: Record<string, string> = {
  energy: "Energy",
  sleep: "Sleep quality",
  stateofmind: "State of mind",
  stress: "Stress",
  focus: "Focus",
  motivation: "Motivation",
  joints: "Pain",
};

/** Ratings where a HIGHER score is the less desirable direction. */
const INVERTED = new Set(["stress", "joints"]);

export function computeAlongsideChanges(
  entries: BiologEntry[],
  fromDate: string,
  toDate: string,
  minEntries: number,
): { positive: AlongsideChange[]; watch: AlongsideChange[]; hasEnoughData: boolean } {
  const current = entries.filter((e) => e.entry_date > fromDate && e.entry_date <= toDate);
  const priorWindowStart = new Date(fromDate);
  const spanDays = Math.max(
    1,
    Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000),
  );
  priorWindowStart.setDate(priorWindowStart.getDate() - spanDays);
  const prior = entries.filter(
    (e) => e.entry_date > priorWindowStart.toISOString().slice(0, 10) && e.entry_date <= fromDate,
  );

  if (current.length < minEntries || prior.length < minEntries) {
    return { positive: [], watch: [], hasEnoughData: false };
  }

  const a = aggregate(prior);
  const b = aggregate(current);
  const positive: AlongsideChange[] = [];
  const watch: AlongsideChange[] = [];

  const push = (label: string, delta: number, unit: string, betterWhenUp: boolean) => {
    const improved = betterWhenUp ? delta > 0 : delta < 0;
    const change = `${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(1)}${unit}`;
    const entry: AlongsideChange = {
      label,
      detail: improved
        ? `${change} over this interval — associated with the period covered by your latest assessment`
        : `${change} over this interval — this coincided with your latest assessment period`,
      direction: improved ? "positive" : "watch",
    };
    (improved ? positive : watch).push(entry);
  };

  for (const [key, label] of Object.entries(RATING_LABELS)) {
    if (a.averages[key] === undefined || b.averages[key] === undefined) continue;
    const delta = b.averages[key] - a.averages[key];
    if (Math.abs(delta) < 0.3) continue;
    push(label, delta, "", !INVERTED.has(key));
  }

  const exerciseRateA = a.exerciseDays / a.count;
  const exerciseRateB = b.exerciseDays / b.count;
  if (Math.abs(exerciseRateB - exerciseRateA) >= 0.1) {
    push("Exercise days", (exerciseRateB - exerciseRateA) * 100, "%", true);
  }

  if (a.medicationTotal > 0 && b.medicationTotal > 0) {
    const adhA = (a.medicationTaken / a.medicationTotal) * 100;
    const adhB = (b.medicationTaken / b.medicationTotal) * 100;
    if (Math.abs(adhB - adhA) >= 5) push("Medication adherence", adhB - adhA, "%", true);
  }

  if (a.weight !== null && b.weight !== null && Math.abs(b.weight - a.weight) >= 1) {
    const delta = b.weight - a.weight;
    (Math.abs(delta) >= 5 ? watch : positive).push({
      label: "Body weight",
      detail: `${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(1)} kg over this interval`,
      direction: Math.abs(delta) >= 5 ? "watch" : "positive",
    });
  }

  return { positive, watch, hasEnoughData: positive.length + watch.length > 0 };
}
