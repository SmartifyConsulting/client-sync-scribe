ALTER TABLE public.pricing_config DROP CONSTRAINT IF EXISTS pricing_config_role_check;
INSERT INTO public.pricing_config (role, billing_cycle, price, name, savings, currency)
SELECT * FROM (VALUES ('wealth_adviser','monthly',499::numeric,'Adviser',0::numeric,'ZAR'),('wealth_firm','monthly',1999::numeric,'Firm',0::numeric,'ZAR')) v(role,billing_cycle,price,name,savings,currency)
WHERE NOT EXISTS (SELECT 1 FROM public.pricing_config p WHERE p.role=v.role);