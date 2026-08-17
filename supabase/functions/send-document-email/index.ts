import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";
import {
  brandedEmail,
  escapeHtml,
  fetchInlineAttachment,
  HOLARC_LOGO_CID,
  HOLARC_LOGO_URL,
  HOLARC_SIGNATURE_CID,
} from "../_shared/brandEmail.ts";
import { renderSignatureHtml, buildGreeting } from "../_shared/signature.ts";

const APP_URL = "https://holarchealth.com";

/** Pull the inner markup out of a full HTML document so it can be re-wrapped. */
function extractBody(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}

/**
 * Document content is stored as a mix of plain text and light HTML. Escaping it
 * wholesale printed literal `<br>` tags in the inbox, so convert the structural
 * markup to real line breaks, drop any remaining tags, then escape what's left
 * and re-introduce `<br/>` for the newlines.
 */
function normaliseDocumentContent(raw: string): string {
  const withBreaks = raw
    .replace(/\r\n/g, "\n")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*(p|div|li|tr|h[1-6])[^>]*>/gi, "")
    .replace(/<\s*\/?\s*(ul|ol|table|tbody|thead|span|font)[^>]*>/gi, "");

  // Preserve simple inline emphasis, escape everything else.
  const placeholders: Record<string, string> = {
    "\u0001b\u0002": "<b>",
    "\u0001/b\u0002": "</b>",
    "\u0001i\u0002": "<i>",
    "\u0001/i\u0002": "</i>",
    "\u0001u\u0002": "<u>",
    "\u0001/u\u0002": "</u>",
  };
  let working = withBreaks
    .replace(/<\s*(b|strong)\s*>/gi, "\u0001b\u0002")
    .replace(/<\s*\/\s*(b|strong)\s*>/gi, "\u0001/b\u0002")
    .replace(/<\s*(i|em)\s*>/gi, "\u0001i\u0002")
    .replace(/<\s*\/\s*(i|em)\s*>/gi, "\u0001/i\u0002")
    .replace(/<\s*u\s*>/gi, "\u0001u\u0002")
    .replace(/<\s*\/\s*u\s*>/gi, "\u0001/u\u0002")
    // Anything still tag-shaped is stray markup — remove it.
    .replace(/<[^>]+>/g, "");

  working = working
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  for (const [token, tag] of Object.entries(placeholders)) {
    working = working.split(token).join(tag);
  }

  return working
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n/g, "<br/>");
}


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

    if (body.documentId && !documentHtml && (!subject || !documentContent)) {
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
      const attachAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: rows, error: attachError } = await attachAdmin
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

    // ---- Sender signature, recipient greeting and app deep link ----
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let signatureHtml = "";
    let signatureAttachment: Awaited<ReturnType<typeof fetchInlineAttachment>> = null;
    try {
      const { data: senderProfile } = await admin
        .from("profiles")
        .select(
          "full_name, signature_url, signature_render_url, signature_font, signature_color, signature_font_size, signature_bold, signature_italic",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (senderProfile) {
        // Embed the signature image inline when we have one, so the doctor's
        // chosen handwriting font survives clients that block web fonts.
        const sigUrl =
          (senderProfile as any).signature_url || (senderProfile as any).signature_render_url;
        if (sigUrl) {
          signatureAttachment = await fetchInlineAttachment(
            sigUrl,
            "signature.png",
            HOLARC_SIGNATURE_CID,
          );
        }
        signatureHtml = renderSignatureHtml(
          senderProfile as any,
          signatureAttachment ? { inlineCid: HOLARC_SIGNATURE_CID } : undefined,
        );
        senderName = body.senderName || (senderProfile as any).full_name || senderName;
      }
      if (!practiceName) {
        const { data: practice } = await admin
          .from("practices")
          .select("name")
          .eq("owner_id", user.id)
          .maybeSingle();
        practiceName = (practice as any)?.name || practiceName;
      }
    } catch (e) {
      console.error("Signature lookup failed", e);
    }

    // Resolve the recipient's real name so we never greet "Dear Colleague".
    let greeting: string | null = typeof body.greeting === "string" ? body.greeting : null;
    let recipientIsPatient = false;
    if (!greeting && to) {
      try {
        const { data: pt } = await admin
          .from("patients")
          .select("name")
          .ilike("email", String(to))
          .limit(1)
          .maybeSingle();
        if ((pt as any)?.name) {
          recipientIsPatient = true;
          greeting = buildGreeting({ fullName: (pt as any).name });
        }
      } catch (e) {
        console.error("Recipient lookup failed", e);
      }
    }
    if (!greeting && body.recipientName) {
      greeting = buildGreeting({ fullName: body.recipientName, isPractitioner: true });
    }

    const documentUrl = body.documentId
      ? `${APP_URL}${recipientIsPatient ? `/patient/documents?doc=${body.documentId}` : `/documents?view=${body.documentId}`}`
      : null;

    const greetingHtml = greeting
      ? `<p style="margin:0 0 14px 0;">${escapeHtml(greeting)},</p>`
      : "";

    if (!to || !subject || (!documentContent && !documentHtml)) {
      throw new Error("Missing required fields: to, subject, documentContent or documentHtml");
    }

    // Inline the logo so recipients see it without trusting remote images.
    const logoAttachment = await fetchInlineAttachment(
      HOLARC_LOGO_URL,
      "holarc-health.png",
      HOLARC_LOGO_CID,
    );

    let htmlContent: string;
    if (documentHtml) {
      // Caller supplied a fully-rendered HTML document (e.g. PAID invoice).
      // Keep the document markup exactly as rendered on screen, but drop it
      // inside the Holarc Health branded shell.
      const inner = extractBody(documentHtml);
      htmlContent = brandedEmail({
        title: documentName,
        subtitle: practiceName,
        senderName,
        practiceName,
        documentUrl,
        signatureHtml,
        inlineLogo: !!logoAttachment,
        bodyHtml: `${greetingHtml}<div style="border:1px solid #e5e7eb;border-radius:10px;padding:20px;background:#ffffff;">${inner}</div>`,
      });
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

      const attachmentsHtml = attachedDocs
        .map(
          (d) => `
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
              <div style="font-weight:600;margin-bottom:8px;">Attachment: ${escapeHtml(d.name)}</div>
              <div style="white-space:pre-wrap;">${d.content
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br/>")}</div>
            </div>`,
        )
        .join("");

      htmlContent = brandedEmail({
        title: documentName,
        subtitle: practiceName,
        senderName,
        practiceName,
        documentUrl,
        signatureHtml,
        inlineLogo: !!logoAttachment,
        bodyHtml: `${greetingHtml}<div style="white-space:pre-wrap;">${formattedContent}</div>${attachmentsHtml}`,
      });
    }


    const result = await sendEmail({
      to,
      cc,
      subject,
      html: htmlContent,
      replyTo,
      attachments: (() => {
        const all = [...attachments];
        if (logoAttachment) all.push(logoAttachment);
        if (signatureAttachment) all.push(signatureAttachment);
        return all.length ? all : undefined;
      })(),
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
