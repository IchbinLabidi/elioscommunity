drop policy if exists "Participants can read answer comments" on public.answer_comments;

create policy "Participants can read answer comments"
  on public.answer_comments for select
  to authenticated
  using (
    public.is_admin()
    or (
      coalesce(is_hidden, false) = false
      and exists (
        select 1 from public.answers a
        join public.questions q on q.id = a.question_id
        where a.id = answer_comments.answer_id
          and q.id = answer_comments.question_id
          and coalesce(a.is_hidden, false) = false
          and coalesce(q.is_hidden, false) = false
      )
    )
  );
