import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MonthData {
  month: string;
  invoiceCount: number;
  total: string;
  paid: string;
  outstanding: string;
}

interface ReportRequest {
  email: string;
  doctorName: string;
  practiceNumber: string;
  dateFrom: string;
  dateTo: string;
  reportData: MonthData[];
  totals: {
    invoiceCount: number;
    total: string;
    paid: string;
    outstanding: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-invoice-report function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, doctorName, practiceNumber, dateFrom, dateTo, reportData, totals }: ReportRequest = await req.json();

    console.log(`Sending invoice report to: ${email}`);

    // Build the monthly breakdown table rows
    const monthlyRows = reportData
      .map(
        (month) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${month.month}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${month.invoiceCount}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">R ${month.total}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #16a34a;">R ${month.paid}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #d97706;">R ${month.outstanding}</td>
      </tr>
    `,
      )
      .join("");

    const reportBody = `
        <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Report Period: <strong>${dateFrom}</strong> to <strong>${dateTo}</strong>
          </p>
        </div>



        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Summary</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
          <div style="background: #f9fafb; border-radius: 8px; padding: 15px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Total Invoices</p>
            <p style="color: #1f2937; margin: 5px 0 0; font-size: 24px; font-weight: bold;">${totals.invoiceCount}</p>
          </div>
          <div style="background: #f9fafb; border-radius: 8px; padding: 15px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">Total Amount</p>
            <p style="color: #1f2937; margin: 5px 0 0; font-size: 24px; font-weight: bold;">R ${totals.total}</p>
          </div>
          <div style="background: #dcfce7; border-radius: 8px; padding: 15px;">
            <p style="color: #16a34a; margin: 0; font-size: 14px;">Paid</p>
            <p style="color: #16a34a; margin: 5px 0 0; font-size: 24px; font-weight: bold;">R ${totals.paid}</p>
          </div>
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px;">
            <p style="color: #d97706; margin: 0; font-size: 14px;">Outstanding</p>
            <p style="color: #d97706; margin: 5px 0 0; font-size: 24px; font-weight: bold;">R ${totals.outstanding}</p>
          </div>
        </div>

        <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Monthly Breakdown</h2>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 12px; text-align: left; font-weight: 600; color: #6b7280; font-size: 14px;">Month</th>
              <th style="padding: 12px; text-align: center; font-weight: 600; color: #6b7280; font-size: 14px;">Invoices</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; font-size: 14px;">Total</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; font-size: 14px;">Paid</th>
              <th style="padding: 12px; text-align: right; font-weight: 600; color: #6b7280; font-size: 14px;">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            ${monthlyRows}
            <tr style="background: #f9fafb; font-weight: bold;">
              <td style="padding: 12px;">Total</td>
              <td style="padding: 12px; text-align: center;">${totals.invoiceCount}</td>
              <td style="padding: 12px; text-align: right;">R ${totals.total}</td>
              <td style="padding: 12px; text-align: right; color: #16a34a;">R ${totals.paid}</td>
              <td style="padding: 12px; text-align: right; color: #d97706;">R ${totals.outstanding}</td>
            </tr>
          </tbody>
        </table>

        <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
          Generated on ${new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
    `;

    const html = brandedEmail({
      title: "Invoice Report",
      subtitle: practiceNumber ? `${doctorName} · Practice No: ${practiceNumber}` : doctorName,
      senderName: doctorName,
      bodyHtml: reportBody,
      footerNote: "This report was generated automatically by Holarc Health.",
    });


    const emailResponse = await sendEmail({
      to: email,
      subject: `Invoice Report: ${dateFrom} to ${dateTo}`,
      html,
    });
    if (!emailResponse.ok) {
      throw new Error(emailResponse.error || "Failed to send invoice report");
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-invoice-report function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
