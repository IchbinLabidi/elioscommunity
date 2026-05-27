import { TeacherCohostStatus } from '../../types/liveSessions';

const statusLabels: Record<TeacherCohostStatus, string> = {
  not_attempted: 'Co-host non configuré',
  assigned: 'Co-host actif',
  failed: 'Co-host échoué',
  unsupported: 'Co-host non supporté',
};

const styles: Record<TeacherCohostStatus, string> = {
  not_attempted: 'bg-slate-100 text-slate-600',
  assigned: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  unsupported: 'bg-orange-50 text-orange-700',
};

export default function LiveSessionCohostStatus({ status = 'not_attempted' }: { status?: TeacherCohostStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>{statusLabels[status]}</span>;
}
