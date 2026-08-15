// Shared invoice HTML renderer used by:
//   - the doctor's "Preview" action on every invoice row
//   - the PAID-stamped email/document path (paidInvoice.ts wraps this)
//   - the auto-heal preview path
//
// Renders either the doctor's existing Invoice template (if one was
// generated for the linked session) or a clean fallback layout.

import { supabase } from "@/integrations/supabase/client";
import {
  fillDocumentPlaceholders,
  type FillPatient,
  type FillProfile,
} from "@/lib/fillDocumentPlaceholders";
import { renderSignatureHtml } from "@/lib/signature";
import { HOLARC_EMAIL_LOGO_URL } from "@/features/documents/utils/documentEmailHtml";

export interface BuildInvoiceArgs {
  invoice: {
    id: string;
    invoice_number: string;
    description: string;
    amount: number | string;
    due_date: string;
    created_at?: string | null;
    paid_at?: string | null;
    session_id?: string | null;
    patient: { id: string; name: string } | null;
  };
  patient: FillPatient | null;
  profile: FillProfile | null;
  currency?: string;
  paid?: boolean;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  ZAR: "R", NGN: "₦", USD: "$", EUR: "€", GBP: "£", BWP: "P", SZL: "E", LSL: "M",
};

function fmtAmount(amount: number, currency = "ZAR") {
  const sym = CURRENCY_SYMBOL[currency] || currency;
  return `${sym} ${Number(amount).toFixed(2)}`;
}

function fmtDateLong(d: Date) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Try to find an existing auto-generated Invoice document for this invoice's session
 * and return its (placeholder-resolved) content.
 */
async function fetchExistingInvoiceContent(
  args: BuildInvoiceArgs,
): Promise<string | null> {
  const { invoice, patient, profile, currency = "ZAR" } = args;
  if (!invoice.session_id) return null;
  const { data } = await supabase
    .from("documents")
    .select("content, template_name")
    .eq("session_id", invoice.session_id)
    .eq("template_name", "Invoice")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.content) return null;

  const filled = fillDocumentPlaceholders(data.content, {
    patient,
    profile,
    invoice: {
      invoice_number: invoice.invoice_number,
      description: invoice.description,
      amount: invoice.amount,
      due_date: invoice.due_date,
      created_at: invoice.created_at || null,
      paid_at: invoice.paid_at || null,
      currency,
    },
    today: new Date(),
  });

  // Plain-text content (no block-level HTML) collapses in an iframe.
  // Wrap it so \n line breaks render visually.
  const hasBlockHtml = /<(p|div|br|table|h[1-6]|ul|ol|li|section|article)\b/i.test(filled.content);
  if (!hasBlockHtml) {
    return `<div style="white-space: pre-wrap; font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; color: #222;">${filled.content}</div>`;
  }
  return filled.content;
}

function buildFallbackInvoiceBody(args: BuildInvoiceArgs): string {
  const { invoice, patient, profile, currency = "ZAR" } = args;
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
      <div>Date: ${fmtDateLong(invoice.created_at ? new Date(invoice.created_at) : new Date())}</div>
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

  ${renderSignatureHtml(profile) ? `
  <div style="margin-top:32px;">
    <div>${renderSignatureHtml(profile)}</div>
    <div style="border-top:1px solid #999;margin-top:4px;padding-top:4px;font-size:11px;color:#666;">${profile?.full_name || ""}</div>
  </div>` : ""}
</div>`.trim();
}

/**
 * Returns just the invoice body HTML (no <html>/<body> wrapper, no PAID stamp).
 * Useful when callers want to embed it in another wrapper.
 */
export async function buildInvoiceBodyHtml(args: BuildInvoiceArgs): Promise<string> {
  const fromExisting = await fetchExistingInvoiceContent(args);
  return fromExisting || buildFallbackInvoiceBody(args);
}

/**
 * Returns a complete standalone HTML document for the invoice.
 * If `paid: true`, overlays a diagonal red PAID watermark with the paid date.
 */
export async function buildInvoiceHtml(args: BuildInvoiceArgs): Promise<string> {
  const body = await buildInvoiceBodyHtml(args);
  const { invoice, paid } = args;
  const paidAt = invoice.paid_at ? new Date(invoice.paid_at) : new Date();
  const paidDate = fmtDateLong(paidAt);

  const stamp = paid
    ? `
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
          font-size:56px;
          font-weight:900;
          letter-spacing:4px;
          border:4px solid #E01837;
          padding:6px 24px;
          line-height:1;
          font-family:Arial,sans-serif;
          max-width:380px;
        ">PAID</div>
        <div style="
          color:#E01837;
          opacity:0.55;
          font-size:14px;
          font-weight:bold;
          margin-top:4px;
          letter-spacing:2px;
        ">Paid on ${paidDate}</div>
      </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoice_number}${paid ? " — PAID" : ""}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <div style="position:relative;max-width:820px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;overflow:hidden;">
    <div style="text-align:center;padding:20px 24px 0;">
      <img src="${HOLARC_EMAIL_LOGO_URL}" alt="Holarc Health" style="width:33%;max-width:180px;height:auto;object-fit:contain;" />
    </div>
    <div style="position:relative;">
      ${body}
      ${stamp}
    </div>
    <div style="padding:14px 24px;border-top:1px solid #eee;font-size:11px;color:#777;text-align:center;">
      ${paid ? `This is a paid invoice copy. Reference: ${invoice.invoice_number}` : `Invoice ${invoice.invoice_number}`}
    </div>
  </div>
</body>
</html>`.trim();
}
