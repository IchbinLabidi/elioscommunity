drop policy if exists "Authenticated users can read payment proofs" on storage.objects;

create policy "Enrollment participants can read payment proofs" on storage.objects for select
to authenticated using (
  bucket_id = 'payment-proofs'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
    or exists (
      select 1
      from public.course_enrollments e
      where e.payment_proof_path = storage.objects.name
        and e.teacher_id = auth.uid()
    )
  )
);
