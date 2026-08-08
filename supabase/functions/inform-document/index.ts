import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const documentId: string = body?.documentId;
    const recipientEmail: string = (body?.recipientEmail || "").trim().toLowerCase();
    const message: string | null = body?.message ?? null;

    if (!documentId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return new Response(JSON.stringify({ error: "documentId and a valid recipientEmail are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The caller must be able to read the document under their own RLS.
    const { data: doc, error: docError } = await supabaseAuth
      .from("documents")
      .select("id, name, patient_name")
      .eq("id", documentId)
      .maybeSingle();
    if (docError || !doc) {
      return new Response(JSON.stringify({ error: "Document not found or not accessible" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: recipientProfile } = await admin
      .from("profiles")
      .select("id, full_name")
      .ilike("email", recipientEmail)
      .maybeSingle();

    const { data: share, error: shareError } = await admin
      .from("document_shares")
      .insert({
        document_id: documentId,
        shared_by: user.id,
        recipient_email: recipientEmail,
        recipient_user_id: recipientProfile?.id ?? null,
        message,
      })
      .select("token")
      .single();
    if (shareError) throw shareError;

    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const senderName = senderProfile?.full_name || "A colleague";

    const origin = req.headers.get("origin") || "https://holarchealth.com";
    const isRegistered = !!recipientProfile;
    const link = isRegistered
      ? `${origin}/documents?view=${documentId}&share=${share.token}`
      : `${origin}/auth?redirect=${encodeURIComponent(
          `/documents?view=${documentId}&share=${share.token}`,
        )}`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 12px;">${senderName} shared a document with you</h2>
        <p style="margin:0 0 8px;"><strong>${doc.name}</strong>${
          doc.patient_name ? ` — ${doc.patient_name}` : ""
        }</p>
        ${message ? `<p style="margin:0 0 16px;white-space:pre-wrap;">${message}</p>` : ""}
        <p style="margin:0 0 16px;">
          The document is not attached. It stays securely in Holarc Health and can be
          opened with the link below.
        </p>
        <p style="margin:0 0 24px;">
          <a href="${link}" style="background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">
            ${isRegistered ? "Open document" : "Register to view document"}
          </a>
        </p>
        <p style="font-size:12px;color:#666;">Sent via Holarc Health.</p>
      </div>`;

    const result = await sendEmail({
      to: recipientEmail,
      subject: `${senderName} shared "${doc.name}" with you`,
      html,
    });
    if (!result.ok) throw new Error(result.error || "Failed to send email");

    return new Response(JSON.stringify({ success: true, isRegistered, link }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const messageText = error instanceof Error ? error.message : "Unknown error";
    console.error("inform-document error:", messageText);
    return new Response(JSON.stringify({ error: messageText }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
