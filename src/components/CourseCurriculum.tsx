import { BookOpen } from 'lucide-react';
import { CourseWithContent } from '../types/database';
import ChapterContentViewer from './ChapterContentViewer';
import PublishBadge from './PublishBadge';

export default function CourseCurriculum({ course, hasFullAccess = false }: { course: CourseWithContent; hasFullAccess?: boolean }) {
  if (!course.chapters.length) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No chapters have been published yet.</p>;
  }

  return (
    <div className="space-y-4">
      {course.chapters.map((chapter) => {
        const locked = Number(course.price) > 0 && !chapter.is_free_preview && !hasFullAccess;
        return (
          <article key={chapter.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-elios-blue">Chapter {chapter.chapter_order}</p>
                <h3 className="mt-1 text-xl font-bold text-elios-navy">{chapter.title}</h3>
                {chapter.description ? <p className="mt-2 text-sm text-slate-600">{chapter.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {chapter.is_free_preview ? <PublishBadge preview /> : null}
                {locked ? <PublishBadge locked /> : null}
              </div>
            </div>
            {chapter.videos.length || chapter.attachments.length ? (
              <ChapterContentViewer course={course} chapter={chapter} hasFullAccess={hasFullAccess} />
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500"><BookOpen className="mr-2 inline h-4 w-4" />No content in this chapter yet.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
