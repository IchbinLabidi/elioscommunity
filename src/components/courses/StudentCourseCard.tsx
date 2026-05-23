import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/utils';
import { StudentPurchasedCourse } from '../../services/studentCoursesService';
import CourseStatusBadge from './CourseStatusBadge';

export default function StudentCourseCard({ course }: { course: StudentPurchasedCourse }) {
  const lessonsTouched = course.progress.startedLessons;
  return (
    <article className="overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-sm">
      <div className="aspect-[16/8] bg-elios-sky">
        {course.cover_url ? <img src={course.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center p-4 text-center font-black text-elios-blue">{course.subject}</div>}
      </div>
      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CourseStatusBadge tone="purchased" />
            <h2 className="mt-3 text-xl font-black text-elios-navy">{course.title}</h2>
            <p className="mt-1 text-sm font-semibold text-elios-blue">{course.subjects?.name ?? course.subject} - {course.level}</p>
          </div>
          <CourseStatusBadge tone="full-access" />
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
          <img src={course.profiles?.avatar_url || `https://api.dicebear.com/8.x/initials/svg?seed=${course.profiles?.full_name ?? 'sosprof.tn prof'}`} alt="" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <p className="text-sm font-bold text-elios-navy">{course.profiles?.full_name ?? 'sosprof.tn prof'}</p>
            <p className="text-xs text-slate-500">Approved {formatDate(course.enrollment.reviewed_at ?? course.enrollment.created_at)}</p>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div className={`h-2 rounded-full bg-elios-yellow ${lessonsTouched ? 'w-1/3' : 'w-0'}`} />
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-500">{lessonsTouched ? `${lessonsTouched} lesson${lessonsTouched === 1 ? '' : 's'} started` : 'Ready to begin'}</p>
        <Link to={`/courses/${course.id}/learn`} className="mt-5 inline-flex rounded-lg bg-elios-navy px-4 py-3 text-sm font-black text-white">Continue learning</Link>
      </div>
    </article>
  );
}
