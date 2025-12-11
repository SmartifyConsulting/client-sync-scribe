-- Add unique mailbox_id to profiles for receiving external documents
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mailbox_id TEXT UNIQUE DEFAULT gen_random_uuid()::text;

-- Update existing profiles with a mailbox_id if null
UPDATE public.profiles SET mailbox_id = gen_random_uuid()::text WHERE mailbox_id IS NULL;

-- Make mailbox_id NOT NULL after populating
ALTER TABLE public.profiles ALTER COLUMN mailbox_id SET NOT NULL;