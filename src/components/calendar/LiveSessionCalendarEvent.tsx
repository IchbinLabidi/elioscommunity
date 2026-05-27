import { CalendarLiveSessionEvent } from '../../types/liveSessions';

const classes = {
  scheduled: 'border-blue-100 bg-blue-50 text-brand-navy',
  live: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  completed: 'border-slate-200 bg-slate-100 text-slate-600',
  cancelled: 'border-red-100 bg-red-50 text-red-700',
  deleted: 'border-red-200 bg-red-100 text-red-800',
};

export default function LiveSessionCalendarEvent({ event, onSelect }: { event: CalendarLiveSessionEvent; onSelect: (event: CalendarLiveSessionEvent) => void }) {
  const time = new Intl.DateTimeFormat('fr-TN', { hour: '2-digit', minute: '2-digit', timeZone: event.timezone }).format(new Date(event.startsAt));
  return (
    <button type="button" onClick={() => onSelect(event)} title={`${time} - ${event.title}`} className={`block w-full truncate rounded-lg border px-2 py-1 text-left text-[11px] font-bold ${classes[event.status]}`}>
      {time} {event.title}
    </button>
  );
}
