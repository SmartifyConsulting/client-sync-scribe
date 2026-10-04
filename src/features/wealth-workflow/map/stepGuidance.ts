/**
 * Guidance per workflow sub-step, written for whoever is reading.
 * `client` speaks to the client in the first person ("you", "your Wealth Manager").
 * `manager` speaks to the Wealth Manager; `{name}` is replaced with the client's first name.
 */
export interface GuidanceText {
  what: string;
  required: string[];
  action?: string;
}
export interface StepGuidance {
  client: GuidanceText;
  manager: GuidanceText;
  unlocks: string;
}

export const STEP_GUIDANCE: Record<string, StepGuidance> = {
  "Marlin sends secure link": {
    client: { what: "Your Wealth Manager has started your plan and sent you a secure link to continue.", required: [] },
    manager: { what: "You've started {name}'s plan. A secure onboarding link or QR code is ready to send them.", required: ["Share the secure link or QR code with {name}"] },
    unlocks: "{name} opening their secure link and signing in",
  },
  "Scan QR or open secure link": {
    client: { what: "Open the secure link or scan the QR code your Wealth Manager sent you, and sign in on your own device.", required: ["Your secure link or QR code", "Signing in with your own details"] },
    manager: { what: "{name} opens their secure onboarding link or scans the QR code, then signs in on their own device.", required: ["Send {name} the secure link or QR code", "{name} signs in to their account"] },
    unlocks: "Identity, AML and PEP screening",
  },
  "KYC, AML and PEP Screening": {
    client: {
      what: "Confirm your identity with Didit. You'll photograph your ID, take a quick live selfie, and be screened against anti-money-laundering (AML) and politically exposed person (PEP) lists. It takes about three minutes.",
      required: ["Your South African ID or passport", "A phone or computer with a camera", "Good light for your selfie"],
      action: "Verify my identity",
    },
    manager: {
      what: "{name} completes identity verification (KYC), plus AML and PEP screening, in the Didit app. The result comes back here automatically. You'll get a task if it needs your review.",
      required: ["{name} completes the Didit check", "Review any possible AML or PEP match"],
    },
    unlocks: "Signing the disclosure and LOA",
  },
  "Sign disclosure and LOA": {
    client: {
      what: "Read and sign two documents. The Disclosure Agreement explains who we are and how we are paid. The Letter of Authority (LOA) lets your Wealth Manager request your policy information from insurers.",
      required: ["Sign the Disclosure Agreement", "Sign the Letter of Authority (LOA)"],
    },
    manager: {
      what: "{name} reads and signs the Disclosure Agreement and the Letter of Authority (LOA). Each signature is sealed with the date, time and IP address.",
      required: ["{name} signs the Disclosure Agreement", "{name} signs the LOA"],
    },
    unlocks: "Step 2: Portfolio (your existing policies are collected)",
  },
  "Astute pull: life, disability, investments": {
    client: { what: "We collect your existing life, disability and investment policies through Astute, using the LOA you signed. You don't need to do anything.", required: ["Your signed LOA"] },
    manager: { what: "Holarc Wealth pulls {name}'s existing life, disability and investment policies from Astute.", required: ["Signed LOA on file"] },
    unlocks: "A complete view of the current portfolio",
  },
  "Insurer schedules and claims history": {
    client: { what: "We collect your current policy schedules and any past claims from your insurers.", required: ["Nothing from you. We use your signed LOA"] },
    manager: { what: "Holarc Wealth collects {name}'s policy schedules and claims history from each insurer.", required: ["Policy schedules from each insurer"] },
    unlocks: "Accurate cover comparison",
  },
  "Cross-alert check": {
    client: { what: "We check that no other brokerage has asked for your information recently. This protects you.", required: ["Nothing from you"] },
    manager: { what: "Holarc Wealth checks whether another brokerage has queried {name} recently. If one has, the mandate must be re-signed.", required: ["Valid LOA on file"] },
    unlocks: "Profile can be shared with the CRM",
  },
  "Push profile to CRM": {
    client: { what: "Your consolidated profile is saved securely for your Wealth Manager.", required: ["Nothing from you"] },
    manager: { what: "{name}'s consolidated profile is saved to the firm's CRM.", required: ["Portfolio data collected"] },
    unlocks: "Needs analysis",
  },
  "Confirm personal information": {
    client: { what: "Check and complete your personal details. We need these for identity verification (FICA) and to fill in your Letter of Authority.", required: ["ID or passport number", "Date of birth", "Residential address", "Marital status"] },
    manager: { what: "{name} checks and completes their personal details: ID number, date of birth, address and marital status.", required: ["ID or passport number", "Date of birth", "Residential address", "Marital status"] },
    unlocks: "Identity, AML and PEP screening",
  },
  "Record consultation and capture financials": {
    client: { what: "Your Wealth Manager meets with you and records the conversation. Your income, expenses, assets, debts, goals and attitude to risk are captured from that meeting, so you don't have to fill in forms.", required: ["A meeting with your Wealth Manager"] },
    manager: { what: "Record your consultation with {name}, then capture their financial information from it. Holarc AI fills in cash flow, assets and liabilities, existing cover, investments, goals and estate details. Check it before {name} verifies it.", required: ["Recorded consultation or written notes"] },
    unlocks: "Client verification of the financial information",
  },
  "Verify financial information": {
    client: { what: "Read the financial information captured from your meeting. Correct anything that's wrong or missing, then confirm it is complete and correct.", required: ["Check every section", "Confirm it is complete", "Confirm it is correct"] },
    manager: { what: "{name} reviews the captured financial information and confirms it is complete and correct. Any later change needs a new confirmation.", required: ["{name}'s confirmation"] },
    unlocks: "Step 3: Portfolio",
  },
  "Life, short-term and investment gaps": {
    client: { what: "We calculate the gap between the cover you have and the cover you need.", required: ["Nothing from you"] },
    manager: { what: "Holarc Wealth calculates the gap between {name}'s current cover and what they need.", required: ["Financial facts captured"] },
    unlocks: "Estate duty estimate and quotes",
  },
  "Estate duty estimate": {
    client: { what: "We estimate the estate duty and cash your estate would need.", required: ["Your assets, debts and will details"] },
    manager: { what: "Holarc Wealth estimates {name}'s estate duty and liquidity needs.", required: ["Assets, liabilities and will details"] },
    unlocks: "Quotes and Record of Advice",
  },
  "Or: single-need disclaimer": {
    client: { what: "If you only want advice on one need, you confirm this in writing.", required: ["Your signature on the single-need disclaimer"], action: "Sign the disclaimer" },
    manager: { what: "If {name} only wants advice on one need, they sign a single-need disclaimer.", required: ["Signed single-need disclaimer from {name}"] },
    unlocks: "Quotes for the single need",
  },
  "Quote 6 insurers, rank top 3": {
    client: { what: "We request quotes from six insurers and rank the best three for you.", required: ["Nothing from you"] },
    manager: { what: "Holarc Wealth requests quotes from six insurers and ranks the top three.", required: ["Completed needs analysis"] },
    unlocks: "Option selection",
  },
  "Select options and commentary": {
    client: { what: "Your Wealth Manager chooses the options they recommend and explains why.", required: ["Nothing from you yet"] },
    manager: { what: "Select the recommended options for {name} and write your reasons.", required: ["Ranked quotes", "Reasons for the recommendation"] },
    unlocks: "Affordability check",
  },
  "Affordability check": {
    client: { what: "We confirm the recommended premiums fit your monthly budget.", required: ["Your monthly income and expenses"] },
    manager: { what: "Holarc Wealth confirms the recommended premiums fit {name}'s budget.", required: ["Monthly income and expenses"] },
    unlocks: "Record of Advice (ROA)",
  },
  "Generate ROA (versioned)": {
    client: { what: "Your Record of Advice (ROA) is prepared. If anything changes, you get a new version to sign.", required: ["Nothing from you"] },
    manager: { what: "The Record of Advice (ROA) is generated. Any change creates a new version that {name} must re-sign.", required: ["Selected options", "Affordability confirmed"] },
    unlocks: "Presentation",
  },
  "Present ROA and comparison": {
    client: { what: "Your Wealth Manager walks you through your ROA and the comparison of options.", required: ["A meeting with your Wealth Manager"] },
    manager: { what: "Present the ROA and the comparison to {name}.", required: ["Current ROA version", "Meeting booked with {name}"] },
    unlocks: "ROA signature",
  },
  "Sign ROA": {
    client: { what: "You accept the recommendation by signing your Record of Advice.", required: ["Read your ROA"], action: "Review and sign your ROA" },
    manager: { what: "{name} accepts the recommendation by signing the ROA.", required: ["{name} has reviewed the ROA"] },
    unlocks: "FICA and bank validation",
  },
  "FICA documents and bank validation": {
    client: { what: "Upload your identity and address documents (FICA) and confirm the bank account for your debit order.", required: ["Your ID document", "Proof of address, less than 3 months old", "A bank confirmation letter"], action: "Upload my documents" },
    manager: { what: "{name} uploads FICA documents and the bank account is validated.", required: ["ID document", "Proof of address (under 3 months)", "Bank confirmation letter"] },
    unlocks: "Debit order and declarations",
  },
  "Debit order and life declaration": {
    client: { what: "Authorise your debit order and complete your life declaration.", required: ["Your debit order signature", "Your completed declaration"], action: "Complete my declarations" },
    manager: { what: "{name} authorises the debit order and completes the life declaration.", required: ["Signed debit order mandate", "Completed declaration"] },
    unlocks: "Health disclosure",
  },
  "Health disclosure (encrypted)": {
    client: { what: "Share the health information your insurer needs. It is stored encrypted and only the insurer sees it.", required: ["Your completed disclosure form"], action: "Complete my disclosure" },
    manager: { what: "{name} completes the insurer's health disclosure. It is stored encrypted.", required: ["Completed disclosure form"] },
    unlocks: "Application submission",
  },
  "Accept, decline or issue": {
    client: { what: "Your insurer reviews your application and decides whether to accept it. We'll let you know as soon as they respond.", required: ["Nothing from you"] },
    manager: { what: "The insurer accepts, declines or issues {name}'s policy.", required: ["Complete application submitted"] },
    unlocks: "Policy schedule delivery",
  },
  "Policy schedule to portal and CRM": {
    client: { what: "Your policy schedule is added to your documents.", required: ["Nothing from you"] },
    manager: { what: "The issued schedule is sent to {name}'s portal and saved in the CRM.", required: ["Issued policy from the insurer"] },
    unlocks: "Annual review scheduling",
  },
  "Schedule annual review": {
    client: { what: "Your next annual review is booked for 12 months from now.", required: ["Nothing from you"] },
    manager: { what: "{name}'s annual review is booked 12 months from issue.", required: ["Policy issue date"] },
    unlocks: "Renewal acknowledgement",
  },
  "Acknowledge renewal": {
    client: { what: "Confirm you've received your renewal and are happy to continue.", required: ["Read your renewal notice"], action: "Acknowledge my renewal" },
    manager: { what: "{name} confirms they have received the renewal.", required: ["Renewal notice sent to {name}"] },
    unlocks: "The cycle repeats every 12 months",
  },
};

export const fillName = (s: string, name: string) => s.replace(/\{name\}/g, name);

/** Badge label for a sub-step owner. Fixed for everyone: colour tells who acts (green client, blue Wealth Manager). */
export function ownerLabel(owner: string, _viewer?: "manager" | "client", _clientFirst?: string) {
  return ({ client: "Client", advisor: "Wealth Manager", system: "System", insurer: "Insurer" } as Record<string, string>)[owner] ?? owner;
}
