CREATE TABLE public.sidebar_preferences (
  user_id uuid PRIMARY KEY,
  item_order text[] NOT NULL DEFAULT '{}',
  hidden_items text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sidebar_preferences TO authenticated;
GRANT ALL ON public.sidebar_preferences TO service_role;
ALTER TABLE public.sidebar_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sidebar_preferences_owner_all" ON public.sidebar_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
