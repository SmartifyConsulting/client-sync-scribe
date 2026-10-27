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
  client: { id: string; name: string } | null;
  created_at?: string | null;
}

type ClientLite = NonNullable<BuildInvoiceArgs["client"]>;
type ProfileLite = NonNullable<BuildInvoiceArgs["profile"]>;

export async function buildPaidInvoiceHtml(
  invoice: InvoiceRow,
  client: ClientLite | null,
  profile: ProfileLite | null,
  paidAt: Date,
  currency = "ZAR",
): Promise<string> {
  return buildInvoiceHtml({
    invoice: {
      ...invoice,
      paid_at: invoice.paid_at || paidAt.toISOString(),
    },
    client,
    profile,
    currency,
    paid: true,
  });
}
