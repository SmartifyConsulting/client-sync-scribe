
-- 1. Rename per-user flag column on profiles
ALTER TABLE public.profiles RENAME COLUMN guardian_enabled TO holarchelp_enabled;

-- 2. Rename enums
ALTER TYPE public.guardian_provider_status RENAME TO holarchelp_provider_status;
ALTER TYPE public.guardian_subscription_status RENAME TO holarchelp_subscription_status;
ALTER TYPE public.guardian_hospital_tier RENAME TO holarchelp_hospital_tier;
ALTER TYPE public.guardian_ambulance_tier RENAME TO holarchelp_ambulance_tier;

-- 3. Rename tables
ALTER TABLE public.guardian_emergency_contacts RENAME TO holarchelp_emergency_contacts;
ALTER TABLE public.guardian_incidents RENAME TO holarchelp_incidents;
ALTER TABLE public.guardian_locations RENAME TO holarchelp_locations;
ALTER TABLE public.guardian_hospitals RENAME TO holarchelp_hospitals;
ALTER TABLE public.guardian_hospital_members RENAME TO holarchelp_hospital_members;
ALTER TABLE public.guardian_ambulance_providers RENAME TO holarchelp_ambulance_providers;
ALTER TABLE public.guardian_ambulance_members RENAME TO holarchelp_ambulance_members;
ALTER TABLE public.guardian_incident_events RENAME TO holarchelp_incident_events;
ALTER TABLE public.guardian_incident_offers RENAME TO holarchelp_incident_offers;
ALTER TABLE public.guardian_incident_cancellations RENAME TO holarchelp_incident_cancellations;
ALTER TABLE public.guardian_incident_feedback RENAME TO holarchelp_incident_feedback;
ALTER TABLE public.guardian_messaging_log RENAME TO holarchelp_messaging_log;
ALTER TABLE public.guardian_voice_clip_settings RENAME TO holarchelp_voice_clip_settings;

-- 4. Update app_modules registry
UPDATE public.app_modules
SET module_key = 'holarchelp',
    description = 'HolarcHelp — SOS, live location, responder dispatch'
WHERE module_key = 'guardian';

-- 5. Rename functions in place (preserves RLS policy dependencies), then update bodies
ALTER FUNCTION public.guardian_user_enabled(uuid) RENAME TO holarchelp_user_enabled;
CREATE OR REPLACE FUNCTION public.holarchelp_user_enabled(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT enabled FROM public.app_modules WHERE module_key = 'holarchelp'), false)
    AND COALESCE((SELECT holarchelp_enabled FROM public.profiles WHERE id = _uid), false);
$$;
GRANT EXECUTE ON FUNCTION public.holarchelp_user_enabled(uuid) TO authenticated;

ALTER FUNCTION public.guardian_get_tracking_incident(text) RENAME TO holarchelp_get_tracking_incident;
CREATE OR REPLACE FUNCTION public.holarchelp_get_tracking_incident(_token text)
RETURNS TABLE (id uuid, status text, created_at timestamptz, resolved_at timestamptz, full_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.status, i.created_at, i.resolved_at, p.full_name
  FROM public.holarchelp_incidents i
  LEFT JOIN public.profiles p ON p.id = i.user_id
  WHERE i.tracking_token = _token;
$$;
GRANT EXECUTE ON FUNCTION public.holarchelp_get_tracking_incident(text) TO anon, authenticated;

ALTER FUNCTION public.guardian_get_tracking_locations(text, int) RENAME TO holarchelp_get_tracking_locations;
CREATE OR REPLACE FUNCTION public.holarchelp_get_tracking_locations(_token text, _limit int DEFAULT 200)
RETURNS TABLE (latitude double precision, longitude double precision, accuracy double precision, recorded_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.latitude, l.longitude, l.accuracy, l.recorded_at
  FROM public.holarchelp_locations l
  JOIN public.holarchelp_incidents i ON i.id = l.incident_id
  WHERE i.tracking_token = _token
  ORDER BY l.recorded_at DESC LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.holarchelp_get_tracking_locations(text, int) TO anon, authenticated;

ALTER FUNCTION public.guardian_approve_hospital(uuid) RENAME TO holarchelp_approve_hospital;
CREATE OR REPLACE FUNCTION public.holarchelp_approve_hospital(_hospital_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  UPDATE public.holarchelp_hospitals SET status='approved', approved_at=now()
    WHERE id = _hospital_id RETURNING owner_id INTO _owner;
  INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'hospital_staff'::public.user_role) ON CONFLICT DO NOTHING;
END $$;

ALTER FUNCTION public.guardian_approve_ambulance(uuid) RENAME TO holarchelp_approve_ambulance;
CREATE OR REPLACE FUNCTION public.holarchelp_approve_ambulance(_provider_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.user_role) THEN
    RAISE EXCEPTION 'Only admins can approve';
  END IF;
  UPDATE public.holarchelp_ambulance_providers SET status='approved', approved_at=now()
    WHERE id = _provider_id RETURNING owner_id INTO _owner;
  INSERT INTO public.user_roles (user_id, role) VALUES (_owner, 'ambulance_staff'::public.user_role) ON CONFLICT DO NOTHING;
END $$;
