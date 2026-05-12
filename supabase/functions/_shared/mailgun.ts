// Shared Mailgun sender — routed through the Lovable connector gateway.
// Replaces previous direct Resend integration.

const MAILGUN_DOMAIN = "holarchealth.com";
const DEFAULT_FROM = `Holarc Health <noreply@${MAILGUN_DOMAIN}>`;
const GATEWAY_URL = `https://connector-gateway.lovable.dev/mailgun/${MAILGUN_DOMAIN}/messages`;

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
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");

  if (!LOVABLE_API_KEY) {
    return { ok: false, status: 500, error: "LOVABLE_API_KEY is not configured" };
  }
  if (!MAILGUN_API_KEY) {
    return { ok: false, status: 500, error: "MAILGUN_API_KEY is not configured" };
  }
  if (!input.html && !input.text) {
    return { ok: false, status: 400, error: "Either html or text must be provided" };
  }

  const params = new URLSearchParams();
  params.set("from", input.from || DEFAULT_FROM);
  const toList = Array.isArray(input.to) ? input.to : [input.to];
  for (const t of toList) params.append("to", t);
  if (input.cc) {
    const ccList = Array.isArray(input.cc) ? input.cc : [input.cc];
    for (const c of ccList) params.append("cc", c);
  }
  if (input.bcc) {
    const bccList = Array.isArray(input.bcc) ? input.bcc : [input.bcc];
    for (const b of bccList) params.append("bcc", b);
  }
  params.set("subject", input.subject);
  if (input.html) params.set("html", input.html);
  if (input.text) params.set("text", input.text);
  if (input.replyTo) params.set("h:Reply-To", input.replyTo);

  try {
    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": MAILGUN_API_KEY,
      },
      body: params.toString(),
    });

    const text = await resp.text();
    let data: unknown = text;
    try { data = JSON.parse(text); } catch { /* keep as text */ }

    if (!resp.ok) {
      console.error("Mailgun send failed", resp.status, text);
      return { ok: false, status: resp.status, data, error: typeof data === "object" && data && "message" in data ? String((data as Record<string, unknown>).message) : `Mailgun error ${resp.status}` };
    }
    return { ok: true, status: resp.status, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown Mailgun error";
    console.error("Mailgun send threw", msg);
    return { ok: false, status: 500, error: msg };
  }
}
