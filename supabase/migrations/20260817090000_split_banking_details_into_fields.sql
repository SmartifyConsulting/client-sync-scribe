-- Replace the free-text banking_details blob (which never had a working
-- column, hence the "Failed to save" toast) with real, individually
-- labeled fields the doctor can see and fill in directly.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_type text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_swift_code text;
