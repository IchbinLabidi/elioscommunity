create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists platform_settings_public_idx on public.platform_settings(is_public);
create index if not exists platform_settings_updated_at_idx on public.platform_settings(updated_at);

drop trigger if exists platform_settings_touch_updated_at on public.platform_settings;
create trigger platform_settings_touch_updated_at before update on public.platform_settings
for each row execute procedure public.touch_updated_at();

alter table public.platform_settings enable row level security;

drop policy if exists "Public can read public platform settings" on public.platform_settings;
drop policy if exists "Admins can manage platform settings" on public.platform_settings;

create policy "Public can read public platform settings" on public.platform_settings for select
to anon, authenticated using (is_public = true or public.is_admin());

create policy "Admins can manage platform settings" on public.platform_settings for all
to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.platform_settings to anon, authenticated;
grant insert, update, delete on public.platform_settings to authenticated;
