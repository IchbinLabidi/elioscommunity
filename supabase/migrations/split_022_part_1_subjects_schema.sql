create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_url text,
  icon text,
  is_published boolean not null default true,
  subject_order integer not null default 1,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists subjects_lower_name_idx on public.subjects(lower(name));
create index if not exists subjects_published_order_idx on public.subjects(is_published, subject_order);

drop trigger if exists subjects_touch_updated_at on public.subjects;
create trigger subjects_touch_updated_at before update on public.subjects
for each row execute function public.touch_updated_at();

insert into public.subjects(name, slug, icon, subject_order)
values
  ('Français','francais','🇫🇷',1),
  ('Mathématiques','mathematiques','📐',2),
  ('Informatique','informatique','💻',3),
  ('Philosophie','philosophie','🧠',4),
  ('Physique','physique','⚛️',5),
  ('Arabe','arabe','🔤',6),
  ('Anglais','anglais','ENG',7),
  ('Histoire','histoire','🏛️',8),
  ('Géographie','geographie','🌍',9),
  ('Économie','economie','📊',10),
  ('Autres','autres','📚',99)
on conflict (slug) do nothing;

insert into public.subjects(name, slug, icon, subject_order)
select distinct c.subject, lower(trim(both '-' from regexp_replace(c.subject, '[^a-zA-Z0-9]+', '-', 'g'))), '📚', 50
from public.courses c
where c.subject is not null
  and not exists (select 1 from public.subjects s where lower(s.name) = lower(c.subject));
