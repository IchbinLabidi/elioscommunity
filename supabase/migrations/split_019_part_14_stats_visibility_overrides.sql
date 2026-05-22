create or replace function public.get_teacher_rating_stats(target_teacher_id uuid)
returns table (teacher_id uuid, average_rating numeric, total_ratings integer, total_reviews integer)
language sql security definer set search_path = public as $$
  select target_teacher_id,
         coalesce(avg(r.rating), 0)::numeric(3,2),
         count(r.id)::integer,
         count(r.id) filter (where nullif(btrim(coalesce(r.review, '')), '') is not null)::integer
  from public.ratings r
  where r.teacher_id = target_teacher_id
    and coalesce(r.is_hidden, false) = false;
$$;

create or replace function public.list_teacher_ratings(target_teacher_id uuid)
returns table (
  id uuid, student_id uuid, teacher_id uuid, question_id uuid, answer_id uuid,
  rating integer, review text, created_at timestamptz, updated_at timestamptz,
  student_full_name text, student_avatar_url text, question_title text
) language sql security definer set search_path = public as $$
  select r.id, r.student_id, r.teacher_id, r.question_id, r.answer_id, r.rating,
         r.review, r.created_at, r.updated_at, p.full_name, p.avatar_url, q.title
  from public.ratings r
  join public.profiles p on p.id = r.student_id
  join public.questions q on q.id = r.question_id
  where r.teacher_id = target_teacher_id
    and (public.is_admin() or (
      coalesce(r.is_hidden, false) = false
      and coalesce(q.is_hidden, false) = false
      and coalesce(p.is_blocked, false) = false
    ))
  order by r.created_at desc;
$$;

create or replace view public.course_curriculum_public
with (security_invoker = false) as
select
  m.id as module_id, m.course_id, m.teacher_id, m.title as module_title,
  m.description as module_description, m.module_order, ch.id as chapter_id,
  ch.title as chapter_title, ch.description as chapter_description,
  ch.chapter_order, ch.is_free_preview,
  c.price <= 0 or ch.is_free_preview = true as is_accessible
from public.course_modules m
join public.courses c on c.id = m.course_id
left join public.course_chapters ch
  on ch.module_id = m.id
  and ch.is_published = true
  and coalesce(ch.is_hidden, false) = false
join public.profiles p on p.id = c.teacher_id
where m.is_published = true
  and c.is_published = true
  and coalesce(m.is_hidden, false) = false
  and coalesce(c.is_hidden, false) = false
  and p.role::text = 'teacher'
  and coalesce(p.is_blocked, false) = false;

grant execute on function public.get_teacher_rating_stats(uuid) to anon, authenticated;
grant execute on function public.list_teacher_ratings(uuid) to anon, authenticated;
grant select on public.course_curriculum_public to anon, authenticated;
