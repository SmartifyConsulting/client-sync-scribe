// Shared placeholder filler for document templates.
// Replaces tokens like [PatientName], [Patient Name], [InvoiceNumber] (case-insensitive)
// with real values from patient / profile / invoice / time. Unmatched tokens become "___".

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
  pharmacy_name?: string | null;
  claims_email?: string | null;
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

export interface FillContext {
  patient?: FillPatient | null;
  profile?: FillProfile | null;
  invoice?: FillInvoice | null;
  prescription?: FillPrescription | null;
  today?: Date;
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
  const { patient, profile, invoice, prescription } = ctx;
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
    Allergies: patient?.allergies || "",
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
    ConsultationDate: todayLong,
    ReferralDate: todayLong,
    AdmissionDate: todayLong,

    // Signature — rendered as inline image when available
    DoctorSignature: profile?.signature_url
      ? `<img src="${profile.signature_url}" alt="Signature" style="max-height:60px;display:inline-block;" />`
      : "",
    Signature: profile?.signature_url
      ? `<img src="${profile.signature_url}" alt="Signature" style="max-height:60px;display:inline-block;" />`
      : "",


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
      // Indexed prescription slot with no data — render blank so unused rows disappear
      if (slotKeys.has(key)) return "";
      // Known token, no value — render as quiet underscore placeholder.
      return `<span style="color:#999;">___</span>`;
    }
    // Unknown token — same quiet placeholder so brackets never leak through.
    return `<span style="color:#999;">___</span>`;
  });

  return { content: resolved, replacedCount, hadPlaceholders };
}

/**
 * True if the content still contains any unresolved [Token] placeholder.
 */
export function hasUnresolvedPlaceholders(content: string): boolean {
  if (!content) return false;
  return /\[([A-Za-z][A-Za-z0-9_ -]*)\]/.test(content);
}
