CREATE TABLE public.ask_maeve_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  conversation_state TEXT NOT NULL DEFAULT 'WELCOME',
  session_intention TEXT,
  desired_outcome TEXT,
  well_formed_outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_state_description TEXT,
  patient_language_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  patient_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  future_pacing_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  ecology_observations JSONB NOT NULL DEFAULT '[]'::jsonb,
  patient_defined_insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  longitudinal_consent BOOLEAN NOT NULL DEFAULT false,
  session_summary TEXT,
  safety_flagged BOOLEAN NOT NULL DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_maeve_sessions TO authenticated;
GRANT ALL ON public.ask_maeve_sessions TO service_role;
ALTER TABLE public.ask_maeve_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve sessions" ON public.ask_maeve_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ask_maeve_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ask_maeve_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  conversation_state TEXT,
  process_key TEXT,
  process_step INTEGER,
  is_safety_response BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX ask_maeve_messages_session_idx ON public.ask_maeve_messages(session_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_maeve_messages TO authenticated;
GRANT ALL ON public.ask_maeve_messages TO service_role;
ALTER TABLE public.ask_maeve_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve messages" ON public.ask_maeve_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ask_maeve_processes (
  key TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  plain_language TEXT NOT NULL,
  entry_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  contraindications JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_consent BOOLEAN NOT NULL DEFAULT true,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  exit_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  requires_future_pacing BOOLEAN NOT NULL DEFAULT false,
  requires_ecology_check BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ask_maeve_processes TO authenticated;
GRANT ALL ON public.ask_maeve_processes TO service_role;
ALTER TABLE public.ask_maeve_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users can read maeve processes" ON public.ask_maeve_processes FOR SELECT TO authenticated USING (true);

CREATE TABLE public.ask_maeve_session_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ask_maeve_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  process_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  current_step INTEGER NOT NULL DEFAULT 0,
  consent_given BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_maeve_session_processes TO authenticated;
GRANT ALL ON public.ask_maeve_session_processes TO service_role;
ALTER TABLE public.ask_maeve_session_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve session processes" ON public.ask_maeve_session_processes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ask_maeve_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ask_maeve_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  desired_state TEXT,
  evidence TEXT,
  sensory_evidence TEXT,
  context TEXT,
  within_control TEXT,
  value TEXT,
  ecology TEXT,
  patient_words TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_maeve_outcomes TO authenticated;
GRANT ALL ON public.ask_maeve_outcomes TO service_role;
ALTER TABLE public.ask_maeve_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve outcomes" ON public.ask_maeve_outcomes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ask_maeve_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ask_maeve_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  patient_words TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_maeve_resources TO authenticated;
GRANT ALL ON public.ask_maeve_resources TO service_role;
ALTER TABLE public.ask_maeve_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve resources" ON public.ask_maeve_resources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ask_maeve_anchors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.ask_maeve_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  resource_label TEXT,
  anchor_description TEXT,
  tested BOOLEAN NOT NULL DEFAULT false,
  patient_words TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ask_maeve_anchors TO authenticated;
GRANT ALL ON public.ask_maeve_anchors TO service_role;
ALTER TABLE public.ask_maeve_anchors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve anchors" ON public.ask_maeve_anchors FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ask_maeve_safety_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ask_maeve_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  detail TEXT,
  action_taken TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ask_maeve_safety_events TO authenticated;
GRANT ALL ON public.ask_maeve_safety_events TO service_role;
ALTER TABLE public.ask_maeve_safety_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve safety events readable" ON public.ask_maeve_safety_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.ask_maeve_response_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.ask_maeve_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_id UUID,
  passed BOOLEAN NOT NULL,
  rules_fired JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_taken TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ask_maeve_response_validations TO authenticated;
GRANT ALL ON public.ask_maeve_response_validations TO service_role;
ALTER TABLE public.ask_maeve_response_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own maeve validations readable" ON public.ask_maeve_response_validations FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_ask_maeve_sessions_updated_at BEFORE UPDATE ON public.ask_maeve_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ask_maeve_processes_updated_at BEFORE UPDATE ON public.ask_maeve_processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ask_maeve_session_processes_updated_at BEFORE UPDATE ON public.ask_maeve_session_processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ask_maeve_outcomes_updated_at BEFORE UPDATE ON public.ask_maeve_outcomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();