create index if not exists courses_teacher_id_idx on public.courses(teacher_id);
create index if not exists courses_subject_idx on public.courses(subject);
create index if not exists courses_level_idx on public.courses(level);
create index if not exists courses_is_published_idx on public.courses(is_published);
create index if not exists courses_created_at_idx on public.courses(created_at desc);
create index if not exists profiles_subjects_idx on public.profiles using gin(subjects);

drop trigger if exists courses_touch_updated_at on public.courses;
create trigger courses_touch_updated_at
  before update on public.courses
  for each row execute procedure public.touch_updated_at();

drop view if exists public.teacher_public_stats;
create or replace view public.teacher_public_stats
with (security_invoker = false) as
select
  p.id as teacher_id,
  coalesce(avg(r.rating), 0)::numeric(3,2) as average_rating,
  count(distinct r.id)::integer as total_ratings,
  count(distinct r.id) filter (where nullif(btrim(coalesce(r.review, '')), '') is not null)::integer as total_reviews,
  count(distinct a.id)::integer as total_answers,
  count(distinct a.id) filter (where a.is_best)::integer as total_best_answers,
  count(distinct c.id) filter (where c.is_published)::integer as total_courses
from public.profiles p
left join public.ratings r on r.teacher_id = p.id
left join public.answers a on a.teacher_id = p.id
left join public.courses c on c.teacher_id = p.id
where p.role::text = 'teacher'
group by p.id;

grant select on public.teacher_public_stats to anon, authenticated;
