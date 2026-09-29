// Shared transactional email sender — routes through Resend via the Lovable connector gateway.
// All callers import { sendEmail } from "../_shared/email.ts".

const DEFAULT_FROM_EMAIL = "no-reply@holarchealth.com";
const DEFAULT_FROM_NAME = "Indigro";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

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
  /**
   * Base64-encoded file attachments (no data-url prefix).
   * Set `contentId` to embed the file inline in the HTML via `cid:<contentId>`
   * — inline images render without the recipient trusting remote images.
   */
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
    contentId?: string;
  }>;
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

function formatAddress(a: EmailAddressInput): string {
  return a.name ? `${a.name} <${a.email}>` : a.email;
}

function toAddressList(
  input: string | string[] | EmailAddressInput | EmailAddressInput[] | undefined,
): string[] | undefined {
  if (input === undefined) return undefined;
  const arr = Array.isArray(input) ? input : [input];
  return arr.map((v) => formatAddress(parseAddress(v)));
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { ok: false, status: 500, error: "LOVABLE_API_KEY is not configured" };
  }
  if (!RESEND_API_KEY) {
    return { ok: false, status: 500, error: "RESEND_API_KEY is not configured" };
  }
  if (!input.html && !input.text) {
    return { ok: false, status: 400, error: "Either html or text must be provided" };
  }

  const from = input.from
    ? parseAddress(input.from)
    : { email: DEFAULT_FROM_EMAIL, name: DEFAULT_FROM_NAME };

  const toArr = toAddressList(input.to) ?? [];
  const ccArr = toAddressList(input.cc);
  const bccArr = toAddressList(input.bcc);

  const payload: Record<string, unknown> = {
    from: formatAddress(from),
    to: toArr,
    subject: input.subject,
  };
  if (input.html) payload.html = input.html;
  if (input.text) payload.text = input.text;
  if (ccArr?.length) payload.cc = ccArr;
  if (bccArr?.length) payload.bcc = bccArr;
  if (input.attachments?.length) {
    payload.attachments = input.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentType ? { content_type: a.contentType } : {}),
      ...(a.contentId ? { content_id: a.contentId, disposition: "inline" } : {}),
    }));
  }
  if (input.replyTo) {
    payload.reply_to = formatAddress(parseAddress(input.replyTo));
  }

  try {
    const resp = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: unknown = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* keep as text */ }

    console.log("[email] resend response", {
      status: resp.status,
      ok: resp.ok,
      from: payload.from,
      to: payload.to,
      subject: input.subject,
      body: text,
    });

    if (!resp.ok) {
      console.error("Email send failed", resp.status, text);
      let message = `Email provider error ${resp.status}`;
      if (data && typeof data === "object") {
        const d = data as Record<string, unknown>;
        if (typeof d.message === "string") message = d.message;
        else if (typeof d.error === "string") message = d.error;
        else if (d.error && typeof (d.error as Record<string, unknown>).message === "string") {
          message = (d.error as Record<string, unknown>).message as string;
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
