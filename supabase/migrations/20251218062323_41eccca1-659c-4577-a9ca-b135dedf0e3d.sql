-- Add mailbox_alias column to profiles for custom email aliases
ALTER TABLE public.profiles 
ADD COLUMN mailbox_alias text UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_mailbox_alias ON public.profiles(mailbox_alias) WHERE mailbox_alias IS NOT NULL;