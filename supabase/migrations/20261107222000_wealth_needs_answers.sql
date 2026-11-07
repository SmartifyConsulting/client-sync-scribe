CREATE TABLE IF NOT EXISTS public.wealth_needs_answers (
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  question text NOT NULL,
  status text NOT NULL CHECK (status IN ('unanswered', 'discussed', 'answered', 'skipped')),
  answer text,
  PRIMARY KEY (client_id, question),
  CHECK ((status = 'answered') = (answer IS NOT NULL))
);

ALTER TABLE public.wealth_needs_answers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.wealth_needs_answers TO authenticated;

DROP POLICY IF EXISTS "Broker access to needs answers" ON public.wealth_needs_answers;
CREATE POLICY "Broker access to needs answers"
ON public.wealth_needs_answers FOR ALL TO authenticated
USING (
  public.can_view_patient_record(client_id)
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.patient_user_id IS DISTINCT FROM auth.uid()
  )
)
WITH CHECK (
  public.can_view_patient_record(client_id)
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_id AND c.patient_user_id IS DISTINCT FROM auth.uid()
  )
);
