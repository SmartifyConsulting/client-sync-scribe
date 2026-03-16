ALTER TABLE public.todos 
  ADD COLUMN task_type text NOT NULL DEFAULT 'standard',
  ADD COLUMN moolas_reward integer NOT NULL DEFAULT 0,
  ADD COLUMN proof_url text;