alter table public.courses add column if not exists subject_id uuid references public.subjects(id) on delete cascade;
alter table public.courses add column if not exists course_order integer not null default 1;
alter table public.course_chapters add column if not exists subject_id uuid references public.subjects(id) on delete cascade;
alter table public.chapter_videos add column if not exists subject_id uuid references public.subjects(id) on delete cascade;
alter table public.chapter_attachments add column if not exists subject_id uuid references public.subjects(id) on delete cascade;
alter table public.course_enrollments add column if not exists subject_id uuid references public.subjects(id) on delete cascade;

update public.courses c
set subject_id = s.id
from public.subjects s
where c.subject_id is null
  and lower(s.name) = lower(c.subject);

update public.courses c
set subject_id = s.id
from public.subjects s
where c.subject_id is null
  and s.slug = 'autres';

update public.course_chapters ch
set subject_id = c.subject_id
from public.courses c
where ch.course_id = c.id and ch.subject_id is null;

update public.chapter_videos v
set subject_id = c.subject_id
from public.courses c
where v.course_id = c.id and v.subject_id is null;

update public.chapter_attachments a
set subject_id = c.subject_id
from public.courses c
where a.course_id = c.id and a.subject_id is null;

update public.course_enrollments e
set subject_id = c.subject_id
from public.courses c
where e.course_id = c.id and e.subject_id is null;

alter table public.courses alter column subject_id set not null;
alter table public.course_chapters alter column subject_id set not null;
alter table public.chapter_videos alter column subject_id set not null;
alter table public.chapter_attachments alter column subject_id set not null;
alter table public.course_enrollments alter column subject_id set not null;

alter table public.course_chapters alter column module_id drop not null;
alter table public.chapter_videos alter column module_id drop not null;
alter table public.chapter_attachments alter column module_id drop not null;
