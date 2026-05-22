import { cx } from '../../lib/utils';

export type CourseStatusBadgeTone = 'free' | 'paid' | 'pending' | 'purchased' | 'full-access' | 'rejected' | 'locked' | 'cancelled';

const labels: Record<CourseStatusBadgeTone, string> = {
  free: 'Free',
  paid: 'Paid',
  pending: 'Pending',
  purchased: 'Purchased',
  'full-access': 'Full access',
  rejected: 'Rejected',
  locked: 'Locked',
  cancelled: 'Cancelled',
};

const styles: Record<CourseStatusBadgeTone, string> = {
  free: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  paid: 'bg-slate-100 text-elios-navy ring-slate-200',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  purchased: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'full-access': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-red-50 text-red-700 ring-red-100',
  locked: 'bg-slate-100 text-slate-700 ring-slate-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function CourseStatusBadge({
  tone,
  label,
  className,
}: {
  tone: CourseStatusBadgeTone;
  label?: string;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex rounded-full px-3 py-1 text-xs font-black ring-1', styles[tone], className)}>
      {label ?? labels[tone]}
    </span>
  );
}
