import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminQuickActionCard({
  to,
  title,
  description,
  icon: Icon,
  count,
}: {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  count?: number;
}) {
  return (
    <Link to={to} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-brand-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-brand-orange"><Icon className="h-5 w-5" /></span>
        {count !== undefined ? <span className="rounded-full bg-elios-navy px-2.5 py-1 text-xs font-black text-white">{count}</span> : null}
      </div>
      <div className="mt-4">
        <p className="font-bold text-elios-navy group-hover:text-brand-navy">{title}</p>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
