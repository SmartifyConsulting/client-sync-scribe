-- Add reporting_to_email to patients
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS reporting_to_email text;

-- Add auto-email preference columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_email_invoice_to_insurance boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_email_prescription_to_pharmacy boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auto_email_certificate_to_employer boolean DEFAULT false;