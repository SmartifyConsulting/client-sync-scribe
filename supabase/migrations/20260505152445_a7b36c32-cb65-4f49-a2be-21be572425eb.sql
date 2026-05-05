ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS preferred_language text;

CREATE POLICY "Patients can view their own sessions" 
ON public.sessions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.id = sessions.patient_id AND p.patient_user_id = auth.uid()
  )
);
