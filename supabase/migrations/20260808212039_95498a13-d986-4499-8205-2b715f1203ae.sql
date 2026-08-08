-- 1. Practice invitations can target a role
ALTER TABLE public.practice_invitations
  ADD COLUMN IF NOT EXISTS invited_role text NOT NULL DEFAULT 'member';

-- 2. Task assignment metadata
ALTER TABLE public.todos
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS todos_assigned_to_idx ON public.todos(assigned_to_user_id);

-- 3. Referral attachments
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS linked_document_ids uuid[] NOT NULL DEFAULT '{}';

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.is_practice_assistant(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.practice_members
    WHERE doctor_id = _user_id AND role = 'assistant'
  )
$$;

CREATE OR REPLACE FUNCTION public.shares_practice(_user_a uuid, _user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.practice_members a
    JOIN public.practice_members b ON b.practice_id = a.practice_id
    WHERE a.doctor_id = _user_a AND b.doctor_id = _user_b
  )
$$;

-- Assistant of the same practice as the owning doctor
CREATE OR REPLACE FUNCTION public.assistant_of_doctor(_assistant uuid, _doctor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_practice_assistant(_assistant)
     AND public.shares_practice(_assistant, _doctor)
$$;

-- 5. Patients: assistants can read the practice doctors' patient list
CREATE POLICY "Practice assistants can view practice patients"
ON public.patients
FOR SELECT
TO authenticated
USING (public.assistant_of_doctor(auth.uid(), user_id));

-- 6. Appointments: assistants can manage the practice doctors' calendar
CREATE POLICY "Practice assistants can view practice appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.assistant_of_doctor(auth.uid(), user_id));

CREATE POLICY "Practice assistants can create practice appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (public.assistant_of_doctor(auth.uid(), user_id));

CREATE POLICY "Practice assistants can update practice appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.assistant_of_doctor(auth.uid(), user_id))
WITH CHECK (public.assistant_of_doctor(auth.uid(), user_id));

CREATE POLICY "Practice assistants can delete practice appointments"
ON public.appointments
FOR DELETE
TO authenticated
USING (public.assistant_of_doctor(auth.uid(), user_id));

-- 7. Todos: recipients see and update tasks assigned to them
CREATE POLICY "Users can view todos assigned to them"
ON public.todos
FOR SELECT
TO authenticated
USING (assigned_to_user_id = auth.uid());

CREATE POLICY "Users can update todos assigned to them"
ON public.todos
FOR UPDATE
TO authenticated
USING (assigned_to_user_id = auth.uid())
WITH CHECK (assigned_to_user_id = auth.uid());

-- Assistants can raise tasks for practice doctors and see tasks they raised
CREATE POLICY "Practice assistants can create practice todos"
ON public.todos
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.assistant_of_doctor(auth.uid(), user_id)
);

CREATE POLICY "Practice assistants can view todos they raised"
ON public.todos
FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- 8. Documents: assistants may create/see hospital admission forms only
CREATE POLICY "Practice assistants can create admission forms"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_practice_assistant(auth.uid())
  AND user_id = auth.uid()
  AND coalesce(template_name, '') ILIKE '%admission%'
);

CREATE POLICY "Practice assistants can view their admission forms"
ON public.documents
FOR SELECT
TO authenticated
USING (
  public.is_practice_assistant(auth.uid())
  AND user_id = auth.uid()
  AND coalesce(template_name, '') ILIKE '%admission%'
);