-- Photos attached to a HolarcHelp incident
CREATE TABLE public.holarchelp_incident_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.holarchelp_incidents(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_holarchelp_incident_photos_incident ON public.holarchelp_incident_photos(incident_id);

ALTER TABLE public.holarchelp_incident_photos ENABLE ROW LEVEL SECURITY;

-- Helper: can the current user access an incident in any role
CREATE OR REPLACE FUNCTION public.can_access_holarchelp_incident(_incident_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = _incident_id
      AND (
        i.user_id = auth.uid()
        OR i.triggered_by_user_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::user_role)
        OR (i.assigned_provider_id IS NOT NULL
            AND (public.is_ambulance_staff(i.assigned_provider_id, auth.uid())
                 OR public.is_hospital_staff(i.assigned_provider_id, auth.uid())))
      )
  );
$$;

-- Helper: can the current user upload (owner / triggering doctor only)
CREATE OR REPLACE FUNCTION public.can_upload_holarchelp_incident(_incident_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.holarchelp_incidents i
    WHERE i.id = _incident_id
      AND (i.user_id = auth.uid() OR i.triggered_by_user_id = auth.uid())
  );
$$;

CREATE POLICY "View incident photos if access"
  ON public.holarchelp_incident_photos FOR SELECT
  USING (public.can_access_holarchelp_incident(incident_id));

CREATE POLICY "Insert incident photos if owner or trigger"
  ON public.holarchelp_incident_photos FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND public.can_upload_holarchelp_incident(incident_id)
  );

CREATE POLICY "Delete own incident photos"
  ON public.holarchelp_incident_photos FOR DELETE
  USING (uploaded_by = auth.uid());

-- Private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('holarchelp-incident-photos', 'holarchelp-incident-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (path = "{incident_id}/{filename}")
CREATE POLICY "View incident photo objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'holarchelp-incident-photos'
    AND public.can_access_holarchelp_incident(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Upload incident photo objects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'holarchelp-incident-photos'
    AND auth.uid() IS NOT NULL
    AND public.can_upload_holarchelp_incident(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Delete incident photo objects (uploader)"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'holarchelp-incident-photos'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.holarchelp_incident_photos p
      WHERE p.storage_path = name AND p.uploaded_by = auth.uid()
    )
  );