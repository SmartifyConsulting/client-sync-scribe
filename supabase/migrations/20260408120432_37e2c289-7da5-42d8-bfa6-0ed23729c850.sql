-- 1. Fix profiles: drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated users can search profiles by name" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

-- Keep the doctor-specific search policy but also allow patients to see connected doctor's full_name
-- The existing "Authenticated users can search doctor profiles" policy covers doctor discovery
-- The existing "Patients can view connected doctor profiles" covers patient-doctor relationship
-- The existing "Users can view their own profile" covers self-access

-- 2. Fix session-audio bucket: make private
UPDATE storage.buckets SET public = false WHERE id = 'session-audio';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Session audio is publicly accessible" ON storage.objects;

-- Add authenticated owner-scoped SELECT policy
CREATE POLICY "Users can view own session audio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'session-audio' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Add upload policy for authenticated users (to their own folder)
CREATE POLICY "Users can upload own session audio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'session-audio' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 3. Fix payment_history INSERT policy
DROP POLICY IF EXISTS "System can insert payment history" ON public.payment_history;

CREATE POLICY "Authenticated users can insert own payment history"
  ON public.payment_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);