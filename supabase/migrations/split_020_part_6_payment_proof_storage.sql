insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760,
  array['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Students can upload payment proofs" on storage.objects;
drop policy if exists "Authenticated users can read payment proofs" on storage.objects;
drop policy if exists "Students can update own payment proofs" on storage.objects;

create policy "Students can upload payment proofs" on storage.objects for insert
to authenticated with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_current_user_blocked() = false
);

create policy "Authenticated users can read payment proofs" on storage.objects for select
to authenticated using (bucket_id = 'payment-proofs');

create policy "Students can update own payment proofs" on storage.objects for update
to authenticated using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
