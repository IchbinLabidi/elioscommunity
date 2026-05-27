import { LucideIcon } from 'lucide-react';

export default function AdminStatCard({
  label,
  value,
  icon: Icon,
  hint,
  compactValue = false,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  compactValue?: boolean;
}) {
  return (
    <div className="h-full min-w-0 rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex min-h-[82px] items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className={`mt-3 break-words font-black leading-tight text-elios-navy ${compactValue ? 'text-2xl' : 'text-3xl'}`} title={String(value)}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
        </div>
        <span className="shrink-0 rounded-xl bg-orange-50 p-3 text-brand-orange"><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}
