-- Create avatars storage bucket for team photos
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their team photos
create policy "Users can upload team photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars' and
  (storage.foldername(name))[1] = 'team-photos'
);

-- Allow public access to view team photos
create policy "Team photos are publicly accessible"
on storage.objects for select
to public
using (bucket_id = 'avatars');

-- Allow users to update/delete their own team photos
create policy "Users can update their team photos"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

create policy "Users can delete their team photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars');
