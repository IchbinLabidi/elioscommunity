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
  role public.user_role not null,
  avatar_url text,
  bio text,
  specialty text,
  experience text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists specialty text,
  add column if not exists experience text,
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles enable row level security;

create or replace function public.current_user_role()
returns public.user_role
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

drop policy if exists "Public can view approved teachers" on public.profiles;
drop policy if exists "Authenticated users can view active profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Authenticated users can create their own profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;

create policy "Users can insert their own non-admin profile"
  on public.profiles for insert
  to authenticated
  with check (
    auth.uid() = id
    and role in ('student', 'teacher')
  );

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

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.role is distinct from new.role
    or old.id is distinct from new.id then
    raise exception 'Only admins can change profile id or role';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_privilege_escalation on public.profiles;

create trigger profiles_prevent_privilege_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_profile_privilege_escalation();

create or replace function public.create_own_profile(
  profile_full_name text,
  profile_email text,
  profile_role public.user_role,
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
    created_at
  )
  values (
    auth.uid(),
    nullif(trim(profile_full_name), ''),
    lower(trim(profile_email)),
    profile_role,
    case when profile_role = 'teacher' then nullif(trim(profile_specialty), '') else null end,
    now()
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      role = case
        when public.profiles.role = 'admin' then public.profiles.role
        else excluded.role
      end,
      specialty = excluded.specialty
  returning * into created_profile;

  return created_profile;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant execute on function public.create_own_profile(text, text, public.user_role, text) to authenticated;
