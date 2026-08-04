import { HeaderFooterTemplate } from "@/hooks/useHeaderFooterTemplates";
import { renderFormattedContent } from "@/features/documents/utils/documentFormatting";
import { getFontFamilyCss } from "./fontOptions";

interface SectionCell {
  text: string;
  alignment: string;
  imageUrl?: string;
}

interface Section {
  left?: SectionCell;
  center?: SectionCell;
  right?: SectionCell;
}

function sectionHasContent(section: Section | null | undefined): boolean {
  if (!section) return false;
  return !!(
    section.left?.text || section.left?.imageUrl ||
    section.center?.text || section.center?.imageUrl ||
    section.right?.text || section.right?.imageUrl
  );
}

function renderCell(cell: SectionCell | undefined, fontFamily: string, fontSizePx: number) {
  if (!cell) return <div />;
  return (
    <div style={{ textAlign: (cell.alignment || "left") as any }}>
      {cell.imageUrl && (
        <img src={cell.imageUrl} alt="" style={{ maxHeight: "50px", objectFit: "contain", marginBottom: "4px" }} />
      )}
      {cell.text && (
        <div
          style={{ whiteSpace: "pre-wrap", fontSize: `${fontSizePx}px`, lineHeight: 1.4, fontFamily }}
          dangerouslySetInnerHTML={{ __html: renderFormattedContent(cell.text) }}
        />
      )}
    </div>
  );
}

function renderSectionGrid(section: Section | null | undefined, fontFamily: string, fontSizePx: number) {
  if (!sectionHasContent(section)) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", width: "100%" }}>
      {renderCell(section?.left, fontFamily, fontSizePx)}
      {renderCell(section?.center, fontFamily, fontSizePx)}
      {renderCell(section?.right, fontFamily, fontSizePx)}
    </div>
  );
}

interface DocumentCanvasProps {
  /** Body content — pass already placeholder-resolved text. */
  content: string;
  /** Combined letterhead — its `.header`/`.footer` sections render above/below the content. */
  headerFooter?: HeaderFooterTemplate | null;
  /** Explicit font key (from FONT_OPTIONS) — overrides headerFooter's own font_family. */
  fontFamily?: string | null;
  logoUrl?: string;
  /**
   * true = small embedded preview (fills its container, no page shadow).
   * false (default) = full A4-page look, used for the real print/share preview.
   */
  compact?: boolean;
}

/**
 * Single source of truth for "what a rendered document/template looks like" —
 * used by both the full-screen Preview dialog and the Content Preview panel
 * in the template editor, so the two never visually drift apart.
 */
export function DocumentCanvas({ content, headerFooter, fontFamily, logoUrl, compact = false }: DocumentCanvasProps) {
  const resolvedFont = getFontFamilyCss(fontFamily ?? headerFooter?.font_family);
  const hasHeader = sectionHasContent(headerFooter?.header);
  const hasFooter = sectionHasContent(headerFooter?.footer);
  const bodyFontSize = compact ? 12 : 14;
  const sectionFontSize = 9;

  return (
    <div
      className={compact ? "bg-white" : "bg-white shadow-lg mx-auto"}
      style={{
        width: compact ? "100%" : "210mm",
        minHeight: compact ? undefined : "297mm",
        maxWidth: "100%",
        padding: compact ? "12px" : "20mm",
        fontFamily: resolvedFont,
      }}
    >
      {hasHeader ? (
        <div style={{ marginBottom: compact ? "10px" : "16px" }}>
          {renderSectionGrid(headerFooter?.header, resolvedFont, sectionFontSize)}
          <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: compact ? "8px 0" : "12px 0" }} />
        </div>
      ) : compact ? (
        <p className="text-gray-400 italic text-[10px] text-center mb-2">Select a Header template</p>
      ) : (
        logoUrl && (
          <div className="mb-6">
            <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
          </div>
        )
      )}

      {content ? (
        <div
          className="whitespace-pre-wrap text-black leading-relaxed"
          style={{ fontFamily: resolvedFont, fontSize: `${bodyFontSize}px` }}
          dangerouslySetInnerHTML={{ __html: renderFormattedContent(content) }}
        />
      ) : compact ? (
        <p className="text-gray-400 italic text-center text-xs py-2">Main content will appear here...</p>
      ) : null}

      {hasFooter ? (
        <div style={{ marginTop: compact ? "10px" : "24px" }}>
          <hr style={{ border: "none", borderTop: "1px solid #ccc", margin: compact ? "8px 0" : "12px 0" }} />
          {renderSectionGrid(headerFooter?.footer, resolvedFont, sectionFontSize)}
        </div>
      ) : compact ? (
        <p className="text-gray-400 italic text-[10px] text-center mt-2">Select a Footer template</p>
      ) : null}
    </div>
  );
}
