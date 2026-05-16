
-- Hospital ↔ Doctor affiliations
CREATE TABLE public.hospital_doctor_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.holarchelp_hospitals(id) ON DELETE CASCADE,
  doctor_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text,
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, doctor_id)
);
ALTER TABLE public.hospital_doctor_affiliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hda_select_auth" ON public.hospital_doctor_affiliations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "hda_insert_staff_admin" ON public.hospital_doctor_affiliations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));
CREATE POLICY "hda_update_staff_admin" ON public.hospital_doctor_affiliations
  FOR UPDATE TO authenticated
  USING (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));
CREATE POLICY "hda_delete_staff_admin" ON public.hospital_doctor_affiliations
  FOR DELETE TO authenticated
  USING (public.is_hospital_staff(hospital_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));

CREATE TRIGGER trg_hda_updated_at BEFORE UPDATE ON public.hospital_doctor_affiliations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ambulance fleet
CREATE TABLE public.ambulance_fleet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.holarchelp_ambulance_providers(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, vehicle_type)
);
ALTER TABLE public.ambulance_fleet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "af_select_auth" ON public.ambulance_fleet FOR SELECT TO authenticated USING (true);
CREATE POLICY "af_insert_staff_admin" ON public.ambulance_fleet FOR INSERT TO authenticated
  WITH CHECK (public.is_ambulance_staff(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));
CREATE POLICY "af_update_staff_admin" ON public.ambulance_fleet FOR UPDATE TO authenticated
  USING (public.is_ambulance_staff(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));
CREATE POLICY "af_delete_staff_admin" ON public.ambulance_fleet FOR DELETE TO authenticated
  USING (public.is_ambulance_staff(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));
CREATE TRIGGER trg_af_updated_at BEFORE UPDATE ON public.ambulance_fleet
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ambulance coverage areas
CREATE TABLE public.ambulance_coverage_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.holarchelp_ambulance_providers(id) ON DELETE CASCADE,
  area_name text NOT NULL,
  region text,
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, area_name)
);
ALTER TABLE public.ambulance_coverage_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aca_select_auth" ON public.ambulance_coverage_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "aca_insert_staff_admin" ON public.ambulance_coverage_areas FOR INSERT TO authenticated
  WITH CHECK (public.is_ambulance_staff(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));
CREATE POLICY "aca_update_staff_admin" ON public.ambulance_coverage_areas FOR UPDATE TO authenticated
  USING (public.is_ambulance_staff(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));
CREATE POLICY "aca_delete_staff_admin" ON public.ambulance_coverage_areas FOR DELETE TO authenticated
  USING (public.is_ambulance_staff(provider_id, auth.uid()) OR public.has_role(auth.uid(),'admin'::public.user_role));

-- Emergency phone column
ALTER TABLE public.holarchelp_ambulance_providers ADD COLUMN IF NOT EXISTS emergency_phone text;
