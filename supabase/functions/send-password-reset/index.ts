// Sends a branded Holarc Wealth password-reset email via Resend.
// Public endpoint: validates email format only. Always returns 200 to avoid
// leaking which addresses are registered.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://holarchealth.com";

const BodySchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url().optional(),
});

function brandedHtml(ctaUrl: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <tr><td style="background:#E01837;padding:20px 24px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Holarc Wealth</h1>
        </td></tr>
        <tr><td style="padding:28px 24px">
          <h2 style="margin:0 0 12px;font-size:22px;color:#111">Reset your password</h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151">
            We received a request to reset the password for your Holarc Wealth account.
            Click the button below to choose a new one. This link expires in 1 hour.
          </p>
          <p style="margin:0 0 24px">
            <a href="${ctaUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">Reset Password</a>
          </p>
          <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.5">
            If you didn't request a password reset, you can safely ignore this email — your password won't change.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280">
          © Holarc Wealth · <a href="${SITE_URL}" style="color:#0f766e;text-decoration:none">holarchealth.com</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const { email, redirectTo } = parsed.data;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });

    // Don't leak whether the email exists — always return ok.
    if (linkErr || !linkData) {
      console.warn("generateLink failed (silenced):", linkErr?.message);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionUrl =
      (linkData as any).properties?.action_link ||
      (linkData as any).action_link;
    if (!actionUrl) {
      console.warn("No action link returned");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendEmail({
      to: email,
      subject: "Reset your Holarc Wealth password",
      html: brandedHtml(actionUrl),
    });
    const resendId =
      (result.data && typeof result.data === "object" && (result.data as any).id) || null;
    console.log("[send-password-reset] dispatch", {
      to: email,
      ok: result.ok,
      status: result.status,
      resend_id: resendId,
    });
    if (!result.ok) {
      console.error("Resend send failed:", result.status, result.error);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("send-password-reset error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
