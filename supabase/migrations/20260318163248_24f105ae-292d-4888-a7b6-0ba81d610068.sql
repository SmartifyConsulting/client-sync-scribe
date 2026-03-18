CREATE TABLE public.appointment_type_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type_name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, type_name)
);

ALTER TABLE public.appointment_type_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own type colors"
  ON public.appointment_type_colors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own type colors"
  ON public.appointment_type_colors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own type colors"
  ON public.appointment_type_colors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own type colors"
  ON public.appointment_type_colors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Patients can view connected doctor type colors"
  ON public.appointment_type_colors FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM doctor_patient_access dpa
    WHERE dpa.doctor_id = appointment_type_colors.user_id
      AND dpa.patient_user_id = auth.uid()
      AND dpa.is_active = true
  ));