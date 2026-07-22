export interface TourStep {
  target: string; // matches data-tour attribute
  title: string;
  message: string;
}

export const doctorTourSteps: TourStep[] = [
  {
    target: "practice-settings",
    title: "Your Practice",
    message:
      "Add your practice details, logo, letterhead and billing info here. This information appears on every prescription, invoice and document you create.",
  },
  {
    target: "import-patients",
    title: "Your Patients",
    message:
      "Bring in your existing patient list. You can import from a spreadsheet, invite patients by phone or email, or add them one by one.",
  },
  {
    target: "doctor-home",
    title: "Sessions & Daily Digest",
    message:
      "From your Home dashboard you can start a recorded patient session — the AI will transcribe and summarise it — and listen to your Daily Digest of patient activity.",
  },
  {
    target: "doctor-briefing",
    title: "Today's Briefing",
    message:
      "Your morning briefing summarises overnight patient activity. Tap play to hear it narrated, or read it inline. Use Skip on any item that isn't relevant — it won't come back tomorrow. Change Language in My Practice settings.",
  },
  {
    target: "doctor-tasks",
    title: "Your Tasks",
    message:
      "Clinical to-dos the AI suggests during sessions land here for you to approve and tick off.",
  },
];

export const patientTourSteps: TourStep[] = [
  {
    target: "patient-holarchy",
    title: "My Holarchy",
    message:
      "Your health information lives here — vitals, conditions, allergies, emergency contacts, your care team, insurance and pharmacies, plus your session and admission history.",
  },
  {
    target: "patient-tasks",
    title: "My Tasks",
    message: "Reminders from your doctors — medications, exercises and follow-ups — appear here.",
  },
  {
    target: "patient-sos",
    title: "SOS",
    message: "In an emergency, tap SOS to alert your nominated contacts and nearby providers.",
  },
];
