WITH pool AS (
  SELECT unnest(ARRAY[
    '/__l5e/assets-v1/0ea83ca6-c57e-4f69-859e-3ae705b9e391/avatar-1.jpg',
    '/__l5e/assets-v1/c302a2be-7964-44c9-84ba-ef2d0d711dbb/avatar-2.jpg',
    '/__l5e/assets-v1/d23aab9e-ebdf-4834-8613-dba82aa0f94e/avatar-3.jpg',
    '/__l5e/assets-v1/ce22d32f-2159-4923-96e0-ed8640bbe24a/avatar-4.jpg',
    '/__l5e/assets-v1/fe859d48-3a53-44c2-9fa6-9fd6c6bf5c20/avatar-5.jpg',
    '/__l5e/assets-v1/4133c7fc-86ac-4e40-bdb0-d3cd7e3922c8/avatar-6.jpg',
    '/__l5e/assets-v1/e6211f1e-cc20-4577-bc2b-b848873c7fbd/avatar-7.jpg',
    '/__l5e/assets-v1/23e416e6-c36a-46ef-b984-98f3bbfeecf9/avatar-8.jpg'
  ]) AS url, generate_series(0,7) AS idx
),
targets AS (
  SELECT id, (row_number() OVER (ORDER BY created_at)) % 8 AS slot
  FROM public.profiles
  WHERE avatar_url IS NULL
    AND coalesce(country, '') NOT IN ('NG', 'Nigeria', 'ng')
    AND coalesce(mobile_number, '') NOT LIKE '+234%'
    AND coalesce(mobile_number, '') NOT LIKE '234%'
)
UPDATE public.profiles p
SET avatar_url = pool.url
FROM targets t
JOIN pool ON pool.idx = t.slot
WHERE p.id = t.id;