alter table public.hospital_nurses disable trigger user;
update public.hospital_nurses set ward_id='a0000000-0000-4000-8000-000000000002' where id='bd493577-03a3-4a97-a1f3-38c4109e5ed6';
alter table public.hospital_nurses enable trigger user;