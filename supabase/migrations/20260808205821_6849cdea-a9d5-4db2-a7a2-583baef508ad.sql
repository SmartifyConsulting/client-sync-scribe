ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS assignee text NOT NULL DEFAULT 'doctor';

ALTER TABLE public.todos DROP CONSTRAINT IF EXISTS todos_assignee_check;
ALTER TABLE public.todos ADD CONSTRAINT todos_assignee_check CHECK (assignee IN ('doctor','patient'));

CREATE INDEX IF NOT EXISTS todos_user_assignee_status_idx ON public.todos (user_id, assignee, status);

-- Reclassify existing self-care instructions as patient tasks
UPDATE public.todos
SET assignee = 'patient'
WHERE task_type <> 'document_review'
  AND (
    title ILIKE '%exercise%' OR title ILIKE '%stretch%' OR title ILIKE '%physio%'
    OR title ILIKE '%diet%' OR title ILIKE '%gluten%' OR title ILIKE '%nightshade%'
    OR title ILIKE '%sleep%' OR title ILIKE '%hydrat%' OR title ILIKE '%water intake%'
    OR title ILIKE '%walk%' OR title ILIKE '%rest%' OR title ILIKE '%heat pack%'
    OR title ILIKE '%ice pack%' OR title ILIKE '%home care%' OR title ILIKE '%lifestyle%'
    OR title ILIKE '%breathing%' OR title ILIKE '%meditat%' OR title ILIKE '%smoking%'
    OR title ILIKE '%alcohol%'
  );

-- Medication / prescription instructions are handled by prescriptions and adherence, not tasks
DELETE FROM public.todos
WHERE task_type <> 'document_review'
  AND document_id IS NULL
  AND (
    title ILIKE '%prescri%' OR title ILIKE '%take % tablet%' OR title ILIKE '%medication%'
    OR title ILIKE '%mg %' OR title ILIKE '%dosage%' OR title ILIKE '%cream morning%'
    OR title ILIKE '%mouthwash%' OR title ILIKE '%twice a day%' OR title ILIKE '%three times a day%'
  );