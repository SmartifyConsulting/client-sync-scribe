-- Prevent the "two Georgia Adams" class of bug: multiple uncoordinated
-- code paths (signup, Profile.tsx fallback, MyDetails.tsx self-heal) can
-- each try to auto-create a self-service patients row for the same logged
-- in user. None of those checks are atomic, so two near-simultaneous
-- inserts can both pass a "does this already exist?" check before either
-- commits. A partial unique index makes the database itself the source of
-- truth: a second self-record insert for the same user now fails with a
-- 23505 conflict instead of silently creating a duplicate.
--
-- Partial (not a plain UNIQUE column constraint) because patient_user_id is
-- nullable for doctor-managed patients who haven't linked their own login.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_patients_patient_user_id_self
  ON public.patients(patient_user_id)
  WHERE patient_user_id IS NOT NULL;
