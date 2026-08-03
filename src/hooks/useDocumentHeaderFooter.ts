import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mergeHeaderFooterTemplates, type HeaderFooterTemplate } from "@/hooks/useHeaderFooterTemplates";

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

/**
 * Resolves the letterhead (header/footer template) that should be applied
 * to a given document, using the DOCUMENT'S AUTHOR (`documents.user_id`)
 * — not the currently logged-in user.
 *
 * Lookup order:
 *   1. Match `templates` by author + template_name → `header_footer_template_id`
 *   2. If found, fetch that header/footer template
 *   3. Fallback to the author's `is_default` header/footer template
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
          .select("header_footer_template_id, header_template_id, footer_template_id, font_family")
          .eq("user_id", authorId)
          .eq("name", templateName)
          .maybeSingle();
        const legacyId = (tpl as any)?.header_footer_template_id ?? null;
        linkedHeaderId = (tpl as any)?.header_template_id ?? legacyId;
        linkedFooterId = (tpl as any)?.footer_template_id ?? legacyId;
        templateFontFamily = (tpl as any)?.font_family ?? null;
      }

      if (linkedHeaderId || linkedFooterId) {
        const ids = [...new Set([linkedHeaderId, linkedFooterId].filter(Boolean))] as string[];
        const { data: hfRows } = await supabase
          .from("header_footer_templates")
          .select("*")
          .in("id", ids);
        const headerTpl = (hfRows || []).find((r) => r.id === linkedHeaderId) as unknown as HeaderFooterTemplate | undefined;
        const footerTpl = (hfRows || []).find((r) => r.id === linkedFooterId) as unknown as HeaderFooterTemplate | undefined;
        const merged = mergeHeaderFooterTemplates(headerTpl ?? null, footerTpl ?? null);
        if (merged) return { hf: merged, templateFontFamily };
      }

      // Fallback 1: author's default letterhead
      const { data: defaultHf } = await supabase
        .from("header_footer_templates")
        .select("*")
        .eq("user_id", authorId)
        .eq("is_default", true)
        .maybeSingle();

      if (defaultHf) return { hf: defaultHf as unknown as HeaderFooterTemplate, templateFontFamily };

      // Fallback 2 (last resort): any letterhead owned by the author.
      const { data: anyHf } = await supabase
        .from("header_footer_templates")
        .select("*")
        .eq("user_id", authorId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return { hf: (anyHf as unknown as HeaderFooterTemplate) ?? null, templateFontFamily };
    },
  });

  return {
    headerFooter: data?.hf ?? null,
    templateFontFamily: data?.templateFontFamily ?? null,
    isLoading,
  };
}
