import { ChevronDown, FileText, Lock, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChapterAttachment, ChapterVideo, CourseChapterWithContent, CourseWithContent } from '../types/database';

function durationLabel(seconds: number | null) {
  if (!seconds) return 'Video';
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function RowBadge({ freePreview, accessible }: { freePreview: boolean; accessible: boolean }) {
  if (freePreview) return <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-brand-orange">Apercu gratuit</span>;
  if (!accessible) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Verrouille</span>;
  return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Disponible</span>;
}

function VideoRow({ course, chapter, video, accessible }: { course: CourseWithContent; chapter: CourseChapterWithContent; video: ChapterVideo; accessible: boolean }) {
  const body = (
    <>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${accessible ? 'bg-orange-50 text-brand-orange' : 'bg-slate-100 text-slate-400'}`}>
        {accessible ? <PlayCircle className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-brand-navy">{video.title}</span>
        <span className="block text-xs text-slate-500">{durationLabel(video.duration_seconds)} - Lecon video</span>
      </span>
      <RowBadge freePreview={chapter.is_free_preview} accessible={accessible} />
    </>
  );
  return accessible
    ? <Link to={`/courses/${course.id}/learn`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">{body}</Link>
    : <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">{body}</div>;
}

function AttachmentRow({ chapter, attachment, accessible }: { chapter: CourseChapterWithContent; attachment: ChapterAttachment; accessible: boolean }) {
  const body = (
    <>
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${accessible ? 'bg-sky-50 text-brand-navy' : 'bg-slate-100 text-slate-400'}`}>
        {accessible ? <FileText className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-brand-navy">{attachment.title}</span>
        <span className="block text-xs text-slate-500">{attachment.file_type?.includes('pdf') ? 'PDF' : 'Ressource'}</span>
      </span>
      <RowBadge freePreview={chapter.is_free_preview} accessible={accessible} />
    </>
  );
  return accessible && attachment.file_url
    ? <a href={attachment.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">{body}</a>
    : <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">{body}</div>;
}

export default function CourseCurriculum({ course, hasFullAccess = false }: { course: CourseWithContent; hasFullAccess?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(course.chapters[0]?.id ?? null);
  const videos = course.chapters.reduce((sum, chapter) => sum + chapter.videos.length, 0);
  const files = course.chapters.reduce((sum, chapter) => sum + chapter.attachments.length, 0);

  if (!course.chapters.length) {
    return <p className="rounded-2xl border border-dashed border-brand-border bg-white p-6 text-sm text-slate-600">Aucun chapitre publie pour le moment.</p>;
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-black text-brand-navy">Programme du cours</h2>
          <p className="mt-2 text-sm text-slate-600">{course.chapters.length} chapitre(s) - {videos} lecon(s) video - {files} ressource(s)</p>
        </div>
        {!hasFullAccess && Number(course.price) > 0 ? <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"><Lock className="h-3.5 w-3.5" />Inscription requise pour le contenu complet</p> : null}
      </header>
      <div className="space-y-3">
        {course.chapters.map((chapter) => {
          const accessible = Number(course.price) === 0 || chapter.is_free_preview || hasFullAccess;
          const open = expanded === chapter.id;
          const items = chapter.videos.length + chapter.attachments.length;
          return (
            <article key={chapter.id} className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
              <button type="button" onClick={() => setExpanded(open ? null : chapter.id)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50 sm:px-6">
                <span className="flex min-w-0 items-center gap-4">
                  <span className="hidden rounded-xl bg-orange-50 px-3 py-2 text-xs font-black uppercase text-brand-orange sm:block">Chapitre {chapter.chapter_order}</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase text-brand-orange sm:hidden">Chapitre {chapter.chapter_order}</span>
                    <span className="block truncate font-bold text-brand-navy">{chapter.title}</span>
                    <span className="block text-xs text-slate-500">{items} element(s){chapter.is_free_preview ? ' - Apercu gratuit' : ''}</span>
                  </span>
                </span>
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
              </button>
              {open ? (
                <div className="border-t border-slate-100 px-3 py-3 sm:px-4">
                  {chapter.description ? <p className="mb-3 px-3 text-sm leading-6 text-slate-600">{chapter.description}</p> : null}
                  {items ? (
                    <>
                      {chapter.videos.map((video) => <VideoRow key={video.id} course={course} chapter={chapter} video={video} accessible={accessible} />)}
                      {chapter.attachments.map((attachment) => <AttachmentRow key={attachment.id} chapter={chapter} attachment={attachment} accessible={accessible} />)}
                    </>
                  ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Aucun contenu disponible dans ce chapitre.</p>}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
