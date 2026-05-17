// Auth email sender: bypasses Supabase's built-in auth email pipeline and
// sends recovery / magic-link emails via ZeptoMail (through _shared/email.ts).
//
// Flow: generate a real Supabase action link with the admin API, then deliver
// it ourselves. No SMTP, no auth hook, no hook secret required.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL =
  Deno.env.get("PUBLIC_SITE_URL") || "https://holarchealth.com";

type SendType = "recovery" | "magiclink" | "signup_confirmation";

interface Body {
  type: SendType;
  email: string;
  redirectTo?: string;
}

function brandedHtml(opts: {
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  otp?: string;
  footer?: string;
}) {
  const otpBlock = opts.otp
    ? `<p style="font-size:14px;color:#444;margin:24px 0 8px">Or enter this code:</p>
       <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#0f766e;margin:0">${opts.otp}</p>`
    : "";
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <tr><td style="background:#E01837;padding:20px 24px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">Holarc Health</h1>
        </td></tr>
        <tr><td style="padding:28px 24px">
          <h2 style="margin:0 0 12px;font-size:22px;color:#111">${opts.heading}</h2>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#374151">${opts.intro}</p>
          <p style="margin:0 0 24px">
            <a href="${opts.ctaUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px">${opts.ctaLabel}</a>
          </p>
          ${otpBlock}
          <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.5">${opts.footer || "If you didn't request this, you can safely ignore this email."}</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 24px;text-align:center;font-size:12px;color:#6b7280">
          © Holarc Health · <a href="${SITE_URL}" style="color:#0f766e;text-decoration:none">holarchealth.com</a>
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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { type, email, redirectTo } = body || ({} as Body);
  if (!type || !email) {
    return new Response(JSON.stringify({ error: "type and email required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // For magiclink/recovery the user must already exist. For magiclink we
    // create the user if missing (mirrors signInWithOtp's shouldCreateUser).
    if (type === "magiclink") {
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      // Cheap existence check via getUserByEmail-ish: try createUser idempotently
      // (createUser fails if email exists, which is fine — we just continue).
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      // Ignore "already exists" errors
      if (createErr && !/already/i.test(createErr.message)) {
        console.warn("createUser warning:", createErr.message);
      }
      void existing;
    }

    const linkType =
      type === "recovery" ? "recovery" :
      type === "magiclink" ? "magiclink" :
      "signup";

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: linkType as any,
      email,
      options: redirectTo ? { redirectTo } : undefined,
    });

    if (linkErr || !linkData) {
      console.error("generateLink failed:", linkErr);
      return new Response(JSON.stringify({ error: linkErr?.message || "Failed to generate link" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionUrl =
      (linkData as any).properties?.action_link ||
      (linkData as any).action_link;
    const emailOtp = (linkData as any).properties?.email_otp;

    if (!actionUrl) {
      return new Response(JSON.stringify({ error: "No action link returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = "";
    let html = "";
    if (type === "recovery") {
      subject = "Reset your Holarc Health password";
      html = brandedHtml({
        heading: "Reset your password",
        intro: "We received a request to reset the password for your Holarc Health account. Click the button below to choose a new one. This link expires in 1 hour.",
        ctaLabel: "Reset Password",
        ctaUrl: actionUrl,
        footer: "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
      });
    } else if (type === "magiclink") {
      subject = "Your Holarc Health sign-in link";
      html = brandedHtml({
        heading: "Sign in to Holarc Health",
        intro: "Click the button below to sign in. This link expires in 1 hour.",
        ctaLabel: "Sign In",
        ctaUrl: actionUrl,
        otp: emailOtp,
        footer: "If you didn't request this, you can safely ignore this email.",
      });
    } else {
      subject = "Confirm your Holarc Health email";
      html = brandedHtml({
        heading: "Confirm your email",
        intro: "Welcome to Holarc Health. Click below to confirm your email address and activate your account.",
        ctaLabel: "Confirm Email",
        ctaUrl: actionUrl,
      });
    }

    const result = await sendEmail({ to: email, subject, html });
    if (!result.ok) {
      console.error("sendEmail failed:", result.error);
      return new Response(JSON.stringify({ error: result.error || "Email send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, otp: emailOtp ? true : false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("auth-email-sender error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
