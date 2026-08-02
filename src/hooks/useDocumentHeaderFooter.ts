import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HeaderFooterTemplate } from "@/hooks/useHeaderFooterTemplates";

interface DocumentLike {
  id?: string;
  user_id?: string | null;
  template_name?: string | null;
}

interface DocumentHeaderFooterResult {
  headerFooter: HeaderFooterTemplate | null;
  templateFontFamily: string | null;
  isLoading: boolean;
}

const emptySection = { left: { text: "", alignment: "left" }, center: { text: "", alignment: "center" }, right: { text: "", alignment: "right" } };

/**
 * Resolves the letterhead (header template + footer template, each
 * independent) that should be applied to a given document, using the
 * DOCUMENT'S AUTHOR (`documents.user_id`) — not the currently logged-in user.
 *
 * Lookup order per side:
 *   1. Match `templates` by author + template_name → `header_template_id` / `footer_template_id`
 *   2. If found, fetch that header/footer template
 *   3. Fallback to the author's `is_default` header/footer template
 *
 * The result is combined into the same `HeaderFooterTemplate` shape used
 * before the header/footer split, so consumers (DocumentPreview,
 * printDocument, resolveTemplatePreview) don't need any changes.
 */
export function useDocumentHeaderFooter(document: DocumentLike | null | undefined): DocumentHeaderFooterResult {
  const authorId = document?.user_id ?? null;
  const templateName = document?.template_name ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["document-header-footer", authorId, templateName],
    enabled: !!authorId,
    queryFn: async (): Promise<{ hf: HeaderFooterTemplate | null; templateFontFamily: string | null }> => {
      if (!authorId) return { hf: null, templateFontFamily: null };

      let linkedHeaderId: string | null = null;
      let linkedFooterId: string | null = null;
      let templateFontFamily: string | null = null;

      if (templateName) {
        const { data: tpl } = await supabase
          .from("templates")
          .select("header_template_id, footer_template_id, font_family")
          .eq("user_id", authorId)
          .eq("name", templateName)
          .maybeSingle();
        linkedHeaderId = (tpl as any)?.header_template_id ?? null;
        linkedFooterId = (tpl as any)?.footer_template_id ?? null;
        templateFontFamily = (tpl as any)?.font_family ?? null;
      }

      const [headerRow, footerRow] = await Promise.all([
        linkedHeaderId
          ? supabase.from("header_templates" as any).select("*").eq("id", linkedHeaderId).maybeSingle()
          : supabase.from("header_templates" as any).select("*").eq("user_id", authorId).eq("is_default", true).maybeSingle(),
        linkedFooterId
          ? supabase.from("footer_templates" as any).select("*").eq("id", linkedFooterId).maybeSingle()
          : supabase.from("footer_templates" as any).select("*").eq("user_id", authorId).eq("is_default", true).maybeSingle(),
      ]);

      const header = (headerRow.data as any) ?? null;
      const footer = (footerRow.data as any) ?? null;

      if (!header && !footer) return { hf: null, templateFontFamily };

      const hf: HeaderFooterTemplate = {
        id: header?.id || footer?.id || "",
        user_id: authorId,
        name: header?.name || footer?.name || "",
        description: header?.description ?? footer?.description ?? null,
        header: header?.section || emptySection,
        footer: footer?.section || emptySection,
        font_family: header?.font_family || footer?.font_family || null,
        is_default: !!(header?.is_default || footer?.is_default),
        created_at: header?.created_at || footer?.created_at || "",
        updated_at: header?.updated_at || footer?.updated_at || "",
      };

      return { hf, templateFontFamily };
    },
  });

  return {
    headerFooter: data?.hf ?? null,
    templateFontFamily: data?.templateFontFamily ?? null,
    isLoading,
  };
}
