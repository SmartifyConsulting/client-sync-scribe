import type { LucideIcon } from "lucide-react";
import { CalendarClock, CircleCheck, Database, FileText, ClipboardList, PenLine, ScanFace } from "lucide-react";
import type { WealthStage, WealthRecommendation } from "../types";

export type BadgeOwner = "client" | "system" | "advisor" | "insurer";

export interface MapContext {
  stagePos: number; // position of current stage (1..15, 99 closed)
  recs: WealthRecommendation[];
  apps: { status: string; review_date: string | null }[];
  compliance: {
    kyc_fica_status: string; bank_validation_status: string; bank_validation_required: boolean; declarations_status: string;
  } | null;
  docKinds: Set<string>;
  clientLinked: boolean;
  kycStatus: string | null;
  signedDocs: Set<string>;
  holdingsCount: number;
  personalDone: boolean;
  financialsExtracted: boolean;
  financialsVerified: boolean;
  meetingScheduled: boolean;
  quotesCount?: number;
  selectedQuotes?: number;
  schedulesRequested?: boolean;
  quotesRequested?: boolean;
}

export interface SubStep {
  owner: BadgeOwner;
  label: string;
  /** Returns true/false when real data exists; undefined = not yet connected. */
  done?: (c: MapContext) => boolean | undefined;
}

export interface WorkflowGroup {
  n: number;
  key: string;
  title: string;
  clientTitle: string;
  icon: LucideIcon;
  stages: WealthStage[];
  steps: SubStep[];
  /** Simplified client-only view of technical steps (Wealth Manager always sees `steps`). */
  clientSteps?: SubStep[];
  footer: string;
}

const past = (pos: number) => (c: MapContext) => c.stagePos > pos && c.stagePos !== 99;
const anyRec = (c: MapContext) => c.recs.length > 0;
const accepted = (c: MapContext) => c.recs.some((r) => r.status === "accepted");
const appAt = (s: string[]) => (c: MapContext) => c.apps.some((a) => s.includes(a.status));

export const WORKFLOW_GROUPS: WorkflowGroup[] = [
  {
    n: 1, key: "gateway", title: "Client Onboarding", clientTitle: "Client Onboarding", icon: ScanFace,
    stages: ["consultation"],
    steps: [
      { owner: "advisor", label: "Marlin sends secure link", done: () => true },
      { owner: "client", label: "Scan QR or open secure link", done: (c) => past(1)(c) || c.clientLinked || !!c.kycStatus },
      { owner: "client", label: "Complete personal information", done: (c) => past(1)(c) || c.personalDone },
      { owner: "client", label: "Complete KYC, AML and PEP screening", done: (c) => past(1)(c) || c.kycStatus === "approved" },
      { owner: "client", label: "Sign Disclosure and LOA", done: (c) => past(1)(c) || (c.signedDocs.has("disclosure") && c.signedDocs.has("loa")) },
    ],
    footer: "No advice until all checks pass",
  },
  {
    n: 2, key: "needs", title: "Needs Analysis", clientTitle: "Needs Analysis", icon: ClipboardList,
    stages: ["needs_analysis"],
    steps: [
      { owner: "advisor", label: 'Schedule "Review Financial Health" meeting', done: (c) => past(2)(c) || c.meetingScheduled || c.financialsExtracted },
      { owner: "advisor", label: "Record meeting and capture financials", done: (c) => past(2)(c) || c.financialsExtracted },
      { owner: "client", label: "Verify financial information", done: (c) => past(2)(c) || c.financialsVerified },
      { owner: "system", label: "Life, short-term and investment gaps", done: past(2) },
      { owner: "system", label: "Estate duty estimate", done: past(2) },
    ],
    footer: "Same inputs, same result",
  },
  {
    n: 3, key: "portfolio", title: "Portfolio", clientTitle: "Portfolio", icon: Database,
    stages: ["information_required"],
    steps: [
      { owner: "system", label: "Astute pull: life, disability, investments", done: (c) => past(3)(c) || c.holdingsCount > 0 },
      { owner: "advisor", label: "Insurer schedules and claims history", done: (c) => past(3)(c) || !!c.schedulesRequested },
      { owner: "system", label: "Cross-alert check" },
      { owner: "system", label: "Push profile to CRM" },
    ],
    clientSteps: [{ owner: "advisor", label: "Marlin is accessing your current portfolios", done: () => undefined }],
    footer: "Locked until the mandate is re-signed if another brokerage queries",
  },
  {
    n: 4, key: "quotes", title: "Quotes & ROA", clientTitle: "Quotes & ROA", icon: FileText,
    stages: ["research_quotes", "recommendation"],
    steps: [
      { owner: "advisor", label: "Quote 6 insurers, rank top 3", done: (c) => past(4)(c) || !!c.quotesRequested || (c.quotesCount ?? 0) > 0 || anyRec(c) },
      { owner: "advisor", label: "Select options and commentary", done: (c) => past(4)(c) || (c.selectedQuotes ?? 0) > 0 || anyRec(c) },
      { owner: "system", label: "Affordability check", done: (c) => past(4)(c) || (c.selectedQuotes ?? 0) > 0 || anyRec(c) },
      { owner: "system", label: "Generate ROA (versioned)", done: (c) => c.recs.some((r) => !!r.roa_document_id) },
    ],
    clientSteps: [{ owner: "advisor", label: "Marlin is preparing your financial plan", done: () => undefined }],
    footer: "Any change makes a new version, re-sign",
  },
  {
    n: 5, key: "presentation", title: "Presentation", clientTitle: "Presentation", icon: PenLine,
    stages: ["client_presentation", "client_decision", "documentation", "compliance"],
    steps: [
      { owner: "advisor", label: "Present ROA and comparison", done: (c) => c.recs.some((r) => r.presented_at) },
      { owner: "client", label: "Sign ROA", done: (c) => accepted(c) && c.docKinds.has("roa_signed") },
      {
        owner: "client", label: "Upload FICA documents and confirm bank details",
        done: (c) => !!c.compliance && c.compliance.kyc_fica_status === "completed" &&
          (!c.compliance.bank_validation_required || c.compliance.bank_validation_status === "completed"),
      },
      { owner: "client", label: "Authorise debit order and sign life declaration", done: (c) => c.compliance?.declarations_status === "completed" },
      { owner: "client", label: "Complete health disclosure (encrypted)" },
    ],
    footer: "Submission blocked until complete",
  },
  {
    n: 6, key: "issuance", title: "Issuance & Review", clientTitle: "Issuance & Review", icon: CircleCheck,
    stages: ["application", "underwriting", "submission", "issued", "follow_up"],
    steps: [
      { owner: "insurer", label: "Accept, decline or issue", done: appAt(["issued"]) },
      { owner: "system", label: "Policy schedule to portal and CRM", done: appAt(["issued"]) },
      { owner: "system", label: "Schedule annual review", done: (c) => c.apps.some((a) => !!a.review_date) },
    ],
    footer: "Annual review booked automatically 12 months after issue",
  },
  {
    n: 7, key: "annual_review", title: "Annual Review", clientTitle: "Annual Review", icon: CalendarClock,
    stages: ["annual_review"],
    steps: [
      { owner: "advisor", label: "Schedule review meeting" },
      { owner: "client", label: "Acknowledge renewal" },
    ],
    footer: "Repeats every 12 months",
  },
];

export const OWNER_LABEL: Record<string, string> = {
  client: "client", wealth_manager: "wealth manager", firm: "firm", key_individual: "key individual",
  provider: "insurer", operations: "operations", system: "system",
};
