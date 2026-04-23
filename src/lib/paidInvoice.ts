// Thin wrapper around the shared invoice HTML renderer.
// Kept for backward compatibility with existing callers.

import {
  buildInvoiceHtml,
  type BuildInvoiceArgs,
} from "@/lib/invoiceHtml";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  description: string;
  amount: number | string;
  due_date: string;
  paid_at?: string | null;
  session_id?: string | null;
  patient: { id: string; name: string } | null;
  created_at?: string | null;
}

type PatientLite = NonNullable<BuildInvoiceArgs["patient"]>;
type ProfileLite = NonNullable<BuildInvoiceArgs["profile"]>;

export async function buildPaidInvoiceHtml(
  invoice: InvoiceRow,
  patient: PatientLite | null,
  profile: ProfileLite | null,
  paidAt: Date,
  currency = "ZAR",
): Promise<string> {
  return buildInvoiceHtml({
    invoice: {
      ...invoice,
      paid_at: invoice.paid_at || paidAt.toISOString(),
    },
    patient,
    profile,
    currency,
    paid: true,
  });
}
