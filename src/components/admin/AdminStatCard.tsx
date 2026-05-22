import { LucideIcon } from 'lucide-react';

export default function AdminStatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-elios-navy">{value}</p>
        </div>
        <span className="rounded-lg bg-elios-sky p-3 text-elios-blue"><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}
