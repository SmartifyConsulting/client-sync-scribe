-- The Banking Details section on My Practice (src/pages/MyPractice.tsx) has
-- always written formData.banking_details via the profile auto-save effect,
-- but the profiles table never had this column — every save silently failed
-- with a "Failed to save" toast.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banking_details text;
