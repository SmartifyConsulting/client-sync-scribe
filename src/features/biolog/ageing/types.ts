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
  markers?: AgeingMarkers | null;
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

/** Supporting clinical markers captured alongside an epigenetic-age result. */
export type AgeingMarkers = Record<string, string>;

export interface AgeingMarkerField {
  key: string;
  label: string;
  unit?: string;
  reflects: string;
}

export interface AgeingMarkerGroup {
  title: string;
  reflects: string;
  fields: AgeingMarkerField[];
}

export const AGEING_MARKER_GROUPS: AgeingMarkerGroup[] = [
  {
    title: "HbA1c",
    reflects: "Long-term blood glucose / metabolic health",
    fields: [{ key: "hba1c", label: "HbA1c", unit: "%", reflects: "Long-term blood glucose" }],
  },
  {
    title: "Lipid panel",
    reflects: "Cardiovascular / metabolic risk",
    fields: [
      { key: "total_cholesterol", label: "Total cholesterol", unit: "mmol/L", reflects: "Cardiovascular risk" },
      { key: "ldl", label: "LDL", unit: "mmol/L", reflects: "Cardiovascular risk" },
      { key: "hdl", label: "HDL", unit: "mmol/L", reflects: "Cardiovascular risk" },
      { key: "triglycerides", label: "Triglycerides", unit: "mmol/L", reflects: "Metabolic risk" },
    ],
  },
  {
    title: "hs-CRP",
    reflects: "Systemic inflammation",
    fields: [{ key: "hs_crp", label: "hs-CRP", unit: "mg/L", reflects: "Systemic inflammation" }],
  },
  {
    title: "Blood pressure",
    reflects: "Cardiovascular health",
    fields: [
      { key: "bp_systolic", label: "Systolic", unit: "mmHg", reflects: "Cardiovascular health" },
      { key: "bp_diastolic", label: "Diastolic", unit: "mmHg", reflects: "Cardiovascular health" },
    ],
  },
  {
    title: "Kidney function",
    reflects: "Kidney health",
    fields: [
      { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²", reflects: "Kidney health" },
      { key: "creatinine", label: "Creatinine", unit: "µmol/L", reflects: "Kidney health" },
    ],
  },
  {
    title: "Liver function",
    reflects: "Liver / metabolic health",
    fields: [
      { key: "alt", label: "ALT", unit: "U/L", reflects: "Liver health" },
      { key: "ast", label: "AST", unit: "U/L", reflects: "Liver health" },
      { key: "ggt", label: "GGT", unit: "U/L", reflects: "Liver health" },
    ],
  },
  {
    title: "Full blood count",
    reflects: "General physiological health",
    fields: [
      { key: "haemoglobin", label: "Haemoglobin", unit: "g/dL", reflects: "General physiological health" },
      { key: "white_cell_count", label: "White cell count", unit: "10⁹/L", reflects: "Immune status" },
      { key: "platelets", label: "Platelets", unit: "10⁹/L", reflects: "General physiological health" },
    ],
  },
  {
    title: "Weight + waist circumference",
    reflects: "Body composition / metabolic risk",
    fields: [
      { key: "weight_kg", label: "Weight", unit: "kg", reflects: "Body composition" },
      { key: "waist_cm", label: "Waist circumference", unit: "cm", reflects: "Metabolic risk" },
    ],
  },
  {
    title: "Fitness",
    reflects: "Cardiorespiratory fitness",
    fields: [
      { key: "vo2max", label: "VO₂max or equivalent", unit: "mL/kg/min", reflects: "Cardiorespiratory fitness" },
    ],
  },
];

/** Flat lookup of every marker field, for rendering saved values. */
export const AGEING_MARKER_FIELDS: AgeingMarkerField[] = AGEING_MARKER_GROUPS.flatMap((g) => g.fields);
