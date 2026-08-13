export type AgeingAssessmentType = "dna_methylation" | "clinical" | "other";

export interface BiologicalAgeAssessment {
  id: string;
  patient_user_id: string;
  assessment_date: string;
  chronological_age: number | null;
  biological_age: number | null;
  age_difference: number | null;
  ageing_pace: number | null;
  assessment_type: AgeingAssessmentType | string;
  model_name: string | null;
  provider_name: string | null;
  laboratory_name: string | null;
  sample_type: string | null;
  reference_population: string | null;
  source: string | null;
  report_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgeingConfig {
  id: string;
  pace_slower_below: number;
  pace_faster_above: number;
  healthspan_improving_delta: number;
  healthspan_attention_delta: number;
  min_days_between_assessments: number;
  max_days_high_quality: number;
  min_daily_entries_for_insights: number;
}

export interface AgeingInsightRow {
  id: string;
  patient_user_id: string;
  assessment_id: string | null;
  insight_type: string;
  title: string;
  description: string | null;
  evidence: Record<string, unknown>;
  confidence: string | null;
  status: string;
  generated_at: string;
}

export const DEFAULT_AGEING_CONFIG: AgeingConfig = {
  id: "default",
  pace_slower_below: 0.95,
  pace_faster_above: 1.05,
  healthspan_improving_delta: -0.5,
  healthspan_attention_delta: 0.5,
  min_days_between_assessments: 60,
  max_days_high_quality: 730,
  min_daily_entries_for_insights: 10,
};

/** Validated epigenetic-clock models a lab report can be based on. */
export const AGEING_MODELS = [
  "DunedinPACE",
  "DNAmGrimAge",
  "DNAmPhenoAge",
  "Horvath",
  "Other validated provider",
];

export const SAMPLE_TYPES = ["Blood", "Saliva", "Buccal swab", "Other"];
