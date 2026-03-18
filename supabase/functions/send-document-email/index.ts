import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  documentName: string;
  documentContent: string;
  senderName: string;
  practiceName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { to, subject, documentName, documentContent, senderName, practiceName }: EmailRequest = await req.json();

    if (!to || !subject || !documentContent) {
      throw new Error("Missing required fields: to, subject, documentContent");
    }

    // Format document content as HTML
    const formattedContent = documentContent
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/&lt;b&gt;/g, "<b>")
      .replace(/&lt;\/b&gt;/g, "</b>")
      .replace(/&lt;i&gt;/g, "<i>")
      .replace(/&lt;\/i&gt;/g, "</i>")
      .replace(/&lt;u&gt;/g, "<u>")
      .replace(/&lt;\/u&gt;/g, "</u>")
      .replace(/\n/g, "<br/>");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .document-container { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px; 
            background: #fff;
            border: 1px solid #e5e5e5;
          }
          .header { margin-bottom: 20px; color: #666; font-size: 12px; }
          .content { white-space: pre-wrap; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="document-container">
          <div class="header">
            <strong>${documentName}</strong>
            ${practiceName ? `<br/>From: ${practiceName}` : ""}
          </div>
          <div class="content">${formattedContent}</div>
          <div class="footer">
            Sent by ${senderName}${practiceName ? ` - ${practiceName}` : ""}
          </div>
        </div>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Holarc Health <noreply@smartify.co.za>",
        to: [to],
        subject: subject,
        html: htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending document email:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
