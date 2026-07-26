ALTER TABLE public.emoticon_messages
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.emoticon_messages(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS ai_verdict text,
  ADD COLUMN IF NOT EXISTS ai_reason text;

CREATE INDEX IF NOT EXISTS emoticon_messages_reply_to_id_idx ON public.emoticon_messages(reply_to_id);

GRANT SELECT, INSERT ON public.emoticon_messages TO authenticated;
GRANT ALL ON public.emoticon_messages TO service_role;

DROP POLICY IF EXISTS "Users can reply to their check-ins" ON public.emoticon_messages;
CREATE POLICY "Users can reply to their check-ins"
ON public.emoticon_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND reply_to_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.emoticon_messages parent
    WHERE parent.id = reply_to_id
      AND parent.recipient_id = auth.uid()
  )
);