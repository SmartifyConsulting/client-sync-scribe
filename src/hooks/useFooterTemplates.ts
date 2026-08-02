import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface FooterTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  section: {
    left: { text: string; alignment: string; imageUrl?: string };
    center: { text: string; alignment: string; imageUrl?: string };
    right: { text: string; alignment: string; imageUrl?: string };
  };
  font_family: string | null;
  is_default: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useFooterTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ["footer-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("footer_templates" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as FooterTemplate[];
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Omit<FooterTemplate, "id" | "user_id" | "created_at" | "updated_at">) => {
      if (!user?.id) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("footer_templates" as any)
        .insert({
          user_id: user.id,
          name: template.name,
          description: template.description,
          section: template.section,
          font_family: template.font_family,
          is_default: template.is_default,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer-templates"] });
      toast({ title: "Success", description: "Footer template created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...template }: Partial<FooterTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("footer_templates" as any)
        .update({
          name: template.name,
          description: template.description,
          section: template.section,
          font_family: template.font_family,
          is_default: template.is_default,
        } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer-templates"] });
      toast({ title: "Success", description: "Footer template updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("footer_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["footer-templates"] });
      toast({ title: "Success", description: "Footer template deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return { templates, isLoading, error, createTemplate, updateTemplate, deleteTemplate };
}
