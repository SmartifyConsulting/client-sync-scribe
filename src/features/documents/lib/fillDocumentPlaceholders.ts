// Shared placeholder filler for document templates.
// Replaces tokens like [PatientName], [Patient Name], [InvoiceNumber] (case-insensitive)
// with real values from patient / profile / invoice / time. Unmatched tokens become "___".

import { renderSignatureHtml } from "@/lib/signature";


export interface FillPatient {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  physical_address?: string | null;
  postal_address?: string | null;
  address?: string | null;
  medical_aid?: string | null;
  medical_aid_number?: string | null;
  primary_member?: string | null;
  id_passport_number?: string | null;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  allergies?: string | null;
  allergies_structured?: Array<{ name: string; severity?: string | null }> | null;
  pharmacy_name?: string | null;
  claims_email?: string | null;
}

/** Formats structured allergies as a joined string, e.g. "Penicillin (severe), Peanuts (moderate)". */
function formatAllergies(patient?: FillPatient | null): string {
  const structured = patient?.allergies_structured;
  if (structured && structured.length > 0) {
    return structured
      .map((a) => (a.severity ? `${a.name} (${a.severity})` : a.name))
      .join(", ");
  }
  return patient?.allergies || "";
}

export interface FillProfile {
  full_name?: string | null;
  practice_number?: string | null;
  doctor_number?: string | null;
  practice_address?: string | null;
  specialty?: string | null;
  signature_url?: string | null;
  signature_font?: string | null;
  signature_color?: string | null;
  signature_font_size?: number | null;
  signature_bold?: boolean | null;
  signature_italic?: boolean | null;
  logo_url?: string | null;

  // Bank details aren't a real column today — accept any to be future-proof.
  bank_account_details?: string | null;
  bank_details?: string | null;
}

export interface FillInvoice {
  invoice_number?: string | null;
  description?: string | null;
  amount?: number | string | null;
  due_date?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  currency?: string | null;
  services_html?: string | null;
}

export interface FillPrescriptionMed {
  medication?: string | null;
  name?: string | null;
  dosage?: string | null;
  quantity?: string | null;
  frequency?: string | null;
  instructions?: string | null;
}

export interface FillPrescription {
  medications?: FillPrescriptionMed[] | null;
  repeats?: number | string | null;
  special_instructions?: string | null;
  notes?: string | null;
}

/** Consultation details used by medical certificates and sick notes. */
export interface FillCertificate {
  consultation_date?: string | null;
  consultation_time?: string | null;
  nature_of_illness?: string | null;
  sick_leave_from?: string | null;
  sick_leave_until?: string | null;
  inclusive?: string | null;
  other_recommendations?: string | null;
}

export interface FillContext {
  patient?: FillPatient | null;
  profile?: FillProfile | null;
  invoice?: FillInvoice | null;
  prescription?: FillPrescription | null;
  certificate?: FillCertificate | null;
  today?: Date;
  /** Render results for a raw text surface: no HTML markup for signatures or blanks. */
  plainText?: boolean;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  ZAR: "R", NGN: "₦", USD: "$", EUR: "€", GBP: "£", BWP: "P", SZL: "E", LSL: "M",
};

function fmtDateLong(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function fmtAmount(amount: number | string | null | undefined, currency = "ZAR"): string {
  if (amount === null || amount === undefined || amount === "") return "";
  const n = Number(amount);
  if (isNaN(n)) return String(amount);
  const sym = CURRENCY_SYMBOL[currency] || currency;
  return `${sym} ${n.toFixed(2)}`;
}

function buildReplacements(ctx: FillContext): { lookup: Record<string, string>; slotKeys: Set<string> } {
  const { patient, profile, invoice, prescription, certificate, plainText } = ctx;
  const today = ctx.today || new Date();
  const todayLong = fmtDateLong(today);

  const patientAddr =
    patient?.physical_address || patient?.postal_address || patient?.address || "";

  const currency = invoice?.currency || "ZAR";

  const map: Record<string, string> = {
    // Patient
    PatientName: patient?.name || "",
    ClientName: patient?.name || "",
    FirstName: patient?.first_name || "",
    LastName: patient?.last_name || "",
    PatientAddress: patientAddr,
    MedicalAid: patient?.medical_aid || "",
    MedicalAidNumber: patient?.medical_aid_number || "",
    PrimaryMember: patient?.primary_member || "",
    IDNumber: patient?.id_passport_number || "",
    DOB: patient?.dob || "",
    Phone: patient?.phone || "",
    Email: patient?.email || "",
    Allergies: formatAllergies(patient),
    Pharmacy: patient?.pharmacy_name || "",
    ClaimsEmail: patient?.claims_email || "",

    // Practice / Doctor
    DoctorName: profile?.full_name || "",
    DoctorNumber: profile?.doctor_number || "",
    RegistrationNumber: profile?.doctor_number || "",
    PracticeNumber: profile?.practice_number || "",
    PracticeAddress: profile?.practice_address || "",
    Specialty: profile?.specialty || "",
    BankDetails:
      profile?.bank_account_details ||
      (profile as any)?.bank_details ||
      "",

    // Time
    Date: todayLong,
    SessionDate: todayLong,
    Today: todayLong,
    PrescriptionDate: todayLong,
    SignatureDate: todayLong,
    ConsultationDate: certificate?.consultation_date
      ? fmtDateLong(certificate.consultation_date)
      : todayLong,

    // Medical certificate / sick note details
    ConsultationTime: certificate?.consultation_time || "",
    NatureOfIllness: certificate?.nature_of_illness || "",
    SickLeaveFrom: certificate?.sick_leave_from ? fmtDateLong(certificate.sick_leave_from) : "",
    SickLeaveUntil: certificate?.sick_leave_until ? fmtDateLong(certificate.sick_leave_until) : "",
    Inclusive: certificate?.inclusive || "(both days inclusive)",
    OtherRecommendations: certificate?.other_recommendations || "",

    ReferralDate: todayLong,
    AdmissionDate: todayLong,

    // Signature — uploaded image when present, otherwise the typed signature
    // (font / colour / size configured in My Practice). Plain-text callers
    // (raw textarea editors) get the doctor's name instead of signature markup.
    DoctorSignature: plainText ? profile?.full_name || "" : renderSignatureHtml(profile),
    Signature: plainText ? profile?.full_name || "" : renderSignatureHtml(profile),



    // Invoice (optional)
    InvoiceNumber: invoice?.invoice_number || "",
    InvoiceDate: invoice?.created_at ? fmtDateLong(invoice.created_at) : todayLong,
    DueDate: invoice?.due_date ? fmtDateLong(invoice.due_date) : "",
    PaidDate: invoice?.paid_at ? fmtDateLong(invoice.paid_at) : "",
    Services:
      invoice?.services_html ||
      (invoice?.description ? invoice.description.replace(/\n/g, "<br/>") : ""),
    TotalAmount: invoice ? fmtAmount(invoice.amount ?? 0, currency) : "",
    Amount: invoice ? fmtAmount(invoice.amount ?? 0, currency) : "",
    Currency: currency,

    // Prescription (optional)
    NumberOfRepeats: prescription?.repeats != null ? String(prescription.repeats) : "",
    Repeats: prescription?.repeats != null ? String(prescription.repeats) : "",
    SpecialInstructions:
      prescription?.special_instructions || prescription?.notes || "",
  };

  // Indexed prescription slots — register as known so unused slots render blank, not ___
  const slotKeys = new Set<string>();
  const meds = prescription?.medications || [];
  const slotMax = Math.max(3, meds.length);
  for (let i = 1; i <= slotMax; i++) {
    const m = meds[i - 1];
    map[`Medication${i}`] = m?.medication || m?.name || "";
    map[`Dosage${i}`] = m?.dosage || "";
    map[`Quantity${i}`] = m?.quantity || "";
    map[`Frequency${i}`] = m?.frequency || "";
    map[`Instructions${i}`] = m?.instructions || "";
    slotKeys.add(`medication${i}`);
    slotKeys.add(`dosage${i}`);
    slotKeys.add(`quantity${i}`);
    slotKeys.add(`frequency${i}`);
    slotKeys.add(`instructions${i}`);
  }

  // Build a case-insensitive, space-insensitive lookup table.
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) {
    normalized[k.toLowerCase().replace(/\s+/g, "")] = v;
  }
  return { lookup: normalized, slotKeys };
}

export interface FillResult {
  content: string;
  replacedCount: number;
  hadPlaceholders: boolean;
}

/**
 * Replace [Token] / [Token Name] placeholders in content.
 * - Case-insensitive, space-insensitive (so [Patient Name] === [PatientName]).
 * - Known tokens with empty values render as "___" (so the layout stays clean).
 * - Unknown tokens render as "___".
 * - Returns counts so callers can decide whether to auto-heal the stored doc.
 */
export function fillDocumentPlaceholders(
  content: string,
  ctx: FillContext,
): FillResult {
  if (!content) return { content: "", replacedCount: 0, hadPlaceholders: false };

  const { lookup, slotKeys } = buildReplacements(ctx);
  let replacedCount = 0;
  let hadPlaceholders = false;
  const blank = ctx.plainText ? "___" : `<span style="color:#999;">___</span>`;

  // Match [Word] or [Two Words] etc. — letters, digits, spaces, underscore, hyphen.
  const resolved = content.replace(/\[([A-Za-z][A-Za-z0-9_ -]*)\]/g, (_full, token: string) => {
    hadPlaceholders = true;
    const key = token.toLowerCase().replace(/\s+/g, "");
    if (key in lookup) {
      const val = lookup[key];
      if (val && val.trim() !== "") {
        replacedCount += 1;
        return val;
      }
      // Indexed prescription slot or optional field with no data — mark the line
      // so the whole "Dosage:" / "2." skeleton row can be pruned below.
      if (slotKeys.has(key) || OPTIONAL_TOKENS.has(key)) return EMPTY_MARK;
      // Known token, no value — render as quiet underscore placeholder.
      return blank;
    }
    // Unknown token — same quiet placeholder so brackets never leak through.
    return blank;
  });

  const pruned = pruneEmptyLines(resolved);

  // Legacy templates hardcode an "INV-" prefix before [InvoiceNumber], while the
  // generated number already carries it. Collapse any duplicated prefix.
  const deduped = pruned.replace(/\bINV-(?:INV-)+/gi, "INV-");

  return { content: deduped, replacedCount, hadPlaceholders };
}

/** Sentinel injected where an optional/indexed token resolved to nothing. */
const EMPTY_MARK = "\u0000EMPTY\u0000";

/** Single-line optional fields that should vanish entirely when blank. */
const OPTIONAL_TOKENS = new Set([
  "specialinstructions",
  "numberofrepeats",
  "repeats",
]);

/**
 * Removes prescription rows whose value resolved to nothing (e.g. an unused
 * medication slot leaving behind "2." / "Dosage:" / "Instructions:"), then
 * renumbers the surviving medication entries and collapses blank-line runs.
 */
function pruneEmptyLines(content: string): string {
  if (!content.includes(EMPTY_MARK)) return content;

  const usesBr = /<br\s*\/?>/i.test(content);
  const parts = usesBr ? content.split(/<br\s*\/?>/i) : content.split("\n");

  const kept: string[] = [];
  for (const raw of parts) {
    if (!raw.includes(EMPTY_MARK)) {
      kept.push(raw);
      continue;
    }
    const withoutMark = raw.split(EMPTY_MARK).join("");
    // Strip a leading list marker and a "Label:" prefix — if nothing meaningful
    // remains, the row only existed to hold the missing value.
    const remainder = withoutMark
      .replace(/^\s*(?:\d+[.)]|[-•*])\s*/, "")
      .replace(/^[^:<]{0,60}:\s*/, "")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (remainder === "") continue;
    kept.push(withoutMark);
  }

  // Renumber surviving "1." / "2." medication rows.
  let n = 0;
  const renumbered = kept.map((line) =>
    /^\s*\d+[.)]\s*\S/.test(line)
      ? line.replace(/^(\s*)\d+([.)])/, (_m, pad) => `${pad}${++n}.`)
      : line,
  );

  const joined = usesBr ? renumbered.join("<br>") : renumbered.join("\n");
  return usesBr
    ? joined.replace(/(?:<br>\s*){3,}/gi, "<br><br>")
    : joined.replace(/\n{3,}/g, "\n\n");
}


/**
 * True if the content still contains any unresolved [Token] placeholder.
 */
export function hasUnresolvedPlaceholders(content: string): boolean {
  if (!content) return false;
  return /\[([A-Za-z][A-Za-z0-9_ -]*)\]/.test(content);
}
