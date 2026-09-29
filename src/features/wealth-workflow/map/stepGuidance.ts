/** Plain-language guidance per workflow substep, keyed by the substep label in groups.ts. */
export interface StepGuidance {
  what: string;
  required: string[];
  unlocks: string;
  clientAction?: string;
}

export const STEP_GUIDANCE: Record<string, StepGuidance> = {
  "Scan QR or open secure link": {
    what: "The client opens their secure onboarding link or scans the QR code to start.",
    required: ["Client has the secure link or QR code", "Client signs in on their own device"],
    unlocks: "Identity verification",
    clientAction: "Open your secure link",
  },
  "Liveness and Home Affairs ID": {
    what: "The client's identity is confirmed with a live selfie and a Home Affairs ID check.",
    required: ["Clear photo of the ID document", "Live selfie matching the ID"],
    unlocks: "Advice can begin once all identity checks pass",
    clientAction: "Upload your ID",
  },
  "Astute pull: life, disability, investments": {
    what: "Existing life, disability and investment policies are pulled from Astute.",
    required: ["Signed mandate allowing the data request"],
    unlocks: "A complete view of the current portfolio",
  },
  "Insurer schedules and claims history": {
    what: "Current insurer policy schedules and past claims are collected.",
    required: ["Policy schedules from each insurer"],
    unlocks: "Accurate cover comparison",
  },
  "Cross-alert check": {
    what: "Checks whether another brokerage has queried this client recently.",
    required: ["Valid mandate on file"],
    unlocks: "Portfolio can be shared with the CRM",
  },
  "Push profile to CRM": {
    what: "The consolidated client profile is saved to the firm's CRM.",
    required: ["Portfolio data collected"],
    unlocks: "Needs analysis",
  },
  "Capture facts and risk profile": {
    what: "The Wealth Manager records the client's financial facts, goals and risk profile.",
    required: ["Income and expenses", "Assets and liabilities", "Completed risk questionnaire"],
    unlocks: "Gap calculations",
  },
  "Life, short-term and investment gaps": {
    what: "The shortfall between current cover and what the client needs is calculated.",
    required: ["Financial facts captured"],
    unlocks: "Estate duty estimate and quotes",
  },
  "Estate duty estimate": {
    what: "An estimate of estate duty and liquidity needs on death.",
    required: ["Assets, liabilities and will details"],
    unlocks: "Quotes and Record of Advice",
  },
  "Or: single-need disclaimer": {
    what: "If the client only wants advice on one need, they confirm this in writing.",
    required: ["Signed single-need disclaimer"],
    unlocks: "Quotes for the single need",
    clientAction: "Sign the disclaimer",
  },
  "Quote 6 insurers, rank top 3": {
    what: "Quotes are requested from six insurers and the best three are ranked.",
    required: ["Completed needs analysis"],
    unlocks: "Option selection",
  },
  "Select options and commentary": {
    what: "The Wealth Manager chooses the recommended options and explains why.",
    required: ["Ranked quotes", "Reasons for the recommendation"],
    unlocks: "Affordability check",
  },
  "Affordability check": {
    what: "Confirms the recommended premiums fit within the client's budget.",
    required: ["Monthly income and expenses"],
    unlocks: "Record of Advice (ROA)",
  },
  "Generate ROA (versioned)": {
    what: "The Record of Advice (ROA) is created. Any change creates a new version that must be re-signed.",
    required: ["Selected options", "Affordability confirmed"],
    unlocks: "Client presentation",
  },
  "Present ROA and comparison": {
    what: "The Wealth Manager walks the client through the ROA and the comparison.",
    required: ["Current ROA version", "Scheduled meeting with the client"],
    unlocks: "Client signature",
  },
  "Sign ROA": {
    what: "The client accepts the recommendation by signing the Record of Advice.",
    required: ["Client has reviewed the ROA"],
    unlocks: "FICA and bank validation",
    clientAction: "Review and sign your ROA",
  },
  "FICA documents and bank validation": {
    what: "Identity and regulatory verification (FICA) plus confirmation of the bank account.",
    required: ["ID document", "Proof of address (under 3 months)", "Bank confirmation letter"],
    unlocks: "Debit order and declarations",
    clientAction: "Upload FICA documents",
  },
  "Debit order and life declaration": {
    what: "The client authorises the debit order and completes the life declaration.",
    required: ["Signed debit order mandate", "Completed declaration"],
    unlocks: "Health disclosure",
    clientAction: "Complete the declarations",
  },
  "Health disclosure (encrypted)": {
    what: "The client discloses any health information needed by the insurer. It is stored encrypted.",
    required: ["Completed disclosure form"],
    unlocks: "Application submission",
    clientAction: "Complete your disclosure",
  },
  "Accept, decline or issue": {
    what: "The insurer reviews the application and accepts, declines or issues the policy.",
    required: ["Complete application submitted"],
    unlocks: "Policy schedule delivery",
  },
  "Policy schedule to portal and CRM": {
    what: "The issued policy schedule is delivered to the client portal and saved in the CRM.",
    required: ["Issued policy from the insurer"],
    unlocks: "Annual review scheduling",
  },
  "Schedule annual review": {
    what: "The next annual review is booked 12 months from issue.",
    required: ["Policy issue date"],
    unlocks: "Renewal acknowledgement",
  },
  "Acknowledge renewal": {
    what: "The client confirms they have received the renewal and are happy to continue.",
    required: ["Renewal notice sent to the client"],
    unlocks: "The cycle repeats every 12 months",
    clientAction: "Acknowledge your renewal",
  },
};
