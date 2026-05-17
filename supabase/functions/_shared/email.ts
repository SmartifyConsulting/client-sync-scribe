// Shared transactional email sender — routes through MailerSend.
// All callers import { sendEmail } from "../_shared/email.ts".

const DEFAULT_FROM_EMAIL = "no-reply@holarchealth.com";
const DEFAULT_FROM_NAME = "Holarc Health";
const API_URL = "https://api.mailersend.com/v1/email";

export interface EmailAddressInput {
  email: string;
  name?: string;
}

export interface SendEmailInput {
  to: string | string[] | EmailAddressInput | EmailAddressInput[];
  subject: string;
  html?: string;
  text?: string;
  /** Either a plain email, "Name <email>" string, or an object. */
  from?: string | EmailAddressInput;
  replyTo?: string | EmailAddressInput;
  cc?: string | string[] | EmailAddressInput | EmailAddressInput[];
  bcc?: string | string[] | EmailAddressInput | EmailAddressInput[];
}

export interface SendEmailResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

function parseAddress(input: string | EmailAddressInput): EmailAddressInput {
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  // Match: Name <email@x.com>
  const m = trimmed.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) {
    const name = m[1].trim();
    const email = m[2].trim();
    return name ? { email, name } : { email };
  }
  return { email: trimmed };
}

function toAddressArray(
  input: string | string[] | EmailAddressInput | EmailAddressInput[] | undefined,
): EmailAddressInput[] | undefined {
  if (input === undefined) return undefined;
  const arr = Array.isArray(input) ? input : [input];
  return arr.map(parseAddress);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const API_TOKEN = Deno.env.get("MAILERSEND_API_TOKEN");
  if (!API_TOKEN) {
    return { ok: false, status: 500, error: "MAILERSEND_API_TOKEN is not configured" };
  }
  if (!input.html && !input.text) {
    return { ok: false, status: 400, error: "Either html or text must be provided" };
  }

  const from = input.from
    ? parseAddress(input.from)
    : { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };

  const payload: Record<string, unknown> = {
    from,
    to: toAddressArray(input.to),
    subject: input.subject,
  };
  if (input.html) payload.html = input.html;
  if (input.text) payload.text = input.text;
  const cc = toAddressArray(input.cc);
  if (cc?.length) payload.cc = cc;
  const bcc = toAddressArray(input.bcc);
  if (bcc?.length) payload.bcc = bcc;
  if (input.replyTo) payload.reply_to = parseAddress(input.replyTo);

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: unknown = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* keep as text */ }

    if (!resp.ok) {
      console.error("Email send failed", resp.status, text);
      const message =
        typeof data === "object" && data && "message" in (data as Record<string, unknown>)
          ? String((data as Record<string, unknown>).message)
          : `Email provider error ${resp.status}`;
      return { ok: false, status: resp.status, data, error: message };
    }
    return { ok: true, status: resp.status, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown email error";
    console.error("Email send threw", msg);
    return { ok: false, status: 500, error: msg };
  }
}
