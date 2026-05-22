import { Lock } from 'lucide-react';
import { Course, CourseLesson } from '../types/database';
import PdfResourceCard from './PdfResourceCard';
import VideoPlayer from './VideoPlayer';

function lessonAccessible(course: Course, lesson: CourseLesson) {
  return Number(course.price) === 0 || lesson.is_free_preview;
}

export default function CourseContentViewer({ course, lessons }: { course: Course; lessons: CourseLesson[] }) {
  if (!lessons.length) {
    return <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">Lessons will appear here when this course has content.</p>;
  }

  return (
    <div className="space-y-4">
      {lessons.map((lesson) => {
        const canOpen = lessonAccessible(course, lesson);
        return (
          <article key={lesson.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-elios-blue">Lesson {lesson.lesson_order}</p>
                <h3 className="mt-1 text-lg font-bold text-elios-navy">{lesson.title}</h3>
                {lesson.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.description}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {lesson.is_free_preview ? <span className="rounded-full bg-elios-yellow px-3 py-1 text-xs font-bold text-elios-navy">Free preview</span> : null}
                {!canOpen ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Locked</span> : null}
              </div>
            </div>
            {canOpen ? (
              <div className="mt-4 space-y-3">
                {lesson.video_url ? <VideoPlayer url={lesson.video_url} title={lesson.title} /> : null}
                {lesson.pdf_url ? <PdfResourceCard url={lesson.pdf_url} title={lesson.title} /> : null}
                {!lesson.video_url && !lesson.pdf_url ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No video or PDF has been attached to this lesson yet.</p> : null}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                <Lock className="h-5 w-5 text-elios-blue" />
                Contact the teacher to enroll and access this lesson.
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
