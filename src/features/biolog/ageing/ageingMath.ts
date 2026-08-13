/**
 * Pure helpers for the Ageing tab — deltas, pace banding and data quality.
 * The app NEVER calculates a biological age: every value comes from the
 * testing provider and is stored verbatim.
 */

import type { AgeingConfig, BiologicalAgeAssessment } from "./types";

export type PaceBand = "slower" | "around" | "faster";
export type DataQuality = "high" | "moderate" | "limited";
export type TrajectoryState = "improving" | "stable" | "attention" | "unknown";

export function yearsBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

export function daysBetween(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Chronological age in whole years at a given date. */
export function chronologicalAge(dob?: string | null, at: string = new Date().toISOString()): number | null {
  if (!dob) return null;
  const years = yearsBetween(dob, at);
  if (!Number.isFinite(years) || years <= 0 || years > 130) return null;
  return Math.floor(years);
}

/** Newest first. */
export function sortByDateDesc(rows: BiologicalAgeAssessment[]): BiologicalAgeAssessment[] {
  return [...rows].sort((a, b) => b.assessment_date.localeCompare(a.assessment_date));
}

export function latestAssessment(rows: BiologicalAgeAssessment[]): BiologicalAgeAssessment | null {
  return sortByDateDesc(rows)[0] ?? null;
}

export function previousAssessment(rows: BiologicalAgeAssessment[]): BiologicalAgeAssessment | null {
  return sortByDateDesc(rows)[1] ?? null;
}

export function paceBand(pace: number | null | undefined, config: AgeingConfig): PaceBand | null {
  if (pace === null || pace === undefined || !Number.isFinite(pace)) return null;
  if (pace < config.pace_slower_below) return "slower";
  if (pace > config.pace_faster_above) return "faster";
  return "around";
}

export function paceLabel(band: PaceBand | null): string {
  switch (band) {
    case "slower":
      return "Slower than the reference pace";
    case "faster":
      return "Faster than the reference pace";
    case "around":
      return "Around the reference pace";
    default:
      return "Not yet available";
  }
}

/** "3.2 years younger than chronological age" style caption. */
export function ageDifferenceCaption(diff: number | null | undefined): string {
  if (diff === null || diff === undefined || !Number.isFinite(diff)) return "Not yet available";
  const rounded = Math.round(Math.abs(diff) * 10) / 10;
  if (rounded < 0.1) return "Aligned with chronological age";
  return diff < 0
    ? `${rounded} years younger than chronological age`
    : `${rounded} years above chronological age`;
}

export interface QualityResult {
  quality: DataQuality;
  reasons: string[];
}

/**
 * Data quality for a single result, judged on how much comparable history
 * sits behind it — never on the result itself.
 */
export function assessmentQuality(
  assessment: BiologicalAgeAssessment,
  all: BiologicalAgeAssessment[],
  config: AgeingConfig,
): QualityResult {
  const reasons: string[] = [];
  const sorted = sortByDateDesc(all);
  const index = sorted.findIndex((a) => a.id === assessment.id);
  const prior = index >= 0 ? sorted[index + 1] : null;

  if (sorted.length < 2) reasons.push("Single assessment — no comparison available");
  if (prior) {
    const gap = daysBetween(prior.assessment_date, assessment.assessment_date);
    if (gap < config.min_days_between_assessments) reasons.push("Very short interval since the previous assessment");
    if (gap > config.max_days_high_quality) reasons.push("Long interval since the previous assessment");
    if (prior.model_name && assessment.model_name && prior.model_name !== assessment.model_name) {
      reasons.push("Different model/algorithm from the previous assessment");
    }
    if (prior.laboratory_name && assessment.laboratory_name && prior.laboratory_name !== assessment.laboratory_name) {
      reasons.push("Different laboratory from the previous assessment");
    }
  }
  if (!assessment.model_name) reasons.push("Model/algorithm not recorded");

  const quality: DataQuality = reasons.length === 0 ? "high" : reasons.length <= 1 ? "moderate" : "limited";
  return { quality, reasons };
}

/** True when this result is not directly comparable with the one before it. */
export function isMethodTransition(
  assessment: BiologicalAgeAssessment,
  prior: BiologicalAgeAssessment | null,
): boolean {
  if (!prior) return false;
  return (
    (!!prior.model_name && !!assessment.model_name && prior.model_name !== assessment.model_name) ||
    (!!prior.laboratory_name && !!assessment.laboratory_name && prior.laboratory_name !== assessment.laboratory_name)
  );
}

export interface SinceLast {
  biologicalAgeChange: number | null;
  paceChange: number | null;
  intervalDays: number | null;
}

export function sinceLastAssessment(rows: BiologicalAgeAssessment[]): SinceLast | null {
  const latest = latestAssessment(rows);
  const prior = previousAssessment(rows);
  if (!latest || !prior) return null;
  return {
    biologicalAgeChange:
      latest.biological_age !== null && prior.biological_age !== null
        ? Number(latest.biological_age) - Number(prior.biological_age)
        : null,
    paceChange:
      latest.ageing_pace !== null && prior.ageing_pace !== null
        ? Number(latest.ageing_pace) - Number(prior.ageing_pace)
        : null,
    intervalDays: daysBetween(prior.assessment_date, latest.assessment_date),
  };
}

/** Overall trajectory read — deliberately a state, not an invented score. */
export function trajectoryState(rows: BiologicalAgeAssessment[], config: AgeingConfig): TrajectoryState {
  const since = sinceLastAssessment(rows);
  if (!since || since.biologicalAgeChange === null || since.intervalDays === null) return "unknown";
  const years = since.intervalDays / 365.25;
  if (years <= 0) return "unknown";
  // Change in biological age relative to the calendar time that elapsed.
  const relative = since.biologicalAgeChange - years;
  if (relative <= config.healthspan_improving_delta) return "improving";
  if (relative >= config.healthspan_attention_delta) return "attention";
  return "stable";
}

export function trajectoryLabel(state: TrajectoryState): string {
  switch (state) {
    case "improving":
      return "Improving";
    case "attention":
      return "Needs attention";
    case "stable":
      return "Stable";
    default:
      return "Not yet available";
  }
}

export type ChartRange = "6m" | "1y" | "3y" | "all";

export function filterByRange(rows: BiologicalAgeAssessment[], range: ChartRange): BiologicalAgeAssessment[] {
  if (range === "all") return rows;
  const months = range === "6m" ? 6 : range === "1y" ? 12 : 36;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const iso = cutoff.toISOString().slice(0, 10);
  return rows.filter((r) => r.assessment_date >= iso);
}
