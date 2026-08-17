-- Run manually in the Supabase SQL editor (wrap in BEGIN/COMMIT to review first).
-- Renames the account georgia.adams@smartify.co.za to
-- First Name: Georgia, Last Name: Sirinidis.

-- profiles table only has a single full_name field.
UPDATE public.profiles
SET full_name = 'Georgia Sirinidis'
WHERE id = (SELECT id FROM auth.users WHERE email = 'georgia.adams@smartify.co.za');

-- Also update this user's self-service patients row (has separate first_name/
-- last_name/name columns), so both records stay consistent.
UPDATE public.patients
SET
  first_name = 'Georgia',
  last_name = 'Sirinidis',
  name = 'Georgia Sirinidis'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'georgia.adams@smartify.co.za')
  AND patient_user_id = user_id;
