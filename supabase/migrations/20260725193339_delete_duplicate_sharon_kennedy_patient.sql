-- Delete duplicate Sharon Elise Kennedy (merged) patient record
-- Keep: 4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb (20 sessions - primary test data)
-- Delete: 38640761-a91e-4b86-ae0b-1052d86ld965 (1 session - merged duplicate)

-- This will cascade delete:
-- - All sessions for this patient
-- - All documents for this patient
-- - All related medical data

DELETE FROM public.patients
WHERE id = '38640761-a91e-4b86-ae0b-1052d86ld965';

-- Verify deletion
SELECT id, name, COUNT(s.id) as session_count
FROM public.patients p
LEFT JOIN public.sessions s ON s.patient_id = p.id
WHERE name ILIKE '%sharon%' OR name ILIKE '%kennedy%'
GROUP BY p.id, p.name;
