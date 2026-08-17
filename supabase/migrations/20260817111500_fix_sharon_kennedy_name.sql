-- There is only one profile for this person — clean up the "Sharon Elise
-- Kennedy (merged)" name left over from a prior record merge, and the
-- inconsistent "Shannon" spelling.
UPDATE public.profiles SET full_name = 'Sharon Kennedy' WHERE full_name ILIKE '%Sharon%Kennedy%' OR full_name ILIKE '%Shannon%Kennedy%';
UPDATE public.patients SET name = 'Sharon Kennedy' WHERE name ILIKE '%Sharon%Kennedy%' OR name ILIKE '%Shannon%Kennedy%';
