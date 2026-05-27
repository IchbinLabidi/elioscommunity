import { CalendarClock } from 'lucide-react';
import { CalendarLiveSessionEvent } from '../../types/liveSessions';
import LiveSessionStatusBadge from '../live/LiveSessionStatusBadge';

export default function UpcomingLiveSessionsList({ events, onSelect, emptyText }: { events: CalendarLiveSessionEvent[]; onSelect: (event: CalendarLiveSessionEvent) => void; emptyText: string }) {
  const upcoming = events.filter((event) => event.status === 'scheduled' || event.status === 'live').slice(0, 6);
  return (
    <aside className="space-y-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-black text-brand-navy"><CalendarClock className="h-5 w-5 text-brand-orange" />À venir</h2>
      {upcoming.length ? upcoming.map((event) => (
        <button key={event.id} type="button" onClick={() => onSelect(event)} className="block w-full rounded-xl border border-slate-100 p-3 text-left hover:border-brand-orange/30">
          <LiveSessionStatusBadge status={event.status} />
          <p className="mt-2 text-sm font-bold text-brand-navy">{event.title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{event.courseTitle}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.startsAt))}</p>
        </button>
      )) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{emptyText}</p>}
    </aside>
  );
}
