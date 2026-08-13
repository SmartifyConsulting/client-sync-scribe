CREATE TABLE public.ask_maeve_preferences (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id TEXT NOT NULL DEFAULT 'nova',
  voice_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_maeve_preferences TO authenticated;
GRANT ALL ON public.ask_maeve_preferences TO service_role;

ALTER TABLE public.ask_maeve_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own Ask Maeve preferences"
ON public.ask_maeve_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ask_maeve_preferences_updated_at
BEFORE UPDATE ON public.ask_maeve_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();