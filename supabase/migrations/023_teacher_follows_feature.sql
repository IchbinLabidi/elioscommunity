create table if not exists public.teacher_follows (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique (student_id, teacher_id),
  check (student_id <> teacher_id)
);

insert into public.teacher_follows (student_id, teacher_id, created_at)
select student_id, teacher_id, created_at
from public.follows
on conflict (student_id, teacher_id) do nothing;

create index if not exists teacher_follows_student_id_idx on public.teacher_follows(student_id);
create index if not exists teacher_follows_teacher_id_idx on public.teacher_follows(teacher_id);
create index if not exists teacher_follows_created_at_idx on public.teacher_follows(created_at desc);

alter table public.teacher_follows enable row level security;

drop policy if exists "Students can read own teacher follows" on public.teacher_follows;
drop policy if exists "Teachers can read their followers" on public.teacher_follows;
drop policy if exists "Students can follow teachers" on public.teacher_follows;
drop policy if exists "Students can unfollow teachers" on public.teacher_follows;
drop policy if exists "Admins can manage teacher follows" on public.teacher_follows;

create policy "Students can read own teacher follows"
  on public.teacher_follows for select
  to authenticated
  using (student_id = auth.uid());

create policy "Teachers can read their followers"
  on public.teacher_follows for select
  to authenticated
  using (teacher_id = auth.uid());

create policy "Students can follow teachers"
  on public.teacher_follows for insert
  to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.profiles student
      where student.id = auth.uid()
        and student.role::text = 'student'
        and coalesce(student.is_blocked, false) = false
    )
    and exists (
      select 1
      from public.profiles teacher
      where teacher.id = teacher_id
        and teacher.role::text = 'teacher'
        and coalesce(teacher.is_blocked, false) = false
    )
  );

create policy "Students can unfollow teachers"
  on public.teacher_follows for delete
  to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1
      from public.profiles student
      where student.id = auth.uid()
        and student.role::text = 'student'
        and coalesce(student.is_blocked, false) = false
    )
  );

create policy "Admins can manage teacher follows"
  on public.teacher_follows for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.get_teacher_follower_count(target_teacher_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.profiles teacher
      where teacher.id = target_teacher_id
        and teacher.role::text = 'teacher'
        and (coalesce(teacher.is_blocked, false) = false or public.is_admin())
    )
      then (select count(*)::integer from public.teacher_follows follow_row where follow_row.teacher_id = target_teacher_id)
    else 0
  end;
$$;

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
  count(distinct tf.id)::integer as total_followers
from public.profiles p
left join public.ratings r on r.teacher_id = p.id
left join public.answers a on a.teacher_id = p.id
left join public.courses c on c.teacher_id = p.id
left join public.teacher_follows tf on tf.teacher_id = p.id
where p.role::text = 'teacher'
group by p.id;

grant select, insert, delete on public.teacher_follows to authenticated;
grant execute on function public.get_teacher_follower_count(uuid) to anon, authenticated;
grant select on public.teacher_public_stats to anon, authenticated;
