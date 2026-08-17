update public.profiles p
set avatar_url = 'https://lqnnrvvrjscjceswpfal.supabase.co/storage/v1/object/public/avatars/seed%2Fnurse-nomvula.jpg'
from auth.users u
where u.id = p.id and (u.email = 'nurse.test@holarchealth.com' or p.full_name ilike '%Nomvula%');