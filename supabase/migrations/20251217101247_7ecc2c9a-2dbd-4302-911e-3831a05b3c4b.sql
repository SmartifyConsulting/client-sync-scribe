-- Add trial tracking columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP WITH TIME ZONE;

-- Create index for trial expiry queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends_at ON public.subscriptions(trial_ends_at) WHERE is_trial = true;