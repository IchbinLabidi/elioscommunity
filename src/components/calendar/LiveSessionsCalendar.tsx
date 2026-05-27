import { CalendarLiveSessionEvent } from '../../types/liveSessions';
import CalendarToolbar, { CalendarView } from './CalendarToolbar';
import LiveSessionCalendarEvent from './LiveSessionCalendarEvent';

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const cells: Date[] = [];
  for (let day = -offset + 1; cells.length < 42; day += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  return cells;
}

export default function LiveSessionsCalendar({
  events,
  month,
  view,
  onMonthChange,
  onViewChange,
  onSelect,
  emptyText,
}: {
  events: CalendarLiveSessionEvent[];
  month: Date;
  view: CalendarView;
  onMonthChange: (month: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onSelect: (event: CalendarLiveSessionEvent) => void;
  emptyText: string;
}) {
  const byDay = events.reduce((entries, event) => {
    const key = dayKey(new Date(event.startsAt));
    entries.set(key, [...(entries.get(key) ?? []), event]);
    return entries;
  }, new Map<string, CalendarLiveSessionEvent[]>());
  const visibleEvents = events.filter((event) => {
    const date = new Date(event.startsAt);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  });

  return (
    <section className="space-y-4">
      <CalendarToolbar month={month} view={view} onMonthChange={onMonthChange} onViewChange={onViewChange} />
      {view === 'list' ? (
        visibleEvents.length ? (
          <div className="space-y-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
            {visibleEvents.map((event) => (
              <button key={event.id} type="button" onClick={() => onSelect(event)} className="flex w-full flex-col gap-2 rounded-xl border border-slate-100 p-4 text-left transition hover:border-brand-orange/40 hover:bg-orange-50/30 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block text-sm font-black text-brand-navy">{event.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">{event.courseTitle}</span>
                </span>
                <span className="text-sm font-semibold text-slate-600">{new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.startsAt))}</span>
              </button>
            ))}
          </div>
        ) : <Empty text={emptyText} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {weekDays.map((day) => <span key={day} className="py-3 text-center text-xs font-bold uppercase text-slate-400">{day}</span>)}
          </div>
          <div className="grid grid-cols-7">
            {monthCells(month).map((date) => {
              const inMonth = date.getMonth() === month.getMonth();
              const currentDayEvents = byDay.get(dayKey(date)) ?? [];
              const today = dayKey(date) === dayKey(new Date());
              return (
                <div key={dayKey(date)} className={`min-h-24 border-b border-r border-slate-100 p-1.5 sm:min-h-32 sm:p-2 ${inMonth ? 'bg-white' : 'bg-slate-50/70'}`}>
                  <span className={`mb-1 grid h-7 w-7 place-items-center text-xs font-bold ${today ? 'rounded-full bg-brand-orange text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}>{date.getDate()}</span>
                  <div className="space-y-1">
                    {currentDayEvents.slice(0, 2).map((event) => <LiveSessionCalendarEvent key={event.id} event={event} onSelect={onSelect} />)}
                    {currentDayEvents.length > 2 ? <button type="button" onClick={() => onSelect(currentDayEvents[2])} className="block text-[11px] font-bold text-brand-orange">+ {currentDayEvents.length - 2} autre(s)</button> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center text-sm font-semibold text-slate-500">{text}</p>;
}
