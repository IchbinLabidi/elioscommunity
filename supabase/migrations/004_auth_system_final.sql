do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'teacher', 'admin');
  end if;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null,
  avatar_url text,
  bio text,
  specialty text,
  experience text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists specialty text,
  add column if not exists experience text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists is_approved boolean not null default true,
  add column if not exists is_blocked boolean not null default false;

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

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_specialty_idx on public.profiles(specialty);
drop index if exists profiles_email_idx;
create unique index profiles_email_idx on public.profiles(lower(email)) where email <> '';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute procedure public.touch_updated_at();

create or replace function public.current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role::public.user_role from public.profiles where id = auth.uid()
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

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.id is distinct from new.id
    or old.role is distinct from new.role
    or old.is_approved is distinct from new.is_approved
    or old.is_blocked is distinct from new.is_blocked then
    raise exception 'Only admins can change protected profile fields';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_profile_privilege_escalation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := new.raw_user_meta_data->>'role';

  if requested_role not in ('student', 'teacher') then
    requested_role := 'student';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    specialty,
    is_approved,
    is_blocked,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'Elios member'),
    lower(coalesce(new.email, '')),
    requested_role,
    case when requested_role = 'teacher' then nullif(trim(new.raw_user_meta_data->>'specialty'), '') else null end,
    true,
    false,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

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
    is_approved,
    is_blocked,
    created_at,
    updated_at
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(profile_full_name), ''), 'Elios member'),
    lower(trim(profile_email)),
    profile_role,
    case when profile_role = 'teacher' then nullif(trim(profile_specialty), '') else null end,
    true,
    false,
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

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant execute on function public.create_own_profile(text, text, text, text) to authenticated;

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
