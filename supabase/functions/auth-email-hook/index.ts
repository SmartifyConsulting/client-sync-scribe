// Supabase Send Email Hook — receives all auth email events from Supabase
// (signup, recovery, magiclink, email_change, reauthentication) and sends
// branded HTML via Resend through the shared _shared/email.ts helper.
//
// Configure in Supabase Auth → Hooks → "Send Email Hook":
//   URL:    https://<project-ref>.supabase.co/functions/v1/auth-email-hook
//   Secret: value of SEND_EMAIL_HOOK_SECRET
//
// Webhook signature is verified using the standard-webhooks scheme.

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { sendEmail } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = Deno.env.get("PUBLIC_SITE_URL") || "https://holarchealth.com";

interface HookPayload {
  user: { email: string; new_email?: string };
  email_data: {
    token: string;
    token_hash: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "login"
      | "invite"
      | "magiclink"
      | "recovery"
      | "email_change"
      | "email_change_new"
      | "reauthentication";
    site_url: string;
  };
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

function buildActionUrl(p: HookPayload) {
  const { site_url, token_hash, email_action_type, redirect_to } = p.email_data;
  const base = site_url.replace(/\/+$/, "");
  const params = new URLSearchParams({
    token: token_hash,
    type: email_action_type,
    redirect_to: redirect_to || SITE_URL,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function renderEmail(p: HookPayload): { subject: string; html: string; to: string } {
  const actionUrl = buildActionUrl(p);
  const otp = p.email_data.token;
  const type = p.email_data.email_action_type;

  switch (type) {
    case "signup":
      return {
        to: p.user.email,
        subject: "Confirm your Holarc Health email",
        html: brandedHtml({
          heading: "Confirm your email",
          intro:
            "Welcome to Holarc Health. Click below to confirm your email address and activate your account.",
          ctaLabel: "Confirm Email",
          ctaUrl: actionUrl,
          otp,
        }),
      };
    case "recovery":
      return {
        to: p.user.email,
        subject: "Reset your Holarc Health password",
        html: brandedHtml({
          heading: "Reset your password",
          intro:
            "We received a request to reset the password for your Holarc Health account. Click below to choose a new one. This link expires in 1 hour.",
          ctaLabel: "Reset Password",
          ctaUrl: actionUrl,
          otp,
          footer:
            "If you didn't request a password reset, you can safely ignore this email — your password won't change.",
        }),
      };
    case "magiclink":
    case "login":
      return {
        to: p.user.email,
        subject: "Your Holarc Health sign-in link",
        html: brandedHtml({
          heading: "Sign in to Holarc Health",
          intro: "Click below to sign in. This link expires in 1 hour.",
          ctaLabel: "Sign In",
          ctaUrl: actionUrl,
          otp,
        }),
      };
    case "invite":
      return {
        to: p.user.email,
        subject: "You've been invited to Holarc Health",
        html: brandedHtml({
          heading: "Accept your invitation",
          intro: "You've been invited to Holarc Health. Click below to accept and set up your account.",
          ctaLabel: "Accept Invitation",
          ctaUrl: actionUrl,
        }),
      };
    case "email_change":
    case "email_change_new":
      return {
        to: p.user.new_email || p.user.email,
        subject: "Confirm your new Holarc Health email",
        html: brandedHtml({
          heading: "Confirm your new email",
          intro:
            "Click below to confirm this new email address for your Holarc Health account.",
          ctaLabel: "Confirm New Email",
          ctaUrl: actionUrl,
          otp,
        }),
      };
    case "reauthentication":
      return {
        to: p.user.email,
        subject: "Your Holarc Health verification code",
        html: brandedHtml({
          heading: "Verify it's you",
          intro: "Use the code below to confirm this action on your Holarc Health account.",
          ctaLabel: "Open Holarc Health",
          ctaUrl: SITE_URL,
          otp,
        }),
      };
    default:
      return {
        to: p.user.email,
        subject: "Holarc Health notification",
        html: brandedHtml({
          heading: "Holarc Health",
          intro: "Click below to continue.",
          ctaLabel: "Continue",
          ctaUrl: actionUrl,
        }),
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!HOOK_SECRET) {
    console.error("SEND_EMAIL_HOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers);

  let payload: HookPayload;
  try {
    // Supabase sends the secret as base64 with a "v1,whsec_" prefix.
    const secret = HOOK_SECRET.replace(/^v1,whsec_/, "");
    const wh = new Webhook(secret);
    payload = wh.verify(rawBody, headers) as HookPayload;
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { to, subject, html } = renderEmail(payload);
    const result = await sendEmail({ to, subject, html });
    if (!result.ok) {
      console.error("Resend send failed:", result.status, result.error);
      return new Response(
        JSON.stringify({ error: result.error || "Email send failed" }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    console.log(
      `auth-email-hook sent: type=${payload.email_data.email_action_type} to=${to}`,
    );
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("auth-email-hook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
