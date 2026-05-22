import { LucideIcon } from 'lucide-react';

export default function DashboardStats({
  stats,
}: {
  stats: Array<{ label: string; value: string | number; icon: LucideIcon }>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-elios-sky text-elios-blue">
              <stat.icon className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-elios-navy">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
