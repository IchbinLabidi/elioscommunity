alter table public.profiles
  add column if not exists headline text,
  add column if not exists location text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists facebook_url text,
  add column if not exists linkedin_url text,
  add column if not exists website_url text,
  add column if not exists subjects text[] default '{}',
  add column if not exists education text,
  add column if not exists languages text[] default '{}',
  add column if not exists is_verified boolean not null default false;

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  subject text not null,
  level text not null,
  price numeric not null default 0,
  currency text not null default 'TND',
  duration text,
  format text not null default 'online',
  cover_url text,
  course_link text,
  contact_whatsapp text,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses
  add column if not exists currency text not null default 'TND',
  add column if not exists duration text,
  add column if not exists format text not null default 'online',
  add column if not exists contact_whatsapp text,
  add column if not exists is_published boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

alter table public.courses drop constraint if exists courses_format_check;
alter table public.courses add constraint courses_format_check check (format in ('online', 'onsite', 'hybrid', 'recorded'));
alter table public.courses drop constraint if exists courses_price_check;
alter table public.courses add constraint courses_price_check check (price >= 0);
