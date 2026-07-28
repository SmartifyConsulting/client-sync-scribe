/**
 * Shared constants and helpers for hospital ward / inpatient management.
 */

export const WARD_TYPES = [
  { value: "general", label: "General" },
  { value: "icu", label: "ICU" },
  { value: "maternity", label: "Maternity" },
  { value: "paediatric", label: "Paediatric" },
  { value: "surgical", label: "Surgical" },
  { value: "other", label: "Other" },
] as const;

export const SHIFT_TYPES = [
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
  { value: "on_call", label: "On-Call" },
] as const;

export const CARE_TASKS = [
  "Vitals rounds",
  "Medication administration",
  "Wound care",
  "Observation",
  "Mobility assistance",
  "Feeding / hydration",
  "Pre-op prep",
  "Post-op monitoring",
] as const;

export const CARE_ROLES = [
  { value: "primary", label: "Primary Nurse" },
  { value: "support", label: "Support" },
  { value: "specialist", label: "Specialist" },
] as const;

export const ACTIVITY_ACTIONS = [
  { value: "vitals_check", label: "Vitals Check" },
  { value: "medication", label: "Medication Administered" },
  { value: "consultation", label: "Doctor Consultation" },
  { value: "nursing_care", label: "Nursing Care" },
  { value: "note", label: "Note" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  admission: "Admission",
  discharge: "Discharge",
  ward_transfer: "Ward Transfer",
  doctor_assignment: "Doctor Assignment",
  nurse_assignment: "Nurse Assignment",
  shift_change: "Shift Change",
  ambulance_dropoff: "Ambulance Drop-off",
  ambulance_pickup: "Ambulance Pickup",
  vitals_check: "Vitals Check",
  medication: "Medication Administered",
  consultation: "Doctor Consultation",
  nursing_care: "Nursing Care",
  note: "Note",
};

export const actionLabel = (action: string) =>
  ACTION_LABELS[action] ?? action.replace(/_/g, " ");

export const wardTypeLabel = (type: string | null | undefined) =>
  WARD_TYPES.find((w) => w.value === type)?.label ?? "General";

/** Deterministic accent colour per ward so the occupancy bars stay stable. */
const WARD_BAR_COLORS = [
  "bg-[hsl(14_82%_54%)]",
  "bg-[hsl(214_88%_54%)]",
  "bg-[hsl(160_72%_38%)]",
  "bg-[hsl(258_70%_62%)]",
  "bg-[hsl(38_92%_50%)]",
  "bg-[hsl(190_78%_42%)]",
];

export const wardBarColor = (index: number) =>
  WARD_BAR_COLORS[index % WARD_BAR_COLORS.length];

export const ADMISSION_STATUSES = ["admitted", "transferred", "discharged"] as const;

export function shiftIsLive(shift: { clocked_in_at: string | null; clocked_out_at: string | null }) {
  return !!shift.clocked_in_at && !shift.clocked_out_at;
}

export function formatTimeRange(startsAt: string, endsAt: string) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${fmt(startsAt)} – ${fmt(endsAt)}`;
}
