import { Link } from 'react-router-dom';
import { formatDate, money } from '../lib/utils';
import { CourseEnrollmentWithCourse } from '../types/database';
import EnrollmentStatusBadge from './EnrollmentStatusBadge';

export default function EnrollmentCard({ enrollment }: { enrollment: CourseEnrollmentWithCourse }) {
  const course = enrollment.courses;
  const price = course ? money(Number(course.price), course.currency ?? 'TND') : '';

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-elios-navy">{course?.title || 'Cours'}</p>
          <p className="mt-1 text-sm text-slate-500">{price} - Envoyee le {formatDate(enrollment.submitted_at ?? enrollment.created_at)}</p>
          {enrollment.rejection_reason ? <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{enrollment.rejection_reason}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EnrollmentStatusBadge status={enrollment.status} />
          {course ? <Link to={`/courses/${course.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue">Voir cours</Link> : null}
          {course && enrollment.status === 'approved' ? <Link to={`/courses/${course.id}/learn`} className="rounded-lg bg-elios-yellow px-3 py-2 text-sm font-bold text-elios-navy">Acceder au cours</Link> : null}
          {course && enrollment.status === 'rejected' ? <Link to={`/courses/${course.id}/enroll`} className="rounded-lg bg-elios-navy px-3 py-2 text-sm font-bold text-white">Renvoyer une preuve</Link> : null}
        </div>
      </div>
    </article>
  );
}
