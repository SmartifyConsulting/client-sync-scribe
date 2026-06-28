// Single source of truth derived from the i18n supported-languages list,
// so every "Primary Language" / "Language" picker shows the same options
// as the top-right flag switcher (incl. Igbo, Hausa, Yoruba, Shona, isiZulu, isiXhosa, etc.).
import { SUPPORTED_LANGUAGES } from "@/i18n";

export const LANGUAGES = SUPPORTED_LANGUAGES.map((l) => ({
  code: l.code,
  name: l.name,
}));

export const COMMON_SPECIALTIES = [
  "General Practice",
  "Cardiology",
  "Dentistry",
  "Dermatology",
  "Endocrinology",
  "Gastroenterology",
  "General Surgery",
  "Gynaecology",
  "Neurology",
  "Oncology",
  "Ophthalmology",
  "Orthopaedics",
  "Paediatrics",
  "Psychiatry",
  "Psychology",
  "Radiology",
  "Urology",
  "Physiotherapy",
];
