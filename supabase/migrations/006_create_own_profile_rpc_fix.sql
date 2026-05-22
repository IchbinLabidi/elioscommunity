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
  role text not null check (role in ('student', 'teacher', 'admin')),
  avatar_url text,
  bio text,
  specialty text,
  experience text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

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

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant execute on function public.create_own_profile(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
