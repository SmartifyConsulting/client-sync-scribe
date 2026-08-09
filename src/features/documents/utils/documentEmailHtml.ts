import { renderFormattedContent } from "@/features/documents/utils/documentFormatting";
import { getFontFamilyCss } from "@/features/documents/templates/fontOptions";
import holarcLogo from "@/assets/holarc-health-logo.png.asset.json";

/** Absolute URL of the Holarc Health logo so it renders inside email clients. */
export const HOLARC_EMAIL_LOGO_URL = `https://holarchealth.com${holarcLogo.url}`;

interface SectionCell {
  text?: string;
  alignment?: string;
  imageUrl?: string;
}

interface Section {
  left?: SectionCell;
  center?: SectionCell;
  right?: SectionCell;
}

export interface DocumentEmailInput {
  content: string;
  headerFooter?: { header?: Section | null; footer?: Section | null; font_family?: string | null } | null;
  fontFamily?: string | null;
  /** Practice logo used when the letterhead has no header section. */
  logoUrl?: string | null;
  senderName?: string | null;
}

const sectionHasContent = (section?: Section | null): boolean =>
  !!(
    section?.left?.text || section?.left?.imageUrl ||
    section?.center?.text || section?.center?.imageUrl ||
    section?.right?.text || section?.right?.imageUrl
  );

const renderCell = (cell: SectionCell | undefined, fontFamily: string, fontSize: string): string => {
  if (!cell) return `<td style="width:33%;"></td>`;
  const align = cell.alignment || "left";
  const img = cell.imageUrl
    ? `<img src="${cell.imageUrl}" alt="" style="max-height:60px;object-fit:contain;margin-bottom:4px;" />`
    : "";
  const text = cell.text
    ? `<div style="white-space:pre-wrap;font-size:${fontSize};line-height:1.4;font-family:${fontFamily};">${renderFormattedContent(
        cell.text,
      )}</div>`
    : "";
  return `<td style="width:33%;vertical-align:top;text-align:${align};padding:4px;">${img}${text}</td>`;
};

const renderSection = (section: Section | null | undefined, fontFamily: string, fontSize: string): string => {
  if (!sectionHasContent(section)) return "";
  return `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>${renderCell(
    section?.left,
    fontFamily,
    fontSize,
  )}${renderCell(section?.center, fontFamily, fontSize)}${renderCell(section?.right, fontFamily, fontSize)}</tr></table>`;
};

/**
 * Renders a document to the exact same visual layout as `DocumentCanvas`
 * (letterhead grid, 12pt body, 10.5pt header/footer) as standalone HTML that
 * email clients can display, with the Holarc Health logo centred on top at
 * roughly one third of the document width.
 */
export function buildDocumentEmailHtml({
  content,
  headerFooter,
  fontFamily,
  logoUrl,
  senderName,
}: DocumentEmailInput): string {
  const font = getFontFamilyCss(fontFamily ?? headerFooter?.font_family ?? undefined);
  const bodyFontSize = "12pt";
  const sectionFontSize = "10.5pt";
  const header = renderSection(headerFooter?.header, font, sectionFontSize);
  const footer = renderSection(headerFooter?.footer, font, sectionFontSize);
  const rule = `<hr style="border:none;border-top:1px solid #ccc;margin:12px 0;" />`;

  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;padding:24px 0;background:#f5f5f5;">
    <div id="holarc-document" style="max-width:210mm;margin:0 auto;background:#ffffff;padding:20mm;font-family:${font};color:#000;">
      <div style="text-align:center;margin-bottom:16px;">
        <img src="${HOLARC_EMAIL_LOGO_URL}" alt="Holarc Health" style="width:33%;max-width:200px;height:auto;object-fit:contain;" />
      </div>
      ${header ? header + rule : logoUrl ? `<div style="margin-bottom:16px;"><img src="${logoUrl}" alt="" style="max-height:64px;object-fit:contain;" /></div>` : ""}
      <div style="font-family:${font};font-size:${bodyFontSize};line-height:1.6;white-space:pre-wrap;">${renderFormattedContent(
        content,
      )}</div>
      ${footer ? rule + footer : ""}
      <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:9pt;color:#666;text-align:center;">
        Sent by ${senderName || "Holarc Health"} via Holarc Health
      </div>
    </div>
  </body>
</html>`;
}
