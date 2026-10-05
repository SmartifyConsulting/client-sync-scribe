import { differenceInCalendarDays } from "date-fns";

export type Priority = "overdue" | "due_today" | "due_soon" | "blocked" | "waiting" | "normal";

export function priorityFor(due?: string | null, fallback: Priority = "normal"): Priority {
  if (!due) return fallback;
  const d = differenceInCalendarDays(new Date(due), new Date());
  if (d < 0) return "overdue";
  if (d === 0) return "due_today";
  if (d <= 3) return "due_soon";
  return fallback;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  overdue: "Overdue", due_today: "Due today", due_soon: "Due soon", blocked: "Blocked", waiting: "Waiting", normal: "",
};

/** WHY / NEXT copy keyed by requirement (engine blocker text) */
export const REQUIREMENT_RULES: Record<string, { why: string; next: string; owner: string; group: string; reason?: string }> = {
  "Client signature on current ROA": { reason: "Current ROA not signed", why: "Required before the application can proceed.", next: "Application becomes ready for submission.", owner: "client", group: "presentation" },
  "Proof of residence": { reason: "Proof of residence missing", why: "FICA requirement for the application.", next: "Removes a blocker on the application.", owner: "client", group: "presentation" },
  "Client ID document": { reason: "Client ID document missing", why: "FICA identity verification.", next: "Removes a blocker on the application.", owner: "client", group: "gateway" },
  "KYC/FICA not completed": { reason: "FICA not completed", why: "Regulatory requirement before any application.", next: "Compliance can be signed off.", owner: "key_individual", group: "presentation" },
  "Bank validation not completed": { reason: "Bank account not validated", why: "Debit order must be validated.", next: "Compliance can be signed off.", owner: "operations", group: "presentation" },
  "Required declarations not completed": { reason: "Declarations not signed", why: "Debit order and life declarations are mandatory.", next: "Compliance can be signed off.", owner: "client", group: "presentation" },
  "Recommendation not accepted by client": { reason: "Client has not accepted the recommendation", why: "The client must accept before documentation starts.", next: "Documentation becomes current.", owner: "client", group: "presentation" },
  "Recommendation has not been presented to the client": { reason: "Recommendation not yet presented", why: "The client cannot decide on an unpresented ROA.", next: "Client decision opens.", owner: "wealth_manager", group: "quotes" },
  "No current recommendation to present": { reason: "No recommendation prepared", why: "A recommendation and ROA are needed first.", next: "It can be presented to the client.", owner: "wealth_manager", group: "quotes" },
  "Application not ready": { reason: "Application not ready", why: "The application must be ready before underwriting.", next: "Underwriting can start.", owner: "wealth_manager", group: "issuance" },
  "Application not submitted": { reason: "Application not submitted", why: "The insurer can only issue submitted applications.", next: "Awaiting the insurer's issue.", owner: "operations", group: "issuance" },
  "Provider has not confirmed issue": { reason: "Insurer has not confirmed issue", why: "Follow-up starts once the policy is issued.", next: "Follow-up and annual review get scheduled.", owner: "provider", group: "issuance" },
};

export const STAGE_TO_GROUP: Record<string, string> = {
  consultation: "gateway", information_required: "portfolio", needs_analysis: "needs",
  research_quotes: "quotes", recommendation: "quotes",
  client_presentation: "presentation", client_decision: "presentation", documentation: "presentation", compliance: "presentation",
  application: "issuance", underwriting: "issuance", submission: "issuance", issued: "issuance", follow_up: "issuance", annual_review: "issuance",
};

/** Milestone copy for completed transitions (manager view / client view) */
export const MILESTONE: Record<string, { wm: string; client?: string }> = {
  information_required: { wm: "Meeting completed", client: "Meeting completed" },
  needs_analysis: { wm: "Information received" },
  research_quotes: { wm: "FNA completed", client: "Financial Needs Analysis" },
  recommendation: { wm: "Quotes researched", client: "Recommendation being prepared" },
  client_decision: { wm: "Recommendation presented", client: "Recommendation prepared" },
  documentation: { wm: "Client accepted", client: "You accepted the recommendation" },
  compliance: { wm: "Documents received", client: "Documents received" },
  application: { wm: "Compliance completed" },
  underwriting: { wm: "Application prepared", client: "Application prepared" },
  submission: { wm: "Underwriting completed" },
  issued: { wm: "Application submitted", client: "Application submitted" },
  follow_up: { wm: "Policy issued", client: "Policy issued" },
  annual_review: { wm: "Follow-up completed" },
  closed_declined: { wm: "Client declined", client: "You declined the recommendation" },
};

/** What the engine's next move needs, for the NEXT column */
export const NEXT_COPY: Record<string, string> = {
  consultation: "Collect client information",
  information_required: "Complete needs analysis",
  needs_analysis: "Research quotes",
  research_quotes: "Finalise recommendation and ROA",
  recommendation: "Present recommendation to client",
  client_presentation: "Obtain client decision",
  client_decision: "Documentation, once the client accepts",
  documentation: "Obtain signed ROA and FICA documents",
  compliance: "Complete FICA, bank validation and declarations",
  application: "Prepare and submit application",
  underwriting: "Follow up with insurer",
  submission: "Confirm policy issue",
  issued: "Client follow-up",
  follow_up: "Annual review",
  annual_review: "Start new consultation cycle",
};

export const CLIENT_WAITING: Record<string, string> = {
  consultation: "Your Wealth Manager is preparing for your consultation.",
  information_required: "Your Wealth Manager is gathering your financial information.",
  needs_analysis: "Your Wealth Manager is analysing your needs.",
  research_quotes: "Your Wealth Manager is comparing options for you.",
  recommendation: "Your Wealth Manager is preparing your recommendation.",
  client_presentation: "Your Wealth Manager will present your recommendation.",
  client_decision: "We're waiting for your decision on the recommendation.",
  documentation: "We're waiting for your documents.",
  compliance: "Your Wealth Manager is completing compliance checks.",
  application: "Your Wealth Manager is preparing your application.",
  underwriting: "The insurer is reviewing your application.",
  submission: "Your application is being processed.",
  issued: "Your policy has been issued.",
  follow_up: "Your Wealth Manager will follow up with you.",
  annual_review: "Your annual review is coming up.",
};
