DELETE FROM public.holarchelp_hospitals a
WHERE a.name ILIKE '%zano%'
  AND a.id <> (
    SELECT b.id FROM public.holarchelp_hospitals b
    WHERE b.name = a.name AND b.owner_id = a.owner_id
    ORDER BY b.created_at ASC LIMIT 1
  );