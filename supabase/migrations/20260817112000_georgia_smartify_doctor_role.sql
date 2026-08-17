-- Switch georgia.adams@smartify.co.za to doctor-role navigation so the
-- doctor sidebar (including the new My Dashboard link) shows for her.
-- She keeps her admin role in user_roles alongside this.
UPDATE public.profiles
SET role = 'doctor'
WHERE id = (SELECT id FROM auth.users WHERE email = 'georgia.adams@smartify.co.za');
