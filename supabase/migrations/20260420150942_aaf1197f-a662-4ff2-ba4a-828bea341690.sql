-- Allow patients to read header/footer templates owned by doctors who created documents for them
CREATE POLICY "Patients can read provider header/footer templates"
ON public.header_footer_templates
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT DISTINCT d.user_id
    FROM public.documents d
    JOIN public.patients p ON p.id = d.patient_id
    WHERE p.patient_user_id = auth.uid()
  )
);

-- Allow patients to read templates owned by doctors who created documents for them
-- (needed for the name -> header_footer_template_id lookup)
CREATE POLICY "Patients can read provider templates"
ON public.templates
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT DISTINCT d.user_id
    FROM public.documents d
    JOIN public.patients p ON p.id = d.patient_id
    WHERE p.patient_user_id = auth.uid()
  )
);