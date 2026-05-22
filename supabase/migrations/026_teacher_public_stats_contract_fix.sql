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
  count(distinct c.id) filter (where c.is_published)::integer as total_courses,
  count(distinct tf.id)::integer as follower_count
from public.profiles p
left join public.ratings r on r.teacher_id = p.id and coalesce(r.is_hidden, false) = false
left join public.answers a on a.teacher_id = p.id and coalesce(a.is_hidden, false) = false
left join public.courses c on c.teacher_id = p.id and coalesce(c.is_hidden, false) = false
left join public.teacher_follows tf on tf.teacher_id = p.id
where p.role::text = 'teacher'
  and coalesce(p.is_blocked, false) = false
group by p.id;

grant select on public.teacher_public_stats to anon, authenticated;
