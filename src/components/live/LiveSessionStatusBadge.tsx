import { LiveSessionStatus } from '../../types/liveSessions';

const labels: Record<LiveSessionStatus, string> = {
  scheduled: 'Planifiée',
  live: 'En direct',
  completed: 'Terminée',
  cancelled: 'Annulée',
  deleted: 'Supprimée',
};
const styles: Record<LiveSessionStatus, string> = {
  scheduled: 'bg-orange-50 text-brand-orange',
  live: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-700',
  deleted: 'bg-red-100 text-red-800',
};

export default function LiveSessionStatusBadge({ status }: { status: LiveSessionStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
}
