/**
 * Cloudflare Email Worker — inbound mail for holarc.com
 *
 * Receives every message routed to the domain, parses the MIME body and
 * forwards sender, subject, body and attachments to the app's document
 * intake endpoint.
 *
 * Required Worker variables/secrets (set with `wrangler secret put`):
 *   INTAKE_URL     - full URL of the receive-email-document endpoint
 *   INTAKE_SECRET  - same value as the EMAIL_INTAKE_SECRET backend secret
 */
import PostalMime from "postal-mime";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default {
  async email(message, env) {
    const raw = new Response(message.raw);
    const parsed = await new PostalMime().parse(await raw.arrayBuffer());

    const attachments = [];
    for (const att of parsed.attachments || []) {
      const buf =
        att.content instanceof ArrayBuffer
          ? att.content
          : new TextEncoder().encode(String(att.content)).buffer;
      if (buf.byteLength > MAX_ATTACHMENT_BYTES) continue;
      attachments.push({
        filename: att.filename || "attachment",
        contentType: att.mimeType || "application/octet-stream",
        content: toBase64(buf),
      });
    }

    const payload = {
      from: parsed.from?.address || message.from,
      to: message.to,
      subject: parsed.subject || "",
      text: parsed.text || "",
      html: parsed.html || "",
      attachments,
    };

    const res = await fetch(env.INTAKE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-intake-secret": env.INTAKE_SECRET,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Intake rejected message", res.status, detail);
      // 404 = no matching mailbox: bounce so the sender knows.
      if (res.status === 404) {
        message.setReject("No mailbox exists for this address");
        return;
      }
      throw new Error(`Intake failed with ${res.status}`);
    }
  },
};
