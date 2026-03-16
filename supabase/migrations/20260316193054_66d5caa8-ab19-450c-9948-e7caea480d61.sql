-- Allow patients to view todos assigned to them
CREATE POLICY "Patients can view todos assigned to them"
ON public.todos FOR SELECT TO authenticated
USING (
  patient_id IN (
    SELECT id FROM public.patients WHERE patient_user_id = auth.uid()
  )
);

-- Allow authenticated users to search doctor profiles
CREATE POLICY "Authenticated users can search doctor profiles"
ON public.profiles FOR SELECT TO authenticated
USING (role = 'doctor');
