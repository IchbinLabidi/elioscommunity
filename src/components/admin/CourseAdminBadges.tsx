import { Course } from '../../types/database';

const reviewStyles = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  needs_changes: 'bg-orange-50 text-orange-700 ring-orange-100',
  rejected: 'bg-red-50 text-red-700 ring-red-100',
};

const reviewLabels = {
  pending: 'En attente',
  approved: 'Approuvé',
  needs_changes: 'Modifications demandées',
  rejected: 'Refusé',
};

export default function CourseAdminBadges({ course }: { course: Pick<Course, 'is_published' | 'is_hidden' | 'is_featured' | 'is_deleted' | 'admin_review_status'> }) {
  const reviewStatus = course.admin_review_status ?? 'pending';
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${course.is_published ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
        {course.is_published ? 'Publié' : 'Brouillon'}
      </span>
      {course.is_hidden ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 ring-1 ring-red-100">Masqué</span> : null}
      {course.is_deleted ? <span className="rounded-full bg-red-700 px-2.5 py-1 text-xs font-bold text-white">Supprimé</span> : null}
      {course.is_featured ? <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-brand-orange ring-1 ring-orange-100">Mis en avant</span> : null}
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${reviewStyles[reviewStatus]}`}>{reviewLabels[reviewStatus]}</span>
    </div>
  );
}
