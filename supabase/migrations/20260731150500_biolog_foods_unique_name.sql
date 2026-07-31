-- Remove duplicate food rows created by a seeding race, keeping the earliest per user+name.
DELETE FROM public.biolog_foods a
USING public.biolog_foods b
WHERE a.user_id = b.user_id
  AND a.name = b.name
  AND a.created_at > b.created_at;

ALTER TABLE public.biolog_foods
  ADD CONSTRAINT biolog_foods_user_name_key UNIQUE (user_id, name);
