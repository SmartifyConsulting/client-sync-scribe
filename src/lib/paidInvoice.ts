// Helper to render a PAID-stamped invoice document.
// Uses the doctor's existing Invoice template content when available,
// otherwise builds a sensible fallback from the invoice + patient + profile.

import { supabase } from "@/integrations/supabase/client";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  description: string;
  amount: number | string;
  due_date: string;
  paid_at?: string | null;
  session_id?: string | null;
  patient: { id: string; name: string } | null;
}

interface PatientLite {
  id: string;
  name: string;
  physical_address?: string | null;
  postal_address?: string | null;
  address?: string | null;
  medical_aid?: string | null;
  medical_aid_number?: string | null;
  primary_member?: string | null;
  claims_email?: string | null;
}

interface ProfileLite {
  full_name?: string | null;
  practice_number?: string | null;
  doctor_number?: string | null;
  practice_address?: string | null;
  logo_url?: string | null;
  signature_url?: string | null;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  ZAR: "R", USD: "$", EUR: "€", GBP: "£", BWP: "P", NAD: "N$", SZL: "E", LSL: "M",
};

function fmtAmount(amount: number, currency = "ZAR") {
  const sym = CURRENCY_SYMBOL[currency] || currency;
  return `${sym} ${Number(amount).toFixed(2)}`;
}

function fmtDateLong(d: Date) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Try to find an existing auto-generated Invoice document for this invoice's session.
 * Returns the rendered template content (already has placeholders replaced) or null.
 */
async function fetchExistingInvoiceContent(invoice: InvoiceRow): Promise<string | null> {
  if (!invoice.session_id) return null;
  const { data } = await supabase
    .from("documents")
    .select("content, template_name")
    .eq("session_id", invoice.session_id)
    .eq("template_name", "Invoice")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.content || null;
}

function buildFallbackInvoiceHtml(
  invoice: InvoiceRow,
  patient: PatientLite | null,
  profile: ProfileLite | null,
  currency: string,
): string {
  const patientAddr =
    patient?.physical_address || patient?.postal_address || patient?.address || "";
  return `
<div style="padding:24px;font-family:Arial,sans-serif;color:#222;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
    <div>
      <div style="font-weight:bold;font-size:16px;">${profile?.full_name || ""}</div>
      ${profile?.practice_number ? `<div>Practice No: ${profile.practice_number}</div>` : ""}
      ${profile?.doctor_number ? `<div>Doctor No: ${profile.doctor_number}</div>` : ""}
      ${profile?.practice_address ? `<div style="white-space:pre-line;">${profile.practice_address}</div>` : ""}
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:bold;">INVOICE</div>
      <div>#${invoice.invoice_number}</div>
      <div>Date: ${fmtDateLong(new Date())}</div>
      <div>Due: ${fmtDateLong(new Date(invoice.due_date))}</div>
    </div>
  </div>

  <div style="margin-bottom:18px;">
    <div style="font-weight:bold;margin-bottom:4px;">Bill To</div>
    <div>${patient?.name || invoice.patient?.name || ""}</div>
    ${patientAddr ? `<div style="white-space:pre-line;">${patientAddr}</div>` : ""}
    ${patient?.medical_aid ? `<div>Medical Aid: ${patient.medical_aid}${patient.medical_aid_number ? ` (${patient.medical_aid_number})` : ""}</div>` : ""}
    ${patient?.primary_member ? `<div>Primary Member: ${patient.primary_member}</div>` : ""}
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
    <thead>
      <tr style="background:#f4f4f4;">
        <th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;">Description</th>
        <th style="text-align:right;padding:8px;border-bottom:1px solid #ddd;">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${invoice.description || "Consultation"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtAmount(Number(invoice.amount), currency)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr>
        <td style="padding:8px;text-align:right;font-weight:bold;">Total</td>
        <td style="padding:8px;text-align:right;font-weight:bold;">${fmtAmount(Number(invoice.amount), currency)}</td>
      </tr>
    </tfoot>
  </table>
</div>`.trim();
}

/**
 * Build the full PAID-stamped invoice HTML email body.
 * The PAID watermark is a CSS-rotated overlay anchored to the wrapper.
 */
export async function buildPaidInvoiceHtml(
  invoice: InvoiceRow,
  patient: PatientLite | null,
  profile: ProfileLite | null,
  paidAt: Date,
  currency = "ZAR",
): Promise<string> {
  let body = await fetchExistingInvoiceContent(invoice);
  if (!body) {
    body = buildFallbackInvoiceHtml(invoice, patient, profile, currency);
  }

  const paidDate = fmtDateLong(paidAt);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoice_number} — PAID</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="position:relative;max-width:820px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;overflow:hidden;">
    <div style="position:relative;">
      ${body}
      <div style="
        position:absolute;
        top:50%;
        left:50%;
        transform:translate(-50%,-50%) rotate(-25deg);
        text-align:center;
        pointer-events:none;
        z-index:9999;
      ">
        <div style="
          color:#E01837;
          opacity:0.32;
          font-size:140px;
          font-weight:900;
          letter-spacing:8px;
          border:10px solid #E01837;
          padding:10px 40px;
          line-height:1;
          font-family:Arial,sans-serif;
        ">PAID</div>
        <div style="
          color:#E01837;
          opacity:0.55;
          font-size:14px;
          font-weight:bold;
          margin-top:8px;
          letter-spacing:2px;
        ">Paid on ${paidDate}</div>
      </div>
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eee;font-size:11px;color:#777;text-align:center;">
      This is a paid invoice copy. Reference: ${invoice.invoice_number}
    </div>
  </div>
</body>
</html>`.trim();
}
