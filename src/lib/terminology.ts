/**
 * Indigro wealth-management terminology. One name per concept — use these
 * everywhere user-facing copy refers to a person, object or stage.
 * Database/table/route identifiers are unchanged (patient, doctor, session…).
 */
export const BRAND = "Indigro";

export const TERMS = {
  client: "Client", clients: "Clients",
  wealthManager: "Wealth Manager", wealthManagers: "Wealth Managers",
  firm: "Firm", firmMember: "Firm Member", firmAssistant: "Firm Assistant",
  consultation: "Consultation", consultations: "Consultations",
  consultationNotes: "Consultation Notes", wealthManagerNotes: "Wealth Manager Notes",
  consultationSummary: "Consultation Summary", consultationTranscript: "Consultation Transcript",
  wealthPlan: "Wealth Plan", financialGoals: "Financial Goals", fna: "Financial Needs Analysis",
  financialHistory: "Financial History", clientRecord: "Client Record", clientProfile: "Client Profile",
  actions: "Actions", remuneration: "Remuneration", adviceFee: "Advice Fee",
} as const;

/** Client-facing plain-language versions of technical terms. */
export const CLIENT_TERMS = {
  roa: "Record of Advice (ROA)",
  fica: "Identity and regulatory verification (FICA)",
} as const;

/**
 * Healthcare-only modules hidden from wealth users (code retained).
 * Matched as path prefixes in navigation and the route guard.
 */
export const WEALTH_HIDDEN_MODULES = [
  "/doctor/holarchelp", "/patient/holarchelp", "/holarchelp", "/provider/hospital", "/provider/ambulance",
  "/admissions", "/patient/admissions", "/patient/ward", "/my-shift", "/nurse-profile",
  "/prescriptions", "/patient/prescriptions", "/patient/lab-results", "/lab-results",
  "/biolog", "/patient/rewards", "/vula", "/admin/gamification", "/ask-maeve",
  "/doctor/round-tables", "/patient/round-table",
];

export const isWealthHidden = (path: string) =>
  WEALTH_HIDDEN_MODULES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"));
