ALTER TABLE public.biolog_exercises
  ADD CONSTRAINT biolog_exercises_user_name_key UNIQUE (user_id, name);
