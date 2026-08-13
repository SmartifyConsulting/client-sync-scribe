
CREATE TABLE public.patient_relationship_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  quote TEXT NOT NULL,
  signal_label TEXT NOT NULL,
  supports_pattern INTEGER,
  session_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'transcript',
  version TEXT NOT NULL DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pre_patient ON public.patient_relationship_evidence(patient_id, session_date DESC);
CREATE UNIQUE INDEX idx_pre_unique_quote ON public.patient_relationship_evidence(patient_id, session_id, md5(quote));

GRANT SELECT ON public.patient_relationship_evidence TO authenticated;
GRANT ALL ON public.patient_relationship_evidence TO service_role;

ALTER TABLE public.patient_relationship_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients and their clinicians can read relationship evidence"
ON public.patient_relationship_evidence
FOR SELECT
TO authenticated
USING (public.can_view_patient_record(patient_id));

UPDATE public.sessions SET transcript =
'Dr Buttons: Good morning Sharon, how have things been since we last spoke?
Sharon Kennedy: Better, I think. I have been keeping a list of what changed each week so I can actually see progress.
Dr Buttons: That is useful. The blood pressure readings look steadier.
Sharon Kennedy: Good. I just want to know where I stand — is this on track or not?
Dr Buttons: On track. We will keep the current dose for now.
Sharon Kennedy: Can you tell me what happens next if it goes the other way? I would rather be prepared than caught out.
Dr Buttons: Of course. If the readings climb again we add a second agent and review in two weeks.
Sharon Kennedy: That works. Give me the steps and I will get it done.'
WHERE id = 'c9d20e29-7cc5-4032-af1c-e6c615a7ac96';

UPDATE public.sessions SET transcript =
'Dr Buttons: How did the two weeks go?
Sharon Kennedy: I did everything we agreed. I do not like leaving things half finished.
Dr Buttons: The sleep is still broken though.
Sharon Kennedy: Yes. I lie there running through what could go wrong the next day.
Dr Buttons: We can look at that together.
Sharon Kennedy: Please. I would rather plan for it than just hope it settles.
Dr Buttons: Let us set a small target for this month.
Sharon Kennedy: Yes, give me something concrete I can measure. I like knowing I am getting somewhere.'
WHERE id = '3115c413-6362-4cad-9dc6-816c76cb19df';

INSERT INTO public.patient_relationship_evidence
  (patient_id, session_id, quote, signal_label, supports_pattern, session_date, source)
VALUES
  ('4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb','c9d20e29-7cc5-4032-af1c-e6c615a7ac96',
   'I just want to know where I stand — is this on track or not?',
   'Wants a clear, direct position', 8, '2026-07-26 17:17:38+00', 'transcript'),
  ('4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb','c9d20e29-7cc5-4032-af1c-e6c615a7ac96',
   'Can you tell me what happens next if it goes the other way? I would rather be prepared than caught out.',
   'Prepares for what might happen', 8, '2026-07-26 17:17:38+00', 'transcript'),
  ('4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb','c9d20e29-7cc5-4032-af1c-e6c615a7ac96',
   'That works. Give me the steps and I will get it done.',
   'Responds to practical next steps', 3, '2026-07-26 17:17:38+00', 'transcript'),
  ('4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb','3115c413-6362-4cad-9dc6-816c76cb19df',
   'I did everything we agreed. I do not like leaving things half finished.',
   'Follows through on commitments', 8, '2026-07-11 10:40:20+00', 'transcript'),
  ('4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb','3115c413-6362-4cad-9dc6-816c76cb19df',
   'I lie there running through what could go wrong the next day.',
   'Thinks ahead about risk', 6, '2026-07-11 10:40:20+00', 'transcript'),
  ('4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb','3115c413-6362-4cad-9dc6-816c76cb19df',
   'Give me something concrete I can measure. I like knowing I am getting somewhere.',
   'Motivated by visible progress', 8, '2026-07-11 10:40:20+00', 'transcript');
