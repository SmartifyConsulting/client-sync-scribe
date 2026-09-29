export interface TourStep {
  target: string; // matches data-tour attribute
  title: string;
  message: string;
}

export const doctorTourSteps: TourStep[] = [
  {
    target: "practice-settings",
    title: "Your Firm",
    message:
      "Add your firm details, FSP number, logo and letterhead. They appear on every Record of Advice, fee statement and document you create.",
  },
  {
    target: "import-patients",
    title: "Your Clients",
    message:
      "Create client profiles: import from a spreadsheet, invite clients by phone or email, or add them one by one. Each client's financial position, goals and existing products live on their profile.",
  },
  {
    target: "doctor-home",
    title: "Consultations",
    message:
      "Start a recorded consultation from your dashboard. It is transcribed and summarised, and follow-up actions are drafted for your approval.",
  },
  {
    target: "doctor-briefing",
    title: "Today's Briefing",
    message:
      "A summary of overnight client activity: decisions, signed ROAs, uploaded documents and insurer responses. Skip anything that isn't relevant.",
  },
  {
    target: "doctor-tasks",
    title: "Your Actions",
    message:
      "Actions from consultations and the workflow land here: needs analysis, quotes, recommendations, compliance, applications and annual reviews. Open a client's Live tab to see what is blocked or waiting.",
  },
];

export const patientTourSteps: TourStep[] = [
  {
    target: "patient-holarchy",
    title: "My Profile",
    message:
      "Your details, financial information and wealth journey live here — from consultation to recommendation, application and your next annual review.",
  },
  {
    target: "patient-tasks",
    title: "My Actions",
    message: "Things your Wealth Manager needs from you — documents to upload, your Record of Advice (ROA) to sign — appear here with the reason and due date.",
  },
];
