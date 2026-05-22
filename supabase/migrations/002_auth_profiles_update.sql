alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists updated_at timestamptz not null default now();

update public.profiles p
set email = coalesce(u.email, p.email, '')
from auth.users u
where p.id = u.id
  and p.email = '';

drop index if exists profiles_email_idx;
create unique index profiles_email_idx on public.profiles(lower(email)) where email <> '';

alter table public.profiles enable row level security;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.role is distinct from new.role
    or old.is_blocked is distinct from new.is_blocked
    or old.is_approved is distinct from new.is_approved then
    raise exception 'Only admins can change profile role, approval, or block status';
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
  requested_role public.user_role;
begin
  if new.raw_user_meta_data->>'role' in ('student', 'teacher') then
    requested_role := (new.raw_user_meta_data->>'role')::public.user_role;
  else
    requested_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email, role, specialty, is_approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    requested_role,
    new.raw_user_meta_data->>'specialty',
    case when requested_role = 'teacher' then false else true end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      specialty = excluded.specialty;

  return new;
end;
$$;

drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Authenticated users can create their own profile" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Authenticated users can create their own profile"
  on public.profiles for insert
  with check (
    auth.uid() = id
    and role in ('student', 'teacher')
    and (
      (role = 'student' and is_approved = true)
      or (role = 'teacher' and is_approved = false)
    )
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id and not is_blocked)
  with check (auth.uid() = id);

create policy "Admins can manage profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.profiles to authenticated;

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
    raise exception 'Public users can only create student or teacher profiles';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role,
    specialty,
    is_approved,
    created_at
  )
  values (
    auth.uid(),
    nullif(trim(profile_full_name), ''),
    lower(trim(profile_email)),
    profile_role,
    case when profile_role = 'teacher' then nullif(trim(profile_specialty), '') else null end,
    case when profile_role = 'teacher' then false else true end,
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
      is_approved = case
        when public.profiles.role = 'admin' then public.profiles.is_approved
        when excluded.role = 'teacher' then false
        else true
      end
  returning * into created_profile;

  return created_profile;
end;
$$;

grant execute on function public.create_own_profile(text, text, public.user_role, text) to authenticated;

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
  and p.is_approved
  and not p.is_blocked
group by p.id;

grant select on public.teacher_stats to anon, authenticated;
