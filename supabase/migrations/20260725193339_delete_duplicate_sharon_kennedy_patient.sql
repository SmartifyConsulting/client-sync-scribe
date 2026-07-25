-- Delete duplicate Sharon Kennedy patient records
-- Keep: 4b1032be-b2ad-4c96-b8da-3cd87d6b8dcb (Sharon Elise Kennedy - 20 sessions - primary test data)
-- Delete: Sharon Kennedy (archived) - 0 sessions
-- Delete: Sharon Elise Kennedy (merged) - 1 session

-- This will cascade delete:
-- - All sessions for these patients
-- - All documents for these patients
-- - All related medical data

DELETE FROM public.patients
WHERE name IN ('Sharon Kennedy (archived)', 'Sharon Elise Kennedy (merged)');

-- Verify deletion - should show only 1 Sharon record with 20 sessions
SELECT p.id, p.name, COUNT(s.id) as session_count
FROM public.patients p
LEFT JOIN public.sessions s ON s.patient_id = p.id
WHERE p.name ILIKE '%sharon%' OR p.name ILIKE '%kennedy%'
GROUP BY p.id, p.name;
