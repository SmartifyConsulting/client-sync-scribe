import { useMemo } from "react";
import { useTemplates, Template } from "./useTemplates";
import { useHeaderTemplates } from "./useHeaderTemplates";
import { useFooterTemplates } from "./useFooterTemplates";
import { HeaderFooterTemplate } from "./useHeaderFooterTemplates";
import { useProfile } from "./useProfile";
import { fillDocumentPlaceholders } from "@/features/documents/lib/fillDocumentPlaceholders";

interface CombinedTemplate {
  template: Template | null;
  headerFooter: HeaderFooterTemplate | null;
  isLoading: boolean;
  formattedContent: string;
}

export function useTemplateWithHeaderFooter(templateName: string): CombinedTemplate {
  const { templates, loading: templatesLoading } = useTemplates();
  const { templates: headerTemplates, isLoading: headerLoading } = useHeaderTemplates();
  const { templates: footerTemplates, isLoading: footerLoading } = useFooterTemplates();
  const { profile } = useProfile();

  const result = useMemo(() => {
    // Find the template by name (case-insensitive partial match)
    const template = templates.find(
      t => t.name.toLowerCase().includes(templateName.toLowerCase())
    ) || null;

    // Find the linked header/footer templates independently — falling back to
    // each's own default when the content template hasn't picked one.
    const header =
      (template && (template as any).header_template_id
        ? headerTemplates.find(h => h.id === (template as any).header_template_id)
        : undefined) || headerTemplates.find(h => h.is_default) || null;

    const footer =
      (template && (template as any).footer_template_id
        ? footerTemplates.find(f => f.id === (template as any).footer_template_id)
        : undefined) || footerTemplates.find(f => f.is_default) || null;

    // Combine into the same shape the rest of the app already renders
    // (DocumentPreview, printDocument, resolveTemplatePreview) so nothing
    // downstream needs to change now that header/footer are separate.
    const headerFooter: HeaderFooterTemplate | null = header || footer
      ? {
          id: header?.id || footer?.id || "",
          user_id: header?.user_id || footer?.user_id || "",
          name: header?.name || footer?.name || "",
          description: header?.description ?? footer?.description ?? null,
          header: (header?.section as any) || { left: { text: "", alignment: "left" }, center: { text: "", alignment: "center" }, right: { text: "", alignment: "right" } },
          footer: (footer?.section as any) || { left: { text: "", alignment: "left" }, center: { text: "", alignment: "center" }, right: { text: "", alignment: "right" } },
          font_family: header?.font_family || footer?.font_family || null,
          is_default: !!(header?.is_default || footer?.is_default),
          created_at: header?.created_at || footer?.created_at || "",
          updated_at: header?.updated_at || footer?.updated_at || "",
        }
      : null;

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
  }, [templates, headerTemplates, footerTemplates, templateName, profile]);

  return {
    ...result,
    isLoading: templatesLoading || headerLoading || footerLoading,
  };
}
