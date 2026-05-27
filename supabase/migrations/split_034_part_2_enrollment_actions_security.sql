alter table public.enrollment_actions enable row level security;

drop policy if exists "Admins can manage enrollment actions" on public.enrollment_actions;
create policy "Admins can manage enrollment actions" on public.enrollment_actions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.enrollment_actions to authenticated;

drop policy if exists "Students can update pending enrollments" on public.course_enrollments;

insert into public.enrollment_actions(enrollment_id, action, previous_status, new_status, created_at)
select e.id, 'submitted', null, 'pending', coalesce(e.submitted_at, e.created_at)
from public.course_enrollments e
where not exists (
  select 1 from public.enrollment_actions a
  where a.enrollment_id = e.id and a.action = 'submitted'
);
