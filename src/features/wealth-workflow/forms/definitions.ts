export type FieldType = "text" | "said" | "number" | "date" | "textarea" | "insurers" | "file" | "range" | "radio" | "check";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Hidden when the FNA single-need bypass is on. */
  fnaOnly?: boolean;
}

export interface ComplianceForm {
  id: string;
  number: number;
  title: string;
  stage: string;
  when: string;
  /** document_kind saved on completion (picked up by the workflow engine). */
  kind: string;
  adviserSigns?: boolean;
  disclosure?: (adviser: string) => string;
  fields: FormField[];
}

export const INSURERS = ["Momentum", "Discovery", "Sanlam", "Liberty", "Old Mutual", "Hollard", "BrightRock"];

/** South African ID: 13 digits, valid date of birth, Luhn check digit. */
export function isValidSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  const mm = Number(id.slice(2, 4)), dd = Number(id.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[12 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export const COMPLIANCE_FORMS: ComplianceForm[] = [
  {
    id: "mandate", number: 1, title: "Introduction, Disclosure & Mandate", stage: "Stage 1 · First appointment", kind: "mandate_signed",
    when: "First step for every new client, before any information is gathered.",
    disclosure: (a) => `Wealth Manager: ${a}\n\nThe Financial Services Provider (FSP) is an authorised FSP. Qualifications, years of experience, FSP registration number, legal status and Professional Indemnity cover are available on request and shown in the firm profile.\n\nAuthorised financial categories: Long-term insurance (A, B1, C), Short-term insurance (personal lines), Retail pension benefits, Collective investment schemes.\n\nRemuneration and conflict of interest: The FSP does not receive more than 32% of its total remuneration from any single product supplier, unless disclosed below. Remuneration may include commission, advice fees or both, as set out in the Record of Advice.\n\nBy signing, you acknowledge receipt of this disclosure and give the FSP a mandate to render financial services to you.`,
    fields: [
      { key: "supplierOverride", label: "Product supplier over 32% of remuneration (if any)", type: "text", placeholder: "e.g. Old Mutual 38%" },
      { key: "readAll", label: "Client has read the full disclosure", type: "check", required: true },
    ],
  },
  {
    id: "astute", number: 2, title: "Astute Authority & Consent", stage: "Stage 1 · First appointment", kind: "astute_consent", adviserSigns: true,
    when: "Immediately after the mandate is signed. Authorises retrieval of existing policies and investments.",
    fields: [
      { key: "fullName", label: "Client full name", type: "text", required: true },
      { key: "idNumber", label: "South African ID number", type: "said", required: true, placeholder: "13 digits" },
      { key: "consent", label: "I consent to my existing life insurance and investment information being retrieved via Astute", type: "check", required: true },
    ],
  },
  {
    id: "broker_change", number: 3, title: "Broker Change Letter", stage: "Stage 1 · Optional", kind: "broker_change",
    when: "Optional. Use when the client moves existing policies to this Wealth Manager.",
    fields: [
      { key: "insurers", label: "Insurers", type: "insurers", required: true },
      { key: "policyNumbers", label: "Existing policy numbers (comma separated)", type: "text", required: true },
      { key: "lastContact", label: "Previous broker last contact date", type: "date", required: true },
      { key: "declaration", label: "I confirm the previous FSP/broker has not maintained contact with me since the date above and I request an immediate broker change", type: "check", required: true },
    ],
  },
  {
    id: "fica", number: 4, title: "KYC Profile & FICA Verification", stage: "Stage 2 · Screening & compliance", kind: "fica",
    when: "After the portfolio pull, before formal advice.",
    fields: [
      { key: "idCopy", label: "Copy of ID / passport", type: "file", required: true },
      { key: "proofAddress", label: "Proof of residential address", type: "file", required: true },
      { key: "proofBank", label: "Proof of bank account", type: "file", required: true },
      { key: "liveCheck", label: "Live face check completed with the client present", type: "check", required: true },
      { key: "screening", label: "Sanctions and background screening result", type: "radio", required: true, options: ["Clear", "Adverse finding"] },
      { key: "adverse", label: "Adverse finding: mark client high risk and stop onboarding", type: "check" },
    ],
  },
  {
    id: "fna", number: 5, title: "Financial Needs Analysis & Option Waiver", stage: "Stage 3 · Analysis & planning", kind: "fna",
    when: "Start of financial planning.",
    fields: [
      { key: "goals", label: "Family financial needs and goals", type: "textarea", required: true, fnaOnly: true },
      { key: "assets", label: "Assets (household, vehicles, jewellery, investments)", type: "textarea", fnaOnly: true },
      { key: "liabilities", label: "Liabilities", type: "textarea", fnaOnly: true },
      { key: "estate", label: "Estimated estate value (R) for estate duty", type: "number", fnaOnly: true },
      { key: "risk", label: "Investment risk appetite (1 cautious – 5 aggressive)", type: "range", fnaOnly: true },
      { key: "singleNeedDetail", label: "Need being addressed", type: "text", required: true },
    ],
  },
  {
    id: "roa", number: 6, title: "Record of Advice (ROA)", stage: "Stage 3 · Advice", kind: "roa_signed",
    when: "After quotes are prepared, before any application is submitted.",
    adviserSigns: true,
    fields: [
      { key: "summary", label: "Recommendation summary (in the adviser's own words)", type: "textarea", required: true },
      { key: "option1", label: "Option 1 (insurer, product, premium)", type: "text", required: true },
      { key: "option2", label: "Option 2", type: "text" },
      { key: "option3", label: "Option 3", type: "text" },
      { key: "affordable", label: "Affordability confirmed with the client", type: "check", required: true },
      { key: "customised", label: "Cover customised to the client's needs", type: "check" },
      { key: "accept", label: "I accept this specific recommendation and option structure", type: "check", required: true },
    ],
  },
  {
    id: "annual_review", number: 7, title: "Annual Review & Renewal Acknowledgment", stage: "Stage 4 · Ongoing", kind: "annual_review_ack",
    when: "Sent before each policy anniversary.",
    fields: [
      { key: "increase", label: "Upcoming premium increase / schedule changes", type: "text", required: true },
      { key: "choice", label: "Client response", type: "radio", required: true, options: [
        "My material financial and personal situation remains unchanged. Accept schedule.",
        "I have had material changes. Schedule an updated financial review.",
      ] },
      { key: "comment", label: "Client comment", type: "textarea" },
    ],
  },
];
