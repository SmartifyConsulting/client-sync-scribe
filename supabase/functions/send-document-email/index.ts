import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const cc: string | string[] | undefined = body.cc;
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
    const attachments = rawAttachments
      .filter((a: any) => a && typeof a.filename === "string" && typeof a.content === "string")
      .slice(0, 5)
      .map((a: any) => ({
        filename: a.filename,
        content: a.content,
        contentType: typeof a.contentType === "string" ? a.contentType : "application/pdf",
      }));
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

    // Optional: additional saved documents that must be emailed together with
    // this one (used by referral letters with attachments).
    const attachedDocumentIds: string[] = Array.isArray(body.attachedDocumentIds)
      ? body.attachedDocumentIds.filter((id: unknown) => typeof id === "string")
      : [];
    let attachedDocs: Array<{ name: string; content: string }> = [];
    if (attachedDocumentIds.length > 0) {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: rows, error: attachError } = await admin
        .from("documents")
        .select("name, content")
        .in("id", attachedDocumentIds.slice(0, 20));
      if (attachError) {
        console.error("Failed to load attachments:", attachError.message);
      } else {
        attachedDocs = (rows || []).map((r: any) => ({
          name: r.name || "Document",
          content: r.content || "",
        }));
      }
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
            ${attachedDocs
              .map(
                (d) => `
              <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e5e5;">
                <div style="font-weight:bold;margin-bottom:8px;">Attachment: ${d.name}</div>
                <div style="white-space:pre-wrap;">${d.content
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/\n/g, "<br/>")}</div>
              </div>`,
              )
              .join("")}
            <div class="footer">
              Sent by ${senderName}${practiceName ? ` - ${practiceName}` : ""}
            </div>
          </div>
        </body>
        </html>
      `;
    }

    const result = await sendEmail({
      to,
      cc,
      subject,
      html: htmlContent,
      replyTo,
      attachments: attachments.length ? attachments : undefined,
    });

    if (!result.ok) {
      console.error("Email send error:", result.error);
      throw new Error(result.error || "Failed to send email");
    }
    const data = result.data;

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
