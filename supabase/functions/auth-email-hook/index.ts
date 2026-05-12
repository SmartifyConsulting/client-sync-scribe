// Supabase Auth Send-Email Hook → Mailgun
// Receives auth email events from Supabase, renders branded HTML, sends via Mailgun.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { sendMailgunEmail } from "../_shared/mailgun.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

const BRAND = "HolarcHealth";
const PRIMARY = "#E01837";
const FROM = `HolarcHealth <noreply@holarchealth.com>`;

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
}

interface User {
  email?: string;
  new_email?: string;
}

interface HookPayload {
  user: User;
  email_data: EmailData;
}

function buildActionUrl(d: EmailData): string {
  const base = d.site_url.replace(/\/$/, "");
  const params = new URLSearchParams({
    token: d.token_hash,
    type: d.email_action_type,
    redirect_to: d.redirect_to || base,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px;max-width:560px;">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:22px;color:#111;">${title}</h1>
        ${bodyHtml}
        <p style="margin:32px 0 0;font-size:12px;color:#888;">If you didn't request this, you can safely ignore this email.</p>
        <p style="margin:8px 0 0;font-size:12px;color:#888;">— The ${BRAND} Team</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function button(url: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:${PRIMARY};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">${label}</a></p>
<p style="margin:16px 0;font-size:13px;color:#555;">Or copy and paste this URL into your browser:<br><a href="${url}" style="color:${PRIMARY};word-break:break-all;">${url}</a></p>`;
}

function render(action: string, url: string, token: string): { subject: string; html: string; text: string } {
  switch (action) {
    case "signup":
      return {
        subject: `Confirm your ${BRAND} account`,
        html: shell("Confirm your account", `<p>Welcome to ${BRAND}. Please confirm your email address to activate your account.</p>${button(url, "Confirm email")}`),
        text: `Welcome to ${BRAND}. Confirm your email: ${url}`,
      };
    case "recovery":
      return {
        subject: `Reset your ${BRAND} password`,
        html: shell("Reset your password", `<p>We received a request to reset your password. Click below to choose a new one. This link expires shortly.</p>${button(url, "Reset password")}`),
        text: `Reset your ${BRAND} password: ${url}`,
      };
    case "magiclink":
      return {
        subject: `Your ${BRAND} sign-in link`,
        html: shell("Sign in to HolarcHealth", `<p>Click below to sign in. This link expires shortly.</p>${button(url, "Sign in")}`),
        text: `Sign in to ${BRAND}: ${url}`,
      };
    case "invite":
      return {
        subject: `You've been invited to ${BRAND}`,
        html: shell("You're invited", `<p>You've been invited to join ${BRAND}. Accept the invitation to set up your account.</p>${button(url, "Accept invitation")}`),
        text: `You've been invited to ${BRAND}: ${url}`,
      };
    case "email_change":
    case "email_change_current":
      return {
        subject: `Confirm your new email`,
        html: shell("Confirm your new email", `<p>Click below to confirm the change to your ${BRAND} account email.</p>${button(url, "Confirm new email")}`),
        text: `Confirm your new email for ${BRAND}: ${url}`,
      };
    case "reauthentication":
      return {
        subject: `Your ${BRAND} verification code`,
        html: shell("Verify your identity", `<p>Use this code to confirm your identity:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#111;margin:16px 0;">${token}</p><p style="font-size:13px;color:#555;">This code expires shortly. If you didn't request it, ignore this email.</p>`),
        text: `Your ${BRAND} verification code: ${token}`,
      };
    default:
      return {
        subject: `${BRAND} notification`,
        html: shell(`${BRAND} notification`, `<p>Action required for your account.</p>${button(url, "Continue")}`),
        text: `${BRAND}: ${url}`,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
  if (!HOOK_SECRET) {
    console.error("SEND_EMAIL_HOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "hook not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: HookPayload;
  try {
    const body = await req.text();
    const headers = Object.fromEntries(req.headers);
    // Supabase sends secret as base64-prefixed "v1,whsec_..." — strip prefix for standardwebhooks
    const secret = HOOK_SECRET.replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
    const wh = new Webhook(secret);
    payload = wh.verify(body, headers) as HookPayload;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "verification failed";
    console.error("Webhook verify failed:", msg);
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recipient = payload.user?.new_email || payload.user?.email;
  if (!recipient) {
    return new Response(JSON.stringify({ error: "no recipient" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const action = payload.email_data.email_action_type;
  const actionUrl = buildActionUrl(payload.email_data);
  const { subject, html, text } = render(action, actionUrl, payload.email_data.token);

  console.log(`auth-email-hook: sending ${action} to ${recipient}`);

  const result = await sendMailgunEmail({ to: recipient, subject, html, text, from: FROM });

  if (!result.ok) {
    console.error(`auth-email-hook: Mailgun failed (${result.status}):`, result.error);
    return new Response(JSON.stringify({ error: result.error || "send failed" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
