// Shared transactional email sender — routes through ZeptoMail (Zoho).
// All callers import { sendEmail } from "../_shared/email.ts".

const DEFAULT_FROM_EMAIL = "no-reply@holarchealth.com";
const DEFAULT_FROM_NAME = "Holarc Health";
// Region defaults to global (.com). Set ZEPTOMAIL_REGION="eu" for EU accounts.
const REGION = (Deno.env.get("ZEPTOMAIL_REGION") || "com").toLowerCase();
const API_URL = `https://api.zeptomail.${REGION === "eu" ? "eu" : "com"}/v1.1/email`;

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

function toZeptoRecipient(a: EmailAddressInput) {
  const ea: Record<string, string> = { address: a.email };
  if (a.name) ea.name = a.name;
  return { email_address: ea };
}

function toZeptoFrom(a: EmailAddressInput) {
  const out: Record<string, string> = { address: a.email };
  if (a.name) out.name = a.name;
  return out;
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const RAW_TOKEN = Deno.env.get("ZEPTOMAIL_API_TOKEN");
  if (!RAW_TOKEN) {
    return { ok: false, status: 500, error: "ZEPTOMAIL_API_TOKEN is not configured" };
  }
  if (!input.html && !input.text) {
    return { ok: false, status: 400, error: "Either html or text must be provided" };
  }

  // ZeptoMail expects: "Zoho-enczapikey <token>". Accept token with or without prefix.
  const authHeader = RAW_TOKEN.trim().toLowerCase().startsWith("zoho-enczapikey")
    ? RAW_TOKEN.trim()
    : `Zoho-enczapikey ${RAW_TOKEN.trim()}`;

  const from = input.from
    ? parseAddress(input.from)
    : { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };

  const toArr = toAddressArray(input.to) ?? [];
  const ccArr = toAddressArray(input.cc);
  const bccArr = toAddressArray(input.bcc);

  const payload: Record<string, unknown> = {
    from: toZeptoFrom(from),
    to: toArr.map(toZeptoRecipient),
    subject: input.subject,
  };
  if (input.html) payload.htmlbody = input.html;
  if (input.text) payload.textbody = input.text;
  if (ccArr?.length) payload.cc = ccArr.map(toZeptoRecipient);
  if (bccArr?.length) payload.bcc = bccArr.map(toZeptoRecipient);
  if (input.replyTo) {
    const r = parseAddress(input.replyTo);
    payload.reply_to = [toZeptoFrom(r)];
  }

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: unknown = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* keep as text */ }

    if (!resp.ok) {
      console.error("Email send failed", resp.status, text);
      let message = `Email provider error ${resp.status}`;
      if (data && typeof data === "object") {
        const errObj = (data as Record<string, unknown>).error as
          | { message?: string; details?: Array<{ message?: string }> }
          | undefined;
        if (errObj?.message) {
          message = errObj.message;
          if (errObj.details?.length) {
            const detailMsgs = errObj.details
              .map((d) => d?.message)
              .filter(Boolean)
              .join("; ");
            if (detailMsgs) message += `: ${detailMsgs}`;
          }
        } else if ((data as Record<string, unknown>).message) {
          message = String((data as Record<string, unknown>).message);
        }
      }
      return { ok: false, status: resp.status, data, error: message };
    }
    return { ok: true, status: resp.status, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown email error";
    console.error("Email send threw", msg);
    return { ok: false, status: 500, error: msg };
  }
}
