-- Run manually in the Supabase SQL editor (wrap in BEGIN/COMMIT to review first).
-- Renames the seeded "Dr Gianna Buttons" test doctor to "Matthew Buttons".
UPDATE public.profiles
SET full_name = 'Matthew Buttons'
WHERE id = (SELECT id FROM auth.users WHERE email = 'dr.buttons@smartify.co.za');
