alter table public.ratings
  add column if not exists answer_id uuid references public.answers(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.ratings drop constraint if exists ratings_review_check;
alter table public.ratings drop constraint if exists ratings_review_length_check;
alter table public.ratings
  add constraint ratings_review_length_check
  check (review is null or char_length(review) <= 1000);

create unique index if not exists unique_student_teacher_question_rating
  on public.ratings(student_id, teacher_id, question_id);

create index if not exists ratings_student_id_idx on public.ratings(student_id);
create index if not exists ratings_teacher_id_idx on public.ratings(teacher_id);
create index if not exists ratings_question_id_idx on public.ratings(question_id);
create index if not exists ratings_answer_id_idx on public.ratings(answer_id);
create index if not exists ratings_rating_idx on public.ratings(rating);
create index if not exists ratings_created_at_idx on public.ratings(created_at desc);

drop trigger if exists ratings_touch_updated_at on public.ratings;
create trigger ratings_touch_updated_at
  before update on public.ratings
  for each row execute procedure public.touch_updated_at();

create or replace function public.create_teacher_rating(
  target_teacher_id uuid,
  target_question_id uuid,
  target_answer_id uuid,
  rating_value integer,
  review_text text default null
)
returns public.ratings
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_rating public.ratings;
begin
  if auth.uid() is null then raise exception 'You must be logged in to rate a teacher.'; end if;
  if rating_value < 1 or rating_value > 5 then raise exception 'Rating must be between 1 and 5.'; end if;
  if char_length(coalesce(review_text, '')) > 1000 then raise exception 'Review must be 1000 characters or less.'; end if;
  if target_teacher_id = auth.uid() then raise exception 'Teachers cannot rate themselves.'; end if;

  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student') then
    raise exception 'Only students can rate teachers.';
  end if;

  if not exists (select 1 from public.questions q where q.id = target_question_id and q.student_id = auth.uid()) then
    raise exception 'You can only rate teachers who helped on your own question.';
  end if;

  if not exists (select 1 from public.answers a where a.question_id = target_question_id and a.teacher_id = target_teacher_id) then
    raise exception 'This teacher has not answered this question.';
  end if;

  if target_answer_id is not null and not exists (
    select 1 from public.answers a
    where a.id = target_answer_id and a.question_id = target_question_id and a.teacher_id = target_teacher_id
  ) then
    raise exception 'This answer does not belong to the selected teacher and question.';
  end if;

  insert into public.ratings (student_id, teacher_id, question_id, answer_id, rating, review)
  values (auth.uid(), target_teacher_id, target_question_id, target_answer_id, rating_value, nullif(btrim(coalesce(review_text, '')), ''))
  on conflict (student_id, teacher_id, question_id)
  do update set
    answer_id = excluded.answer_id,
    rating = excluded.rating,
    review = excluded.review
  returning * into saved_rating;

  return saved_rating;
end;
$$;

create or replace function public.update_teacher_rating(
  target_rating_id uuid,
  rating_value integer,
  review_text text default null
)
returns public.ratings
language plpgsql
security definer
set search_path = public
as $$
declare
  rating_row public.ratings;
begin
  if auth.uid() is null then raise exception 'You must be logged in to update a rating.'; end if;
  if rating_value < 1 or rating_value > 5 then raise exception 'Rating must be between 1 and 5.'; end if;
  if char_length(coalesce(review_text, '')) > 1000 then raise exception 'Review must be 1000 characters or less.'; end if;

  update public.ratings
  set rating = rating_value,
      review = nullif(btrim(coalesce(review_text, '')), '')
  where id = target_rating_id
    and (student_id = auth.uid() or public.is_admin())
  returning * into rating_row;

  if rating_row.id is null then raise exception 'Rating not found or you cannot update it.'; end if;
  return rating_row;
end;
$$;

create or replace function public.get_teacher_rating_stats(target_teacher_id uuid)
returns table (teacher_id uuid, average_rating numeric, total_ratings integer, total_reviews integer)
language sql
security definer
set search_path = public
as $$
  select
    target_teacher_id,
    coalesce(avg(r.rating), 0)::numeric(3,2),
    count(r.id)::integer,
    count(r.id) filter (where nullif(btrim(coalesce(r.review, '')), '') is not null)::integer
  from public.ratings r
  where r.teacher_id = target_teacher_id;
$$;

create or replace function public.list_teacher_ratings(target_teacher_id uuid)
returns table (
  id uuid,
  student_id uuid,
  teacher_id uuid,
  question_id uuid,
  answer_id uuid,
  rating integer,
  review text,
  created_at timestamptz,
  updated_at timestamptz,
  student_full_name text,
  student_avatar_url text,
  question_title text
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.student_id, r.teacher_id, r.question_id, r.answer_id, r.rating, r.review,
         r.created_at, r.updated_at, p.full_name, p.avatar_url, q.title
  from public.ratings r
  join public.profiles p on p.id = r.student_id
  join public.questions q on q.id = r.question_id
  where r.teacher_id = target_teacher_id
  order by r.created_at desc;
$$;

alter table public.ratings enable row level security;
alter table public.ratings no force row level security;

drop policy if exists "Public can view approved teacher ratings" on public.ratings;
drop policy if exists "Students can rate teachers after help" on public.ratings;
drop policy if exists "Students can update their own ratings" on public.ratings;
drop policy if exists "Admins can manage ratings" on public.ratings;
drop policy if exists "Authenticated users can read ratings" on public.ratings;
drop policy if exists "Students can insert valid ratings" on public.ratings;
drop policy if exists "Students can update own ratings" on public.ratings;
drop policy if exists "Students can delete own ratings" on public.ratings;

create policy "Authenticated users can read ratings"
  on public.ratings for select
  to authenticated
  using (true);

create policy "Students can insert valid ratings"
  on public.ratings for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and teacher_id <> auth.uid()
    and rating between 1 and 5
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student')
    and exists (select 1 from public.questions q where q.id = question_id and q.student_id = auth.uid())
    and exists (select 1 from public.answers a where a.question_id = question_id and a.teacher_id = teacher_id)
    and (
      answer_id is null
      or exists (select 1 from public.answers a where a.id = answer_id and a.question_id = question_id and a.teacher_id = teacher_id)
    )
  );

create policy "Students can update own ratings"
  on public.ratings for update
  to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      student_id = auth.uid()
      and teacher_id <> auth.uid()
      and rating between 1 and 5
      and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'student')
      and exists (select 1 from public.questions q where q.id = question_id and q.student_id = auth.uid())
      and exists (select 1 from public.answers a where a.question_id = question_id and a.teacher_id = teacher_id)
      and (
        answer_id is null
        or exists (select 1 from public.answers a where a.id = answer_id and a.question_id = question_id and a.teacher_id = teacher_id)
      )
    )
  );

create policy "Students can delete own ratings"
  on public.ratings for delete
  to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy "Admins can manage ratings"
  on public.ratings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.ratings to authenticated;
grant execute on function public.create_teacher_rating(uuid, uuid, uuid, integer, text) to authenticated;
grant execute on function public.update_teacher_rating(uuid, integer, text) to authenticated;
grant execute on function public.get_teacher_rating_stats(uuid) to anon, authenticated;
grant execute on function public.list_teacher_ratings(uuid) to anon, authenticated;
