import { BookOpen, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../lib/utils';
import { Course, CourseWithTeacher, TeacherPublicStats, TeacherStats } from '../types/database';

function firstStats(stats?: TeacherPublicStats[] | TeacherPublicStats | TeacherStats[] | TeacherStats | null) {
  return Array.isArray(stats) ? stats[0] : stats;
}

function ratingAverage(stats?: TeacherPublicStats | TeacherStats | null) {
  if (!stats) return 0;
  return 'average_rating' in stats ? Number(stats.average_rating) : Number(stats.rating_average);
}

export default function CourseCard({
  course,
  actions,
}: {
  course: Course | CourseWithTeacher;
  actions?: React.ReactNode;
}) {
  const teacher = 'profiles' in course ? course.profiles : null;
  const stats = firstStats(teacher?.teacher_public_stats ?? teacher?.teacher_stats);
  const price = Number(course.price) === 0 ? 'Free' : money(Number(course.price), course.currency ?? 'TND');

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="aspect-[16/9] bg-elios-sky">
        {course.cover_url ? (
          <img src={course.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center font-bold text-elios-blue">{course.subject}</div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-elios-blue">{course.level}</p>
            <h3 className="mt-1 text-lg font-bold text-elios-navy">{course.title}</h3>
          </div>
          <span className="rounded-lg bg-elios-yellow px-3 py-1 text-sm font-bold text-elios-navy">{price}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-elios-sky px-3 py-1 text-elios-blue">{course.subject}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">{course.format}</span>
          {typeof course.lesson_count === 'number' ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1"><BookOpen className="h-3 w-3" />{course.lesson_count} chapters</span> : null}
          {course.duration ? <span className="rounded-full bg-slate-100 px-3 py-1">{course.duration}</span> : null}
          {course.is_published === false ? <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">Unpublished</span> : null}
        </div>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
        {teacher ? (
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
            <img src={teacher.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${teacher.full_name}`} alt="" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <p className="text-sm font-bold text-elios-navy">{teacher.full_name}</p>
              <p className="text-xs text-slate-500">{ratingAverage(stats).toFixed(1)} rating</p>
            </div>
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-3">
          <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-elios-blue">
            View course <ExternalLink className="h-4 w-4" />
          </Link>
          {actions}
        </div>
      </div>
    </article>
  );
}
