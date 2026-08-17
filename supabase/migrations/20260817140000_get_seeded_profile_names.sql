-- Lets the profile switcher (AccountMenu) show each seeded test profile's
-- *current* full_name instead of the hardcoded name in testProfiles.ts, so
-- names stay correct after a user edits their profile. Restricted to the
-- fixed seeded-test-account allowlist only — not a general email lookup.
CREATE OR REPLACE FUNCTION public.get_seeded_profile_names()
RETURNS TABLE(email text, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.email::text, p.full_name
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.email IN (
    'info@georgiaadams.co.za',
    'georgia.adams@smartify.co.za',
    'sme@smartify.co.za',
    'projectmanager@smartify.co.za',
    'hospital.test@holarchealth.com',
    'renken@smartify.co.za',
    'er.test@holarchealth.com',
    'dr.buttons@smartify.co.za',
    'dr.gianna.buttons@smartify.co.za',
    '2348167581572@phone.holarc.local',
    'nurse.test@holarchealth.com'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_seeded_profile_names() TO authenticated;
