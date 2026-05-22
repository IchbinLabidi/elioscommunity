create or replace function public.list_answer_comments(target_answer_id uuid)
returns table (
  id uuid, answer_id uuid, question_id uuid, user_id uuid, content text,
  created_at timestamptz, updated_at timestamptz, edited_at timestamptz,
  deleted_at timestamptz, profile_full_name text, profile_avatar_url text, profile_role text
) language sql security definer set search_path = public as $$
  select c.id, c.answer_id, c.question_id, c.user_id, c.content, c.created_at,
         c.updated_at, c.edited_at, c.deleted_at, p.full_name, p.avatar_url, p.role::text
  from public.answer_comments c
  join public.profiles p on p.id = c.user_id
  join public.answers a on a.id = c.answer_id
  join public.questions q on q.id = c.question_id
  where c.answer_id = target_answer_id and auth.uid() is not null
    and (public.is_admin() or (coalesce(c.is_hidden, false) = false and coalesce(a.is_hidden, false) = false and coalesce(q.is_hidden, false) = false))
  order by c.created_at asc;
$$;

create or replace function public.can_discuss_answer(target_answer_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.answers a
    join public.questions q on q.id = a.question_id
    join public.profiles p on p.id = auth.uid()
    where a.id = target_answer_id
      and coalesce(p.is_blocked, false) = false
      and coalesce(a.is_hidden, false) = false
      and coalesce(q.is_hidden, false) = false
      and (
        public.is_admin()
        or (p.role::text = 'student' and q.student_id = auth.uid())
        or (p.role::text = 'teacher' and a.teacher_id = auth.uid())
      )
  );
$$;

create or replace function public.create_teacher_rating(
  target_teacher_id uuid, target_question_id uuid, target_answer_id uuid,
  rating_value integer, review_text text default null
) returns public.ratings language plpgsql security definer set search_path = public as $$
declare saved_rating public.ratings;
begin
  if auth.uid() is null then raise exception 'You must be logged in to rate a teacher.'; end if;
  if public.is_current_user_blocked() then raise exception 'Your account has been restricted.'; end if;
  if rating_value < 1 or rating_value > 5 then raise exception 'Rating must be between 1 and 5.'; end if;
  if char_length(coalesce(review_text, '')) > 1000 then raise exception 'Review must be 1000 characters or less.'; end if;
  if target_teacher_id = auth.uid() then raise exception 'Teachers cannot rate themselves.'; end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student') then raise exception 'Only students can rate teachers.'; end if;
  if not exists (select 1 from public.questions q where q.id = target_question_id and q.student_id = auth.uid() and coalesce(q.is_hidden, false) = false) then raise exception 'You can only rate teachers who helped on your own question.'; end if;
  if not exists (select 1 from public.answers a where a.question_id = target_question_id and a.teacher_id = target_teacher_id and coalesce(a.is_hidden, false) = false) then raise exception 'This teacher has not answered this question.'; end if;
  if target_answer_id is not null and not exists (
    select 1 from public.answers a where a.id = target_answer_id and a.question_id = target_question_id and a.teacher_id = target_teacher_id and coalesce(a.is_hidden, false) = false
  ) then raise exception 'This answer does not belong to the selected teacher and question.'; end if;

  insert into public.ratings (student_id, teacher_id, question_id, answer_id, rating, review)
  values (auth.uid(), target_teacher_id, target_question_id, target_answer_id, rating_value, nullif(btrim(coalesce(review_text, '')), ''))
  on conflict (student_id, teacher_id, question_id)
  do update set answer_id = excluded.answer_id, rating = excluded.rating, review = excluded.review
  returning * into saved_rating;
  return saved_rating;
end;
$$;

grant execute on function public.list_answer_comments(uuid) to authenticated;
grant execute on function public.can_discuss_answer(uuid) to authenticated;
grant execute on function public.create_teacher_rating(uuid, uuid, uuid, integer, text) to authenticated;
