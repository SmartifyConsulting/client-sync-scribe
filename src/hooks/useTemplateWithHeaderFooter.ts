import { useMemo } from "react";
import { useTemplates, Template } from "./useTemplates";
import { useHeaderFooterTemplates, HeaderFooterTemplate, mergeHeaderFooterTemplates } from "./useHeaderFooterTemplates";
import { useProfile } from "./useProfile";
import { fillDocumentPlaceholders } from "@/features/documents/lib/fillDocumentPlaceholders";

interface CombinedTemplate {
  template: Template | null;
  headerFooter: HeaderFooterTemplate | null;
  isLoading: boolean;
  formattedContent: string;
}

// Helper to format header/footer section
function formatSection(section: { text: string; alignment: string; imageUrl?: string }): string {
  return section.text || "";
}

// Helper to create header line
function formatHeaderFooterLine(
  left: { text: string; alignment: string; imageUrl?: string },
  center: { text: string; alignment: string; imageUrl?: string },
  right: { text: string; alignment: string; imageUrl?: string }
): string {
  const leftText = formatSection(left);
  const centerText = formatSection(center);
  const rightText = formatSection(right);
  
  const parts = [leftText, centerText, rightText].filter(Boolean);
  return parts.join("    ");
}

export function useTemplateWithHeaderFooter(templateName: string): CombinedTemplate {
  const { templates, loading: templatesLoading } = useTemplates();
  const { templates: headerFooterTemplates, isLoading: hfLoading } = useHeaderFooterTemplates();
  const { profile } = useProfile();

  const result = useMemo(() => {
    // Find the template by name (case-insensitive partial match)
    const template = templates.find(
      t => t.name.toLowerCase().includes(templateName.toLowerCase())
    ) || null;

    // Find the linked header and footer templates (independently selected,
    // falling back to the legacy combined letterhead id for older templates).
    const headerId = template?.header_template_id ?? template?.header_footer_template_id ?? null;
    const footerId = template?.footer_template_id ?? template?.header_footer_template_id ?? null;
    const headerTpl = headerId ? headerFooterTemplates.find(hf => hf.id === headerId) ?? null : null;
    const footerTpl = footerId ? headerFooterTemplates.find(hf => hf.id === footerId) ?? null : null;

    let headerFooter: HeaderFooterTemplate | null = mergeHeaderFooterTemplates(headerTpl, footerTpl);

    // If neither header nor footer is linked, try to find the default one
    if (!headerFooter) {
      headerFooter = headerFooterTemplates.find(hf => hf.is_default) || null;
    }

    // Build the formatted content — body only (header/footer rendered separately by DocumentPreview)
    let formattedContent = "";

    // Add main content (or use template content if available)
    if (template) {
      formattedContent += template.content;
    }

    // Resolve every known token (doctor name/number, practice number & address,
    // dates, signature — typed or uploaded) through the shared filler so previews
    // show real values by default instead of raw [Brackets].
    if (formattedContent) {
      formattedContent = fillDocumentPlaceholders(formattedContent, {
        profile: (profile ?? null) as any,
      }).content;
    }

    return {
      template,
      headerFooter,
      formattedContent,
    };
  }, [templates, headerFooterTemplates, templateName, profile]);

  return {
    ...result,
    isLoading: templatesLoading || hfLoading,
  };
}
