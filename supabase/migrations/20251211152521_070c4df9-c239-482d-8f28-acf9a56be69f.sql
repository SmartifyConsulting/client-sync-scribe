-- Add header_footer_template_id column to templates table
ALTER TABLE public.templates 
ADD COLUMN header_footer_template_id UUID REFERENCES public.header_footer_templates(id) ON DELETE SET NULL;