create or replace function public.get_doctor_invite_card(_doctor_id uuid)
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  specialty text,
  practice_number text,
  doctor_number text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.avatar_url, p.specialty, p.practice_number, p.doctor_number
  from public.profiles p
  where p.id = _doctor_id
    and p.role = 'doctor'::user_role
    and auth.uid() is not null
  limit 1;
$$;

grant execute on function public.get_doctor_invite_card(uuid) to authenticated;