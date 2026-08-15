CREATE UNIQUE INDEX IF NOT EXISTS patients_one_active_record_per_user
  ON public.patients (patient_user_id)
  WHERE patient_user_id IS NOT NULL AND coalesce(status, 'active') <> 'archived';