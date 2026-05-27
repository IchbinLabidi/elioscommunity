import { useEffect, useState } from 'react';
import LiveSessionsCalendar from '../components/calendar/LiveSessionsCalendar';
import UpcomingLiveSessionsList from '../components/calendar/UpcomingLiveSessionsList';
import StudentCalendarLiveSessionCard from '../components/live-sessions/StudentCalendarLiveSessionCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getStudentCalendarSessions } from '../services/liveSessionsCalendarService';
import { CalendarLiveSessionEvent } from '../types/liveSessions';

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<CalendarLiveSessionEvent[]>([]);
  const [selected, setSelected] = useState<CalendarLiveSessionEvent | null>(null);
  const [month, setMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>(() => window.matchMedia('(max-width: 767px)').matches ? 'list' : 'month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const rows = await getStudentCalendarSessions();
      setEvents(rows);
      setSelected((current) => rows.find((row) => row.id === current?.id) ?? rows[0] ?? null);
    } catch {
      setError('Impossible de charger le calendrier.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  if (loading) return <LoadingSpinner label="Chargement du calendrier" />;
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Sessions live</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Mon calendrier</h1>
        <p className="mt-2 text-slate-600">Retrouvez les sessions live de vos cours achetés.</p>
      </header>
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-3 underline">Réessayer</button></p> : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <LiveSessionsCalendar events={events} month={month} view={view} onMonthChange={setMonth} onViewChange={setView} onSelect={setSelected} emptyText="Aucune session live prévue pour vos cours." />
        <UpcomingLiveSessionsList events={events} onSelect={setSelected} emptyText="Aucune session live prévue pour vos cours." />
      </div>
      {selected ? <StudentCalendarLiveSessionCard event={selected} /> : <p className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-slate-500">Aucune session live prévue pour vos cours.</p>}
    </section>
  );
}
