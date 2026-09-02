create policy "Organizers manage own presentation files"
on storage.objects
for all
to authenticated
using (bucket_id = 'presentation-files' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'presentation-files' and (storage.foldername(name))[1] = auth.uid()::text);