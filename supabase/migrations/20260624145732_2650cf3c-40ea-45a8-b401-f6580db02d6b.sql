create policy "Public can view avatars"
on storage.objects
for select
to public
using (bucket_id = 'avatars');