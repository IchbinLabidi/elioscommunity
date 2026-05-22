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
