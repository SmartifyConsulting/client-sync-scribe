import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendMailgunEmail } from "../_shared/mailgun.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    let to = body.to;
    let subject = body.subject;
    let documentContent = body.documentContent;
    const documentHtml: string | undefined = body.documentHtml;
    const replyTo: string | undefined = body.replyTo;
    let documentName = body.documentName || "Document";
    let senderName = body.senderName || "Holarc Health";
    let practiceName = body.practiceName;

    // Handle the { documentId, recipientEmail } pattern
    if (!to && body.recipientEmail) {
      to = body.recipientEmail;
    }

    if (body.documentId && (!subject || !documentContent)) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("name, content, patient_name, template_name")
        .eq("id", body.documentId)
        .single();

      if (docError || !doc) {
        throw new Error(`Document not found: ${docError?.message || "unknown"}`);
      }

      documentName = doc.name || documentName;
      documentContent = documentContent || doc.content;
      subject = subject || `${documentName}${doc.patient_name ? ` - ${doc.patient_name}` : ""}`;
    }

    if (!to || !subject || (!documentContent && !documentHtml)) {
      throw new Error("Missing required fields: to, subject, documentContent or documentHtml");
    }

    let htmlContent: string;
    if (documentHtml) {
      // Caller supplied a fully-rendered HTML document (e.g. PAID invoice).
      // Use as-is so visual layout (watermark, letterhead, etc.) is preserved.
      htmlContent = documentHtml;
    } else {
      // Format document content as HTML (legacy text path)
      const formattedContent = (documentContent as string)
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/&lt;b&gt;/g, "<b>")
        .replace(/&lt;\/b&gt;/g, "</b>")
        .replace(/&lt;i&gt;/g, "<i>")
        .replace(/&lt;\/i&gt;/g, "</i>")
        .replace(/&lt;u&gt;/g, "<u>")
        .replace(/&lt;\/u&gt;/g, "</u>")
        .replace(/\n/g, "<br/>");

      htmlContent = `
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
    }

    const resendPayload: Record<string, unknown> = {
      from: "Holarc Health <noreply@smartify.co.za>",
      to: [to],
      subject: subject,
      html: htmlContent,
    };
    if (replyTo) resendPayload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendPayload),
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
