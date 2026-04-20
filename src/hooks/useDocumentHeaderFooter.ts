import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HeaderFooterTemplate } from "@/hooks/useHeaderFooterTemplates";

interface DocumentLike {
  id?: string;
  user_id?: string | null;
  template_name?: string | null;
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
export function useDocumentHeaderFooter(document: DocumentLike | null | undefined) {
  const authorId = document?.user_id ?? null;
  const templateName = document?.template_name ?? null;

  const { data: headerFooter, isLoading } = useQuery({
    queryKey: ["document-header-footer", authorId, templateName],
    enabled: !!authorId,
    queryFn: async (): Promise<HeaderFooterTemplate | null> => {
      if (!authorId) return null;

      let linkedHfId: string | null = null;

      if (templateName) {
        const { data: tpl } = await supabase
          .from("templates")
          .select("header_footer_template_id")
          .eq("user_id", authorId)
          .eq("name", templateName)
          .maybeSingle();
        linkedHfId = (tpl as any)?.header_footer_template_id ?? null;
      }

      if (linkedHfId) {
        const { data: hf } = await supabase
          .from("header_footer_templates")
          .select("*")
          .eq("id", linkedHfId)
          .maybeSingle();
        if (hf) return hf as unknown as HeaderFooterTemplate;
      }

      // Fallback 1: author's default letterhead
      const { data: defaultHf } = await supabase
        .from("header_footer_templates")
        .select("*")
        .eq("user_id", authorId)
        .eq("is_default", true)
        .maybeSingle();

      if (defaultHf) return defaultHf as unknown as HeaderFooterTemplate;

      // Fallback 2 (last resort): any letterhead owned by the author.
      // Guarantees doctors with a single (un-flagged) letterhead still get it applied.
      const { data: anyHf } = await supabase
        .from("header_footer_templates")
        .select("*")
        .eq("user_id", authorId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return (anyHf as unknown as HeaderFooterTemplate) ?? null;
    },
  });

  return { headerFooter: headerFooter ?? null, isLoading };
}
