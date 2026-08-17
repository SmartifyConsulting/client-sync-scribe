/**
 * My Holarc Care Team — the parts of a patient's profile a friend or family
 * member can be given access to. Defined once here so the Personal Information
 * section, the My Holarchy sub-tab and any future access checks all agree on
 * the ids, labels and ordering. Labels are Title Case.
 */

export interface CareTeamPermission {
  id: string;
  label: string;
}

export const CARE_TEAM_PERMISSIONS: CareTeamPermission[] = [
  { id: "sos_alerts", label: "SOS Alerts" },
  { id: "sos_live_tracking", label: "SOS Live Tracking" },
  { id: "medical_information", label: "Medical Information" },
  { id: "all_medication", label: "All Medication" },
  { id: "chronic_medication", label: "Chronic Medication" },
  { id: "hospital_admissions_basic", label: "Hospital Admissions (Without Medical Information)" },
  { id: "hospital_admissions_medical", label: "Hospital Admissions (With Medical Information)" },
  { id: "lab_results", label: "My Lab Results" },
  { id: "sessions", label: "My Sessions" },
  { id: "documents", label: "My Documents" },
  { id: "calendar", label: "My Calendar" },
  { id: "tasks", label: "My Tasks" },
  { id: "biolog", label: "My Biolog" },
  { id: "round_table", label: "My Round Table" },
];

/** Sharing is opt-in — only the SOS entries are on for a new care team member. */
export const DEFAULT_CARE_TEAM_PERMISSIONS = ["sos_alerts", "sos_live_tracking"];

/**
 * Reads the permission list off a stored contact, mapping the older
 * can_view_profile / can_view_live_tracking flags so saved contacts keep
 * working before they are re-saved.
 */
export function resolvePermissions(contact: {
  permissions?: string[] | null;
  can_view_profile?: boolean;
  can_view_live_tracking?: boolean;
}): string[] {
  if (Array.isArray(contact.permissions)) return contact.permissions;
  const legacy: string[] = ["sos_alerts"];
  if (contact.can_view_live_tracking !== false) legacy.push("sos_live_tracking");
  if (contact.can_view_profile) legacy.push("medical_information");
  return legacy;
}

/**
 * Keeps the two hospital-admission levels consistent: the detailed level
 * always implies the basic one.
 */
export function togglePermission(current: string[], id: string, checked: boolean): string[] {
  const set = new Set(current);
  if (checked) {
    set.add(id);
    if (id === "hospital_admissions_medical") set.add("hospital_admissions_basic");
  } else {
    set.delete(id);
    if (id === "hospital_admissions_basic") set.delete("hospital_admissions_medical");
  }
  return CARE_TEAM_PERMISSIONS.filter((p) => set.has(p.id)).map((p) => p.id);
}

export const CARE_TEAM_BLURB =
  "Your Holarc Care Team is the friends and family you choose to share parts of your profile with. They are also the people notified when you trigger an SOS. Your medical practitioners live in My Holarc Medical Team.";
