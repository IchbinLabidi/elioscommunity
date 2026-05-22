drop view if exists public.teacher_stats;

drop policy if exists "Public can view approved teachers" on public.profiles;
drop policy if exists "Authenticated users can view active profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Authenticated users can create their own profile" on public.profiles;
drop policy if exists "Users can insert their own non-admin profile" on public.profiles;
drop policy if exists "Public can read teacher profiles" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Admins can manage all profiles" on public.profiles;

alter table public.profiles
  alter column role type text using role::text;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint if exists %I', constraint_name);
  end loop;
end;
$$;

alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'teacher', 'admin'));

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

drop function if exists public.create_own_profile(text, text, public.user_role, text);
drop function if exists public.create_own_profile(text, text, text, text);

create or replace function public.create_own_profile(
  profile_full_name text,
  profile_email text,
  profile_role text,
  profile_specialty text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  created_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be authenticated to create a profile';
  end if;

  if profile_role not in ('student', 'teacher') then
    raise exception 'Public users cannot create admin profiles';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    specialty,
    created_at,
    updated_at
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(profile_full_name), ''), 'Elios member'),
    lower(trim(profile_email)),
    profile_role,
    case when profile_role = 'teacher' then nullif(trim(profile_specialty), '') else null end,
    now(),
    now()
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      role = case
        when public.profiles.role = 'admin' then public.profiles.role
        else excluded.role
      end,
      specialty = excluded.specialty,
      updated_at = now()
  returning * into created_profile;

  return created_profile;
end;
$$;

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
