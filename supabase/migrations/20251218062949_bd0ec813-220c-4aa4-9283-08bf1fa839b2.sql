-- Create user_invitations table for in-app invitations
CREATE TABLE public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for user_invitations
CREATE POLICY "Users can view invitations they sent"
  ON public.user_invitations FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Users can view invitations they received"
  ON public.user_invitations FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can create invitations"
  ON public.user_invitations FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can update invitation status"
  ON public.user_invitations FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Senders can delete their invitations"
  ON public.user_invitations FOR DELETE
  USING (auth.uid() = sender_id);

-- Create index for faster lookups
CREATE INDEX idx_user_invitations_recipient ON public.user_invitations(recipient_id) WHERE status = 'pending';
CREATE INDEX idx_user_invitations_sender ON public.user_invitations(sender_id);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(recipient_email);

-- Add trigger for updated_at
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();