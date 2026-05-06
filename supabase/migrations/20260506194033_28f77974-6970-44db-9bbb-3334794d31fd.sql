CREATE POLICY "Assigned provider staff can update incident"
ON public.holarchelp_incidents
FOR UPDATE
USING (
  assigned_provider_id IS NOT NULL
  AND (
    public.is_ambulance_staff(assigned_provider_id, auth.uid())
    OR public.is_hospital_staff(assigned_provider_id, auth.uid())
  )
)
WITH CHECK (
  assigned_provider_id IS NOT NULL
  AND (
    public.is_ambulance_staff(assigned_provider_id, auth.uid())
    OR public.is_hospital_staff(assigned_provider_id, auth.uid())
  )
);