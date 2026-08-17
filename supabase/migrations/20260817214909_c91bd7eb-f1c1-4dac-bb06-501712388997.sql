create or replace function public.get_seeded_profile_names(_emails text[])
returns table(email text, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email)::text, p.full_name
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = any (select lower(e) from unnest(_emails) e)
$$;

grant execute on function public.get_seeded_profile_names(text[]) to authenticated;