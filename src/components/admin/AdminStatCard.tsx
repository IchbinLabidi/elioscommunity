import { LucideIcon } from 'lucide-react';

export default function AdminStatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-elios-navy">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <span className="rounded-xl bg-orange-50 p-3 text-brand-orange"><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}
