
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS is_chronic boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS missed_alert_after_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS alert_contacts_on_taken boolean NOT NULL DEFAULT false;

ALTER TABLE public.medication_adherence
  ADD COLUMN IF NOT EXISTS missed_alert_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS taken_alert_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_alerts_sent jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_contacts_on_missed_meds boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_contacts_on_taken_meds boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_screen_tips_seen (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tip_id text NOT NULL,
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tip_id)
);

GRANT SELECT, INSERT, DELETE ON public.user_screen_tips_seen TO authenticated;
GRANT ALL ON public.user_screen_tips_seen TO service_role;

ALTER TABLE public.user_screen_tips_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tip flags"
  ON public.user_screen_tips_seen
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
