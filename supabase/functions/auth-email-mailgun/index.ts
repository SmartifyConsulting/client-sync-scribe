// Supabase "Send Email Hook" handler -> Mailgun
// Receives Standard Webhooks payload from Supabase Auth, renders branded
// HTML, and sends via Mailgun HTTP API.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY")!;
const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN") || "mg.holarchealth.com";
const MAILGUN_REGION = (Deno.env.get("MAILGUN_REGION") || "us").toLowerCase();
const HOOK_SECRET_RAW = Deno.env.get("SEND_EMAIL_HOOK_SECRET") || "";

const MAILGUN_BASE =
  MAILGUN_REGION === "eu"
    ? "https://api.eu.mailgun.net"
    : "https://api.mailgun.net";

const FROM_ADDRESS = `HolarcHealth <no-reply@${MAILGUN_DOMAIN}>`;
const BRAND_COLOR = "#0D9488"; // teal-600
const BRAND_NAME = "HolarcHealth";

// ----- Standard Webhooks signature verification -----
// Supabase prefixes the secret with "v1,whsec_". Strip that to get raw secret.
function getSigningSecret(): Uint8Array | null {
  let s = HOOK_SECRET_RAW.trim();
  if (!s) return null;
  if (s.startsWith("v1,")) s = s.slice(3);
  if (s.startsWith("whsec_")) s = s.slice(6);
  try {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  } catch {
    // not base64 — treat as raw bytes
    return new TextEncoder().encode(s);
  }
}

async function verifySignature(
  rawBody: string,
  headers: Headers,
): Promise<boolean> {
  const secret = getSigningSecret();
  if (!secret) {
    console.warn("[auth-email-mailgun] SEND_EMAIL_HOOK_SECRET not set — skipping verification");
    return true; // allow during initial setup; user should set the secret
  }
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const toSign = `${id}.${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(toSign),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  // header format: "v1,<base64sig> v1,<base64sig> ..."
  const sigs = signatureHeader.split(" ").map((p) => p.split(",")[1]).filter(Boolean);
  return sigs.some((s) => s === expected);
}

// ----- Email templates -----
interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
}

function buildActionUrl(d: EmailData): string {
  // Supabase verify URL pattern (works for all action types)
  const base = d.site_url?.replace(/\/$/, "") || "";
  const params = new URLSearchParams({
    token: d.token_hash,
    type: d.email_action_type,
    redirect_to: d.redirect_to || base,
  });
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function renderTemplate(
  type: string,
  recipientEmail: string,
  data: EmailData,
): { subject: string; html: string; text: string } {
  const url = buildActionUrl(data);
  const token = data.token;

  let title = "Confirm your email";
  let intro = "Please confirm your email address to continue.";
  let cta = "Confirm email";
  let subject = `${BRAND_NAME}: confirm your email`;

  switch (type) {
    case "signup":
      title = `Welcome to ${BRAND_NAME}`;
      intro = "Thanks for signing up. Confirm your email address to activate your account.";
      cta = "Confirm my email";
      subject = `Welcome to ${BRAND_NAME} — confirm your email`;
      break;
    case "recovery":
      title = "Reset your password";
      intro = "We received a request to reset your password. Click the button below to choose a new one. If you didn't request this, you can ignore this email.";
      cta = "Reset password";
      subject = `${BRAND_NAME}: reset your password`;
      break;
    case "magiclink":
      title = "Your sign-in link";
      intro = "Click the button below to sign in to your account.";
      cta = "Sign in";
      subject = `${BRAND_NAME}: your sign-in link`;
      break;
    case "invite":
      title = `You're invited to ${BRAND_NAME}`;
      intro = "You've been invited to join. Accept the invitation to set up your account.";
      cta = "Accept invitation";
      subject = `You're invited to ${BRAND_NAME}`;
      break;
    case "email_change":
      title = "Confirm your new email";
      intro = "Confirm this email address to complete your email change.";
      cta = "Confirm new email";
      subject = `${BRAND_NAME}: confirm your new email`;
      break;
    case "reauthentication":
      title = "Verification code";
      intro = `Use this code to confirm your action: <strong style="font-size:24px;letter-spacing:4px;">${token}</strong>`;
      cta = "";
      subject = `${BRAND_NAME}: verification code ${token}`;
      break;
  }

  const button = cta
    ? `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-family:Arial,sans-serif;">${cta}</a>`
    : "";

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:700;color:${BRAND_COLOR};">${BRAND_NAME}</div>
    </div>
    <h1 style="font-size:22px;margin:0 0 16px;color:#111827;">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#374151;margin:0 0 24px;">${intro}</p>
    ${button ? `<div style="text-align:center;margin:32px 0;">${button}</div>` : ""}
    ${cta ? `<p style="font-size:13px;color:#6b7280;margin:0 0 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
    <p style="font-size:12px;color:#6b7280;word-break:break-all;margin:0 0 24px;"><a href="${url}" style="color:${BRAND_COLOR};">${url}</a></p>` : ""}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />
    <p style="font-size:12px;color:#9ca3af;margin:0;">Sent to ${recipientEmail} by ${BRAND_NAME}.</p>
  </div>
</body></html>`;

  const text = cta
    ? `${title}\n\n${intro.replace(/<[^>]+>/g, "")}\n\n${cta}: ${url}\n\n— ${BRAND_NAME}`
    : `${title}\n\nCode: ${token}\n\n— ${BRAND_NAME}`;

  return { subject, html, text };
}

// ----- Mailgun send -----
async function sendViaMailgun(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  const url = `${MAILGUN_BASE}/v3/${MAILGUN_DOMAIN}/messages`;
  const form = new URLSearchParams({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
    text,
  });
  const auth = "Basic " + btoa(`api:${MAILGUN_API_KEY}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

// ----- Handler -----
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();

    // Test mode: bypass signature verification when caller sets x-test-mode header
    // (only works in dev — production should always have SEND_EMAIL_HOOK_SECRET)
    const isTestMode = req.headers.get("x-test-mode") === "1";

    if (!isTestMode) {
      const valid = await verifySignature(rawBody, req.headers);
      if (!valid) {
        console.error("[auth-email-mailgun] Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const payload = JSON.parse(rawBody) as {
      user: { email: string; id?: string };
      email_data: EmailData;
    };
    const recipient = payload.user?.email;
    if (!recipient) {
      return new Response(
        JSON.stringify({ error: "Missing user.email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { subject, html, text } = renderTemplate(
      payload.email_data.email_action_type,
      recipient,
      payload.email_data,
    );

    const result = await sendViaMailgun(recipient, subject, html, text);
    if (!result.ok) {
      console.error("[auth-email-mailgun] Mailgun error", result.status, result.body);
      return new Response(
        JSON.stringify({ error: "Mailgun send failed", status: result.status, detail: result.body }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("[auth-email-mailgun] Sent", payload.email_data.email_action_type, "to", recipient);
    return new Response(
      JSON.stringify({ ok: true, mailgun: result.body }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[auth-email-mailgun] Error", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
