INSERT INTO public.app_integrations_catalog (id, name, category, portal_url, display_order)
VALUES
  ('hollard_insure', 'Hollard Insure', 'insurance', 'https://www.hollard.co.za/brokers-and-advisers', 20),
  ('santam_insure', 'Santam Insure', 'insurance', 'https://www.santam.co.za/', 21),
  ('allan_gray', 'Allan Gray', 'financial_service_provider', 'https://login.secure.allangray.co.za/', 20),
  ('fedgroup', 'Fedgroup', 'financial_service_provider', 'https://www.fedgroup.co.za/for-advisors', 21),
  ('fnb_rmb', 'FNB / RMB', 'financial_service_provider', 'https://www.fnb.co.za/save-and-invest/specialised/Ashburton/index.html', 22),
  ('ashburton_investments', 'Ashburton Investments', 'financial_service_provider', 'https://www.ashburtoninvestments.com/za/contact-us', 23)
ON CONFLICT (id) DO NOTHING
RETURNING id;
