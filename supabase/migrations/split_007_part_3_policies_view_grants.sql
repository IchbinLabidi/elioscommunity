alter table public.profiles enable row level security;

create policy "Users can insert their own non-admin profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id and role in ('student', 'teacher'));

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Public can read teacher profiles"
  on public.profiles for select
  to anon, authenticated
  using (role = 'teacher');

create policy "Admins can manage all profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant execute on function public.create_own_profile(text, text, text, text) to authenticated;
grant select on public.teacher_stats to anon, authenticated;

notify pgrst, 'reload schema';
