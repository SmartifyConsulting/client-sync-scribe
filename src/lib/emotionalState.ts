/**
 * Holarc emotional language system.
 *
 * The dashboard never leads with raw data. Every card leads with what the
 * information *means* to the person reading it, and only then shows the
 * evidence behind that interpretation.
 *
 * Tone rules:
 *  - quiet, warm, intelligent, reassuring
 *  - never motivational-slogan cheery
 *  - never alarming for normal health variation
 *  - never diagnostic, never an instruction
 */

export type EmotionalState =
  | "good"
  | "stable"
  | "mixed"
  | "catchup"
  | "attention"
  | "caregiver_good"
  | "caregiver_concern"
  | "emergency";

export const EMOTIONAL_HEADLINE: Record<EmotionalState, string> = {
  good: "You're doing well",
  stable: "Things look steady",
  mixed: "A few things are changing",
  catchup: "There's a little to catch up on",
  attention: "Something may need your attention",
  caregiver_good: "They're okay",
  caregiver_concern: "Someone may need you",
  emergency: "Help is on the way",
};

/** The second sentence of the greeting, chosen from the patient's real state. */
export const GREETING_LINE: Record<EmotionalState, string> = {
  good: "You're doing well. Nothing needs your attention right now.",
  stable: "Things look steady. Here's what matters today.",
  mixed: "A few things are changing. Here's what matters today.",
  catchup: "You've got a few things happening today. We'll keep them together for you.",
  attention: "There's one thing you may want to look at today.",
  caregiver_good: "Everyone you're looking out for is doing well.",
  caregiver_concern: "Someone you care about may need you today.",
  emergency: "Your care has already begun.",
};

export interface PatientSignals {
  /** Tasks still open for the patient. */
  openTasks: number;
  /** Tasks that are open and already past their due date. */
  overdueTasks: number;
  /** Appointments coming up. */
  upcomingAppointments: number;
  /** Medication doses expected today that haven't been confirmed. */
  medicationDue: number;
  /** Wellbeing / Biolog entries logged in the last week. */
  recentBiologEntries: number;
  /** Results the patient hasn't opened yet. */
  newResults: number;
}

/**
 * Derives the patient's emotional state from real signals.
 *
 * Deliberately conservative: nothing routine is escalated into a warning.
 * Only genuinely overdue work reaches "attention".
 */
export function derivePatientState(s: PatientSignals): EmotionalState {
  if (s.overdueTasks > 0) return "attention";
  if (s.openTasks + s.medicationDue >= 3) return "catchup";
  if (s.openTasks + s.medicationDue > 0) return "mixed";
  if (s.recentBiologEntries > 0) return "good";
  if (s.upcomingAppointments > 0 || s.newResults > 0) return "stable";
  return "good";
}

/** Short "Feeling good · Sleeping well · Staying active" style descriptor. */
export function wellbeingDescriptor(state: EmotionalState): string {
  switch (state) {
    case "good":
      return "Feeling good · Sleeping well · Staying active";
    case "stable":
      return "Steady mood · Consistent sleep · Regular activity";
    case "mixed":
      return "Some patterns are shifting this week";
    case "catchup":
      return "A few things are waiting for you";
    case "attention":
      return "One thing is worth a look";
    default:
      return "Your recent patterns, in one place";
  }
}

/** Emotional interpretation of the care picture. */
export function careHeadline(medicationDue: number, overdue: number): { title: string; sub: string } {
  if (overdue > 0) {
    return { title: "Something may need your attention", sub: "One care item is waiting on you." };
  }
  if (medicationDue > 0) {
    return { title: "You're in good hands", sub: "Your care is up to date — one item is due today." };
  }
  return { title: "You're in good hands", sub: "Your care is up to date." };
}

export interface CarePersonSignals {
  medicationConfirmed: boolean;
  lastSeenLabel: string;
}

/** Emotional state for a person the patient looks after. */
export function derivePersonState(s: CarePersonSignals): "well" | "needs_you" {
  return s.medicationConfirmed ? "well" : "needs_you";
}
