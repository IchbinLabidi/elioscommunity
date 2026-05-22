drop view if exists public.teacher_stats;

create or replace view public.teacher_stats
with (security_invoker = true) as
select
  p.id as teacher_id,
  coalesce(avg(r.rating), 0)::numeric(3,2) as rating_average,
  count(distinct r.id)::integer as rating_count,
  count(distinct a.id)::integer as answer_count,
  count(distinct c.id)::integer as course_count
from public.profiles p
left join public.ratings r on r.teacher_id = p.id
left join public.answers a on a.teacher_id = p.id
left join public.courses c on c.teacher_id = p.id
where p.role = 'teacher'
group by p.id;

grant select on public.teacher_stats to anon, authenticated;
