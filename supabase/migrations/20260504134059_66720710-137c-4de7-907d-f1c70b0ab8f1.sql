
-- ============================================================================
-- HOLARC GUARDIAN MODULE — initial schema
-- ============================================================================

-- 1. Per-user module flag and global module registry ------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guardian_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.app_modules (
  module_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read modules"
  ON public.app_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage modules"
  ON public.app_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

INSERT INTO public.app_modules (module_key, enabled, description)
VALUES ('guardian', true, 'Holarc Guardian — SOS, live location, responder dispatch')
ON CONFLICT (module_key) DO NOTHING;

-- 2. Extend user_role enum with responder roles -----------------------------
DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'hospital_staff';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'ambulance_staff';
EXCEPTION WHEN others THEN NULL; END $$;

-- 3. Provider lifecycle enums ----------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.guardian_provider_status AS ENUM ('pending','approved','rejected','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guardian_subscription_status AS ENUM ('inactive','active','past_due','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guardian_hospital_tier AS ENUM ('tier_1','tier_2','tier_3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guardian_ambulance_tier AS ENUM ('tier_1','tier_2','tier_3','tier_4');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Helper: is the Guardian module enabled for a user? --------------------
CREATE OR REPLACE FUNCTION public.guardian_user_enabled(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT enabled FROM public.app_modules WHERE module_key = 'guardian'), false)
    AND COALESCE((SELECT guardian_enabled FROM public.profiles WHERE id = _uid), false);
$$;

GRANT EXECUTE ON FUNCTION public.guardian_user_enabled(uuid) TO authenticated;

-- 5. Emergency contacts ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own guardian contacts"
  ON public.guardian_emergency_contacts FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.guardian_user_enabled(auth.uid()));

CREATE POLICY "Admins view guardian contacts"
  ON public.guardian_emergency_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 6. Incidents -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved')),
  tracking_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  severity text NOT NULL DEFAULT 'high' CHECK (severity IN ('critical','high','moderate')),
  conscious boolean,
  breathing boolean,
  assigned_provider_id uuid,
  accepted_at timestamptz,
  en_route_at timestamptz,
  arrived_at timestamptz,
  eta_minutes int,
  last_eta_update timestamptz,
  priority_boost boolean NOT NULL DEFAULT false,
  at_risk boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
ALTER TABLE public.guardian_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own incidents"
  ON public.guardian_incidents FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.guardian_user_enabled(auth.uid()));

CREATE POLICY "Admins view all incidents"
  ON public.guardian_incidents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 7. Locations -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.guardian_incidents(id) ON DELETE CASCADE NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardian_locations ON public.guardian_locations (incident_id, recorded_at DESC);
ALTER TABLE public.guardian_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert locations for own incidents"
  ON public.guardian_locations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.guardian_incidents i WHERE i.id = incident_id AND i.user_id = auth.uid()));

CREATE POLICY "Users view own incident locations"
  ON public.guardian_locations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guardian_incidents i WHERE i.id = incident_id AND i.user_id = auth.uid()));

CREATE POLICY "Admins view all guardian locations"
  ON public.guardian_locations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 8. Public live tracking via security definer functions -------------------
CREATE OR REPLACE FUNCTION public.guardian_get_tracking_incident(_token text)
RETURNS TABLE (id uuid, status text, created_at timestamptz, resolved_at timestamptz, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.status, i.created_at, i.resolved_at, p.full_name
  FROM public.guardian_incidents i
  LEFT JOIN public.profiles p ON p.id = i.user_id
  WHERE i.tracking_token = _token;
$$;

CREATE OR REPLACE FUNCTION public.guardian_get_tracking_locations(_token text, _limit int DEFAULT 200)
RETURNS TABLE (latitude double precision, longitude double precision, accuracy double precision, recorded_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.latitude, l.longitude, l.accuracy, l.recorded_at
  FROM public.guardian_locations l
  JOIN public.guardian_incidents i ON i.id = l.incident_id
  WHERE i.tracking_token = _token
  ORDER BY l.recorded_at DESC LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.guardian_get_tracking_incident(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_get_tracking_locations(text, int) TO anon, authenticated;

-- 9. Hospitals -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  registration_number text,
  address text,
  city text,
  state text,
  country text DEFAULT 'South Africa',
  contact_email text NOT NULL,
  contact_phone text,
  latitude double precision,
  longitude double precision,
  services text[] DEFAULT '{}',
  bed_capacity integer DEFAULT 0,
  icu_capacity integer DEFAULT 0,
  beds_available integer DEFAULT 0,
  icu_available integer DEFAULT 0,
  at_capacity boolean NOT NULL DEFAULT false,
  tier public.guardian_hospital_tier NOT NULL DEFAULT 'tier_2',
  status public.guardian_provider_status NOT NULL DEFAULT 'pending',
  subscription_status public.guardian_subscription_status NOT NULL DEFAULT 'inactive',
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own hospital" ON public.guardian_hospitals
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins manage all hospitals" ON public.guardian_hospitals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));
CREATE POLICY "Public can view approved active hospitals" ON public.guardian_hospitals
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND subscription_status = 'active');

CREATE TRIGGER guardian_hospitals_updated_at BEFORE UPDATE ON public.guardian_hospitals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_guardian_hospitals_status ON public.guardian_hospitals(status, subscription_status);
CREATE INDEX IF NOT EXISTS idx_guardian_hospitals_owner ON public.guardian_hospitals(owner_id);

-- 10. Ambulance providers --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_ambulance_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  company_name text NOT NULL,
  registration_number text,
  contact_email text NOT NULL,
  contact_phone text,
  fleet_size integer DEFAULT 1,
  base_address text,
  city text,
  state text,
  country text DEFAULT 'South Africa',
  latitude double precision,
  longitude double precision,
  status public.guardian_provider_status NOT NULL DEFAULT 'pending',
  subscription_status public.guardian_subscription_status NOT NULL DEFAULT 'inactive',
  approved_at timestamptz,
  dispatch_priority int NOT NULL DEFAULT 0,
  tier public.guardian_ambulance_tier NOT NULL DEFAULT 'tier_4',
  at_capacity boolean NOT NULL DEFAULT false,
  sos_voice_clip_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_ambulance_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own ambulance" ON public.guardian_ambulance_providers
  FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Admins manage all ambulances" ON public.guardian_ambulance_providers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));
CREATE POLICY "Public can view approved active ambulances" ON public.guardian_ambulance_providers
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND subscription_status = 'active');

CREATE TRIGGER guardian_ambulance_updated_at BEFORE UPDATE ON public.guardian_ambulance_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_guardian_ambulance_status ON public.guardian_ambulance_providers(status, subscription_status);
CREATE INDEX IF NOT EXISTS idx_guardian_ambulance_owner ON public.guardian_ambulance_providers(owner_id);

-- 11. Membership tables ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_hospital_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.guardian_hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, user_id)
);
ALTER TABLE public.guardian_hospital_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hospital owner manages members" ON public.guardian_hospital_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guardian_hospitals h WHERE h.id = hospital_id AND h.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.guardian_hospitals h WHERE h.id = hospital_id AND h.owner_id = auth.uid()));
CREATE POLICY "Members view own hospital membership" ON public.guardian_hospital_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage hospital members" ON public.guardian_hospital_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE TABLE IF NOT EXISTS public.guardian_ambulance_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.guardian_ambulance_providers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'crew',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, user_id)
);
ALTER TABLE public.guardian_ambulance_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Provider owner manages members" ON public.guardian_ambulance_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guardian_ambulance_providers p WHERE p.id = provider_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.guardian_ambulance_providers p WHERE p.id = provider_id AND p.owner_id = auth.uid()));
CREATE POLICY "Members view own ambulance membership" ON public.guardian_ambulance_members
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage ambulance members" ON public.guardian_ambulance_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

-- 12. Provider approval RPCs ----------------------------------------------
CREATE OR REPLACE FUNCTION public.guardian_approve_hospital(_hospital_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  UPDATE public.guardian_hospitals SET status='approved', approved_at=now()
    WHERE id = _hospital_id RETURNING owner_id INTO _owner;
  INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'hospital_staff'::public.user_role) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.guardian_approve_ambulance(_provider_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  UPDATE public.guardian_ambulance_providers SET status='approved', approved_at=now()
    WHERE id = _provider_id RETURNING owner_id INTO _owner;
  INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'ambulance_staff'::public.user_role) ON CONFLICT DO NOTHING;
END $$;

REVOKE EXECUTE ON FUNCTION public.guardian_approve_hospital(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.guardian_approve_ambulance(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.guardian_approve_hospital(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_approve_ambulance(uuid) TO authenticated;

-- 13. Incident offers, events, cancellations, feedback --------------------
CREATE TABLE IF NOT EXISTS public.guardian_incident_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.guardian_incidents(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  offered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  response text NOT NULL DEFAULT 'pending'
    CHECK (response IN ('pending','accepted','declined','expired','superseded')),
  priority_boost boolean NOT NULL DEFAULT false,
  distance_km numeric,
  UNIQUE (incident_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_guardian_offers_provider_pending
  ON public.guardian_incident_offers (provider_id) WHERE response = 'pending';
CREATE INDEX IF NOT EXISTS idx_guardian_offers_incident
  ON public.guardian_incident_offers (incident_id);

ALTER TABLE public.guardian_incident_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage guardian offers" ON public.guardian_incident_offers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));
CREATE POLICY "Patient views own incident offers" ON public.guardian_incident_offers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guardian_incidents i WHERE i.id = guardian_incident_offers.incident_id AND i.user_id = auth.uid()));
CREATE POLICY "Provider sees own offers" ON public.guardian_incident_offers
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.guardian_ambulance_providers p WHERE p.id = guardian_incident_offers.provider_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.guardian_ambulance_members m WHERE m.provider_id = guardian_incident_offers.provider_id AND m.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.guardian_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.guardian_incidents(id) ON DELETE CASCADE,
  provider_id uuid,
  actor_user_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  latitude double precision,
  longitude double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardian_events_incident
  ON public.guardian_incident_events (incident_id, created_at DESC);
ALTER TABLE public.guardian_incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role inserts guardian events" ON public.guardian_incident_events
  FOR INSERT TO public WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins view guardian events" ON public.guardian_incident_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.user_role));
CREATE POLICY "Patient views own incident events" ON public.guardian_incident_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guardian_incidents i WHERE i.id = guardian_incident_events.incident_id AND i.user_id = auth.uid()));
CREATE POLICY "Provider views events for their incidents" ON public.guardian_incident_events
  FOR SELECT TO authenticated
  USING (
    provider_id IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.guardian_ambulance_providers p WHERE p.id = guardian_incident_events.provider_id AND p.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.guardian_ambulance_members m WHERE m.provider_id = guardian_incident_events.provider_id AND m.user_id = auth.uid())
    )
  );

CREATE TABLE IF NOT EXISTS public.guardian_incident_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.guardian_incidents(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN ('safety','vehicle','other')),
  reason_text text NOT NULL,
  evidence_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_incident_cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages guardian cancellations" ON public.guardian_incident_cancellations
  FOR ALL TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Admins view guardian cancellations" ON public.guardian_incident_cancellations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.user_role));
CREATE POLICY "Patient views own cancellations" ON public.guardian_incident_cancellations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guardian_incidents i WHERE i.id = guardian_incident_cancellations.incident_id AND i.user_id = auth.uid()));
CREATE POLICY "Provider views own guardian cancellations" ON public.guardian_incident_cancellations
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.guardian_ambulance_providers p WHERE p.id = guardian_incident_cancellations.provider_id AND p.owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.guardian_incident_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL UNIQUE REFERENCES public.guardian_incidents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  arrived_on_time boolean NOT NULL,
  felt_safe boolean NOT NULL,
  comment text,
  critical_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_incident_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view guardian feedback" ON public.guardian_incident_feedback
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.user_role));
CREATE POLICY "Users view own guardian feedback" ON public.guardian_incident_feedback
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own guardian feedback" ON public.guardian_incident_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.guardian_incidents i WHERE i.id = guardian_incident_feedback.incident_id AND i.user_id = auth.uid()
  ));
CREATE POLICY "Provider views feedback for own incidents" ON public.guardian_incident_feedback
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.guardian_incidents i
    JOIN public.guardian_ambulance_providers p ON p.id = i.assigned_provider_id
    WHERE i.id = guardian_incident_feedback.incident_id AND p.owner_id = auth.uid()
  ));

-- 14. Messaging log --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_messaging_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid,
  user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('sms','voice','email')),
  recipient_phone text,
  recipient_email text,
  recipient_name text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  provider_message_id text,
  error_message text,
  cost text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardian_msg_user ON public.guardian_messaging_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_msg_incident ON public.guardian_messaging_log(incident_id);
ALTER TABLE public.guardian_messaging_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own guardian messaging log"
  ON public.guardian_messaging_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins view all guardian messaging log"
  ON public.guardian_messaging_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role));
CREATE POLICY "Service role inserts guardian messaging log"
  ON public.guardian_messaging_log FOR INSERT TO public
  WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service role updates guardian messaging log"
  ON public.guardian_messaging_log FOR UPDATE TO public
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 15. Voice clip settings + storage ---------------------------------------
CREATE TABLE IF NOT EXISTS public.guardian_voice_clip_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_clip_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.guardian_voice_clip_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.guardian_voice_clip_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read guardian voice settings"
  ON public.guardian_voice_clip_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage guardian voice settings"
  ON public.guardian_voice_clip_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('guardian-voice-clips', 'guardian-voice-clips', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage all guardian voice clips"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'guardian-voice-clips' AND public.has_role(auth.uid(), 'admin'::public.user_role))
  WITH CHECK (bucket_id = 'guardian-voice-clips' AND public.has_role(auth.uid(), 'admin'::public.user_role));

CREATE POLICY "Ambulance owners manage own guardian voice clips"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'guardian-voice-clips'
    AND (storage.foldername(name))[1] = 'providers'
    AND EXISTS (
      SELECT 1 FROM public.guardian_ambulance_providers p
      WHERE p.id::text = (storage.foldername(name))[2] AND p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'guardian-voice-clips'
    AND (storage.foldername(name))[1] = 'providers'
    AND EXISTS (
      SELECT 1 FROM public.guardian_ambulance_providers p
      WHERE p.id::text = (storage.foldername(name))[2] AND p.owner_id = auth.uid()
    )
  );

-- 16. Realtime -------------------------------------------------------------
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_incidents; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_locations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_incident_offers; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.guardian_incident_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.guardian_incidents REPLICA IDENTITY FULL;
ALTER TABLE public.guardian_locations REPLICA IDENTITY FULL;
