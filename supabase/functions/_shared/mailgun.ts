// Shared email sender — routes through Resend API directly.
// Export name kept as `sendMailgunEmail` for backwards-compat with existing callers.

const DEFAULT_FROM = "Holarc Health <no-reply@holarchealth.com>";
const RESEND_API_URL = "https://api.resend.com/emails";

export interface MailgunSendInput {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface MailgunSendResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

export async function sendMailgunEmail(input: MailgunSendInput): Promise<MailgunSendResult> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    return { ok: false, status: 500, error: "RESEND_API_KEY is not configured" };
  }
  if (!input.html && !input.text) {
    return { ok: false, status: 400, error: "Either html or text must be provided" };
  }

  const payload: Record<string, unknown> = {
    from: input.from || DEFAULT_FROM,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
  };
  if (input.html) payload.html = input.html;
  if (input.text) payload.text = input.text;
  if (input.cc) payload.cc = Array.isArray(input.cc) ? input.cc : [input.cc];
  if (input.bcc) payload.bcc = Array.isArray(input.bcc) ? input.bcc : [input.bcc];
  if (input.replyTo) payload.reply_to = input.replyTo;

  try {
    const resp = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* keep as text */ }

    if (!resp.ok) {
      console.error("Resend send failed", resp.status, text);
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as Record<string, unknown>).message)
          : `Resend error ${resp.status}`;
      return { ok: false, status: resp.status, data, error: message };
    }
    return { ok: true, status: resp.status, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown Resend error";
    console.error("Resend send threw", msg);
    return { ok: false, status: 500, error: msg };
  }
}

// Alias for new callers preferring a provider-neutral name.
export const sendEmail = sendMailgunEmail;
