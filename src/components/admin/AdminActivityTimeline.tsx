import { BookCheck, CircleAlert, GraduationCap, MessageSquare, Receipt, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../lib/utils';
import { ActivityItem } from '../../services/adminDashboardService';

const icons = {
  question: MessageSquare,
  answer: BookCheck,
  enrollment: Receipt,
  report: CircleAlert,
  teacher: GraduationCap,
  student: UserRound,
};

export default function AdminActivityTimeline({ items }: { items: ActivityItem[] }) {
  if (!items.length) return <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">Aucune activité récente pour cette période.</p>;
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = icons[item.kind];
        return (
          <Link key={item.id} to={item.to} className="flex gap-3 rounded-xl p-3 transition hover:bg-slate-50">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand-orange"><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-elios-navy">{item.title}</p>
              <p className="line-clamp-1 text-sm text-slate-600">{item.description}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
