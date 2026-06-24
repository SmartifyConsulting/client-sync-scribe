drop view if exists public.holarchelp_hospitals_public;

create view public.holarchelp_hospitals_public
with (security_invoker = on) as
select
  h.id,
  h.name,
  h.address,
  h.city,
  h.country,
  h.latitude,
  h.longitude,
  h.contact_phone,
  h.contact_email,
  h.ownership,
  h.tier,
  h.credential_score,
  h.status,
  h.created_at
from public.holarchelp_hospitals h
where h.status = 'approved'::holarchelp_provider_status;

grant select on public.holarchelp_hospitals_public to authenticated, anon;

create policy "Patients can read own session audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'session-audio'
  and exists (
    select 1
    from public.sessions s
    join public.patients p on p.id = s.patient_id
    where p.patient_user_id = auth.uid()
      and s.audio_url is not null
      and s.audio_url like ('%' || objects.name)
  )
);