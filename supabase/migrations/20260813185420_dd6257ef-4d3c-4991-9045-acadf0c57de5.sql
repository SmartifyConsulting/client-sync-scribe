DELETE FROM public.hospital_doctor_affiliations
WHERE doctor_id = '54fa34d8-9705-4407-a825-19c5756ca184'
  AND hospital_id = '8bab7ca0-0e5c-4835-93c1-815d121c5326';

DELETE FROM public.doctor_hospital_affiliations
WHERE doctor_id = '54fa34d8-9705-4407-a825-19c5756ca184';