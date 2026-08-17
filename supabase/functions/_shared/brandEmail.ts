/**
 * Shared Holarc Health email shell.
 *
 * Every outbound email (documents to patients, medical aids, pharmacies,
 * invoices and reports) is wrapped in this so recipients always see the
 * same logo, brand colours and typography.
 */

export const HOLARC_LOGO_URL =
  "https://www.holarchealth.com/__l5e/assets-v1/b61ca18b-7d1a-4a2f-9445-cfbccf4c9b3e/holarc-email-logo.png";

/** Brand tokens mirrored from the app's design system. */
const TEAL = "#2AA79E";
const TEAL_DARK = "#1C7B74";
const RED = "#E01837";
const INK = "#1F2933";
const MUTED = "#6B7280";

/** Email clients rarely load webfonts — keep the stack with safe fallbacks. */
const HEADING_FONT = "'Sora', 'Segoe UI', Helvetica, Arial, sans-serif";
const BODY_FONT = "'Manrope', 'Segoe UI', Helvetica, Arial, sans-serif";

export interface BrandEmailOptions {
  /** Heading shown under the logo, e.g. the document name. */
  title: string;
  /** Optional line under the title, e.g. the practice name. */
  subtitle?: string | null;
  /** Pre-rendered HTML for the body area. */
  bodyHtml: string;
  /** Who the email is from, used in the footer. */
  senderName?: string | null;
  practiceName?: string | null;
  /** Optional extra footer note (defaults to the confidentiality notice). */
  footerNote?: string | null;
  /** Deep link back to this document inside the app. */
  documentUrl?: string | null;
  /** Pre-rendered signature markup (image or typed) shown above the sender line. */
  signatureHtml?: string | null;
}

export function brandedEmail({
  title,
  subtitle,
  bodyHtml,
  senderName,
  practiceName,
  footerNote,
  documentUrl,
  signatureHtml,
}: BrandEmailOptions): string {
  const from = [senderName, practiceName].filter(Boolean).join(" · ");
  const note =
    footerNote ??
    "This message and any attachments are confidential and intended only for the named recipient. If you received it in error, please delete it and notify the sender.";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;600&display=swap" rel="stylesheet" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:${BODY_FONT};color:${INK};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="border-top:4px solid ${RED};padding:20px 28px 12px 28px;">
                <a href="https://www.holarchealth.com" style="text-decoration:none;color:${TEAL_DARK};font-family:${HEADING_FONT};font-weight:700;font-size:18px;"><img src="${HOLARC_LOGO_URL}" alt="Holarc Health" width="176" height="44" style="height:44px;width:176px;max-width:176px;display:block;border:0;outline:none;text-decoration:none;color:${TEAL_DARK};font-family:${HEADING_FONT};font-weight:700;font-size:18px;" /></a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 8px 28px;">
                <h1 style="margin:0;font-family:${HEADING_FONT};font-size:20px;font-weight:700;color:${TEAL_DARK};">${escapeHtml(title)}</h1>
                ${subtitle ? `<p style="margin:4px 0 0 0;font-size:13px;color:${MUTED};">${escapeHtml(subtitle)}</p>` : ""}
                <div style="height:3px;width:56px;background:${TEAL};border-radius:2px;margin:12px 0 0 0;"></div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px 28px;font-size:14px;line-height:1.6;color:${INK};">
                ${bodyHtml}
                ${documentUrl ? `
                <div style="margin-top:24px;">
                  <a href="${documentUrl}" style="display:inline-block;background:${TEAL};color:#ffffff;font-family:${HEADING_FONT};font-weight:600;font-size:14px;text-decoration:none;padding:11px 20px;border-radius:8px;">View this document in Holarc Health</a>
                  <p style="margin:8px 0 0 0;font-size:12px;color:${MUTED};word-break:break-all;">${escapeHtml(documentUrl)}</p>
                </div>` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:${MUTED};">
                ${signatureHtml ? `<div style="margin:0 0 10px 0;">${signatureHtml}</div>` : ""}
                ${from ? `<p style="margin:0 0 6px 0;font-weight:600;color:${INK};">Sent by ${escapeHtml(from)}</p>` : ""}
                <p style="margin:0 0 6px 0;">${escapeHtml(note)}</p>
                <p style="margin:0;color:${TEAL_DARK};font-family:${HEADING_FONT};font-weight:600;">Holarc Health</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
