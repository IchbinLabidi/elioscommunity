import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react';

export type CalendarView = 'month' | 'list';

export default function CalendarToolbar({
  month,
  view,
  onMonthChange,
  onViewChange,
}: {
  month: Date;
  view: CalendarView;
  onMonthChange: (month: Date) => void;
  onViewChange: (view: CalendarView) => void;
}) {
  const move = (offset: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + offset, 1));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Mois précédent" onClick={() => move(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-brand-border text-brand-navy hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => onMonthChange(new Date())} className="rounded-xl border border-brand-border px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-slate-50">Aujourd'hui</button>
        <button type="button" aria-label="Mois suivant" onClick={() => move(1)} className="grid h-10 w-10 place-items-center rounded-xl border border-brand-border text-brand-navy hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <h2 className="order-first w-full text-xl font-black capitalize text-brand-navy sm:order-none sm:w-auto">
        {new Intl.DateTimeFormat('fr-TN', { month: 'long', year: 'numeric' }).format(month)}
      </h2>
      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        <button type="button" aria-label="Vue mois" onClick={() => onViewChange('month')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${view === 'month' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500'}`}><CalendarDays className="h-4 w-4" />Mois</button>
        <button type="button" aria-label="Vue liste" onClick={() => onViewChange('list')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${view === 'list' ? 'bg-white text-brand-navy shadow-sm' : 'text-slate-500'}`}><List className="h-4 w-4" />Liste</button>
      </div>
    </div>
  );
}
