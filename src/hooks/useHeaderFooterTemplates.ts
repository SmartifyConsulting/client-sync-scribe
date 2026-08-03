import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface HeaderFooterTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  header: {
    left: { text: string; alignment: string; imageUrl?: string };
    center: { text: string; alignment: string; imageUrl?: string };
    right: { text: string; alignment: string; imageUrl?: string };
  };
  footer: {
    left: { text: string; alignment: string; imageUrl?: string };
    center: { text: string; alignment: string; imageUrl?: string };
    right: { text: string; alignment: string; imageUrl?: string };
  };
  font_family: string | null;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Combines an independently-chosen header letterhead and footer letterhead
 * into one displayable HeaderFooterTemplate — used wherever a content
 * template links to a Header template and a Footer template separately
 * rather than one shared letterhead.
 */
export function mergeHeaderFooterTemplates(
  headerTpl: HeaderFooterTemplate | null | undefined,
  footerTpl: HeaderFooterTemplate | null | undefined,
): HeaderFooterTemplate | null {
  if (!headerTpl && !footerTpl) return null;
  const base = headerTpl ?? footerTpl!;
  return {
    ...base,
    header: headerTpl?.header ?? base.header,
    footer: footerTpl?.footer ?? base.footer,
    font_family: headerTpl?.font_family ?? footerTpl?.font_family ?? null,
  };
}

export function useHeaderFooterTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["header-footer-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("header_footer_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HeaderFooterTemplate[];
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<HeaderFooterTemplate, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("header_footer_templates")
        .insert({
          user_id: user.id,
          name: template.name,
          description: template.description,
          header: template.header,
          footer: template.footer,
          font_family: template.font_family,
          is_default: template.is_default,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["header-footer-templates"] });
      toast({ title: "Success", description: "Header/Footer template created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...template }: Partial<HeaderFooterTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("header_footer_templates")
        .update({
          name: template.name,
          description: template.description,
          header: template.header,
          footer: template.footer,
          font_family: template.font_family,
          is_default: template.is_default,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["header-footer-templates"] });
      toast({ title: "Success", description: "Header/Footer template updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("header_footer_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["header-footer-templates"] });
      toast({ title: "Success", description: "Header/Footer template deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}