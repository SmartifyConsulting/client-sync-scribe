
DROP POLICY IF EXISTS "Authorized users can insert admissions" ON public.hospital_admissions;

CREATE POLICY "Authorized users can insert admissions"
ON public.hospital_admissions
FOR INSERT
WITH CHECK (
  (auth.uid() = created_by)
  AND (
    -- Patient inserting for their own record
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = hospital_admissions.patient_id
        AND p.patient_user_id = auth.uid()
    )
    -- Owning provider of the patient record
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = hospital_admissions.patient_id
        AND p.user_id = auth.uid()
    )
    -- Doctor with active access to the patient
    OR EXISTS (
      SELECT 1
      FROM public.patients p
      JOIN public.doctor_patient_access dpa
        ON dpa.patient_user_id = p.patient_user_id
      WHERE p.id = hospital_admissions.patient_id
        AND dpa.doctor_id = auth.uid()
        AND dpa.is_active = true
    )
    -- Hospital member inserting: must have an existing care relationship
    OR (
      hospital_provider_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.holarchelp_hospital_members m
        WHERE m.hospital_id = hospital_admissions.hospital_provider_id
          AND m.user_id = auth.uid()
      )
      AND (
        -- Patient already has a prior admission at this hospital
        EXISTS (
          SELECT 1 FROM public.hospital_admissions ha
          WHERE ha.patient_id = hospital_admissions.patient_id
            AND ha.hospital_provider_id = hospital_admissions.hospital_provider_id
        )
        -- Or a doctor with active access to the patient is affiliated with this hospital
        OR EXISTS (
          SELECT 1
          FROM public.patients p
          JOIN public.doctor_patient_access dpa
            ON dpa.patient_user_id = p.patient_user_id
          JOIN public.hospital_doctor_affiliations hda
            ON hda.doctor_id = dpa.doctor_id
          WHERE p.id = hospital_admissions.patient_id
            AND dpa.is_active = true
            AND hda.hospital_id = hospital_admissions.hospital_provider_id
        )
        -- Or the patient themselves is inserting via a hospital account (edge case)
        OR EXISTS (
          SELECT 1 FROM public.patients p
          WHERE p.id = hospital_admissions.patient_id
            AND p.patient_user_id = auth.uid()
        )
      )
    )
  )
);
