import { EnrollmentStatus } from '../types/database';

const styles: Record<EnrollmentStatus, string> = {
  pending: 'bg-yellow-50 text-elios-navy ring-elios-yellow',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  rejected: 'bg-red-50 text-red-700 ring-red-100',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
};
const labels: Record<EnrollmentStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvee',
  rejected: 'Refusee',
  cancelled: 'Annulee',
};

export default function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
