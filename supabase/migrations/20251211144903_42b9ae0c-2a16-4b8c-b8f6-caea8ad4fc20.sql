-- Create header_footer_templates table
CREATE TABLE public.header_footer_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  header JSONB DEFAULT '{"left": {"text": "", "alignment": "left"}, "center": {"text": "", "alignment": "center"}, "right": {"text": "", "alignment": "right"}}'::jsonb,
  footer JSONB DEFAULT '{"left": {"text": "", "alignment": "left"}, "center": {"text": "", "alignment": "center"}, "right": {"text": "", "alignment": "right"}}'::jsonb,
  font_family TEXT DEFAULT 'sans',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.header_footer_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own header/footer templates"
  ON public.header_footer_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own header/footer templates"
  ON public.header_footer_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own header/footer templates"
  ON public.header_footer_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own header/footer templates"
  ON public.header_footer_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_header_footer_templates_updated_at
  BEFORE UPDATE ON public.header_footer_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();