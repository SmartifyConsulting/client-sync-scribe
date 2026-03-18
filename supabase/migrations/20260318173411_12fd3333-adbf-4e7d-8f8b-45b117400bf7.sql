-- Create doctor_rewards table
CREATE TABLE public.doctor_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  reward_type text NOT NULL,
  description text,
  moolas_count integer NOT NULL DEFAULT 1,
  reference_id uuid,
  awarded_at timestamptz DEFAULT now()
);
ALTER TABLE public.doctor_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors can view their own rewards" ON public.doctor_rewards FOR SELECT TO authenticated USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors can insert their own rewards" ON public.doctor_rewards FOR INSERT TO authenticated WITH CHECK (auth.uid() = doctor_id);

-- Create emoticon_messages table
CREATE TABLE public.emoticon_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  emoticon text NOT NULL,
  moolas_awarded integer DEFAULT 0,
  is_ai_flagged boolean DEFAULT false,
  profile_viewed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.emoticon_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view emoticons they sent" ON public.emoticon_messages FOR SELECT TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Users can view emoticons they received" ON public.emoticon_messages FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "Users can send emoticons" ON public.emoticon_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for emoticon_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.emoticon_messages;

-- Create profile_view_log table
CREATE TABLE public.profile_view_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now()
);
ALTER TABLE public.profile_view_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own views" ON public.profile_view_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "Users can view their own views" ON public.profile_view_log FOR SELECT TO authenticated USING (auth.uid() = viewer_id);

-- Create visit_ratings table
CREATE TABLE public.visit_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL,
  rated_user_id uuid NOT NULL,
  rating integer NOT NULL,
  rater_role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, rater_id)
);
ALTER TABLE public.visit_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Raters can insert their ratings" ON public.visit_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = rater_id);
CREATE POLICY "Raters can view their ratings" ON public.visit_ratings FOR SELECT TO authenticated USING (auth.uid() = rater_id);
CREATE POLICY "Rated users can view ratings about them" ON public.visit_ratings FOR SELECT TO authenticated USING (auth.uid() = rated_user_id);

-- Create validation trigger for visit_ratings (1-5 range)
CREATE OR REPLACE FUNCTION public.validate_visit_rating()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_visit_rating_trigger
  BEFORE INSERT OR UPDATE ON public.visit_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_visit_rating();