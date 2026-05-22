import { Eye, EyeOff, FileText, Pencil, PlayCircle, Trash2 } from 'lucide-react';
import { CourseLesson } from '../types/database';

export default function LessonCard({
  lesson,
  onEdit,
  onDelete,
  onTogglePublished,
}: {
  lesson: CourseLesson;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-elios-sky px-3 py-1 text-xs font-bold text-elios-blue">Lesson {lesson.lesson_order}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${lesson.is_published ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {lesson.is_published ? 'Published' : 'Draft'}
            </span>
            {lesson.is_free_preview ? <span className="rounded-full bg-elios-yellow px-3 py-1 text-xs font-bold text-elios-navy">Free preview</span> : null}
          </div>
          <h3 className="mt-3 text-lg font-bold text-elios-navy">{lesson.title}</h3>
          {lesson.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.description}</p> : null}
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
            {lesson.video_url ? <span className="inline-flex items-center gap-1"><PlayCircle className="h-4 w-4" />Video</span> : null}
            {lesson.pdf_url ? <span className="inline-flex items-center gap-1"><FileText className="h-4 w-4" />PDF</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button title={lesson.is_published ? 'Unpublish lesson' : 'Publish lesson'} onClick={onTogglePublished} className="rounded-lg border border-slate-200 p-2 text-elios-blue">
            {lesson.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button title="Edit lesson" onClick={onEdit} className="rounded-lg border border-slate-200 p-2 text-elios-blue"><Pencil className="h-4 w-4" /></button>
          <button title="Delete lesson" onClick={onDelete} className="rounded-lg border border-slate-200 p-2 text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </article>
  );
}
