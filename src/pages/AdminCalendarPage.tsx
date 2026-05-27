import { AlertCircle, CalendarClock, CheckCircle2, CircleDot, PlayCircle, VideoOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LiveSessionsCalendar from '../components/calendar/LiveSessionsCalendar';
import UpcomingLiveSessionsList from '../components/calendar/UpcomingLiveSessionsList';
import AdminStatCard from '../components/admin/AdminStatCard';
import AdminCalendarLiveSessionCard from '../components/live-sessions/AdminCalendarLiveSessionCard';
import ReportLiveSessionModal from '../components/live/ReportLiveSessionModal';
import DeleteLiveSessionModal from '../components/live/DeleteLiveSessionModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActionDialog from '../components/ui/ActionDialog';
import { cancelGoogleMeetLiveSession, deleteGoogleMeetLiveSession, getLiveSessionHistory, reportGoogleMeetLiveSession, retryGoogleMeetCohost } from '../services/liveSessionsService';
import { filterAdminCalendarSessions, getAdminCalendarSessions, getAdminCalendarStats } from '../services/liveSessionsCalendarService';
import { AdminLiveSessionCalendarFilters, CalendarLiveSessionEvent, LiveSessionHistory, LiveSessionStatus } from '../types/liveSessions';
import { useAuth } from '../contexts/AuthContext';
import { draftKey } from '../hooks/useFormDraft';

export default function AdminCalendarPage() {
  const { profile } = useAuth();
  const [allEvents, setAllEvents] = useState<CalendarLiveSessionEvent[]>([]);
  const [selected, setSelected] = useState<CalendarLiveSessionEvent | null>(null);
  const [filters, setFilters] = useState<AdminLiveSessionCalendarFilters>({ status: 'all' });
  const [month, setMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>(() => window.matchMedia('(max-width: 767px)').matches ? 'list' : 'month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reporting, setReporting] = useState<CalendarLiveSessionEvent | null>(null);
  const [savingReport, setSavingReport] = useState(false);
  const [reportError, setReportError] = useState('');
  const [history, setHistory] = useState<LiveSessionHistory[]>([]);
  const [deleting, setDeleting] = useState<CalendarLiveSessionEvent | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cancelling, setCancelling] = useState<CalendarLiveSessionEvent | null>(null);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const rows = await getAdminCalendarSessions(filters);
      setAllEvents(rows);
      setSelected((current) => rows.find((row) => row.id === current?.id) ?? rows[0] ?? null);
    } catch {
      setError('Impossible de charger le calendrier.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [filters.status]);
  const events = useMemo(() => filterAdminCalendarSessions(allEvents, filters), [allEvents, filters]);
  useEffect(() => {
    setSelected((current) => events.find((event) => event.id === current?.id) ?? events[0] ?? null);
  }, [events]);
  useEffect(() => {
    if (!selected) {
      setHistory([]);
      return;
    }
    getLiveSessionHistory(selected.id).then(setHistory).catch(() => setHistory([]));
  }, [selected]);
  const stats = useMemo(() => getAdminCalendarStats(events), [events]);
  const cancel = async (reason: string) => {
    if (!cancelling) return;
    try {
      await cancelGoogleMeetLiveSession(cancelling.id, reason);
      setNotice('Session live annulée.');
      setCancelling(null);
      await load();
    } catch { setError("Impossible d'annuler la session."); }
  };
  const retryCohost = async (event: CalendarLiveSessionEvent) => {
    try {
      await retryGoogleMeetCohost(event.id);
      setNotice('Nouvelle tentative co-host enregistrée.');
      await load();
    } catch { setError('Impossible de réessayer la configuration co-host.'); }
  };
  const postpone = async (input: Parameters<typeof reportGoogleMeetLiveSession>[0]) => {
    setSavingReport(true); setReportError('');
    try {
      await reportGoogleMeetLiveSession(input);
      setNotice('Session reportée avec succès.');
      setReporting(null);
      await load();
      return true;
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : 'Impossible de reporter la session.');
      return false;
    } finally {
      setSavingReport(false);
    }
  };
  const removeSession = async (reason?: string) => {
    if (!deleting) return;
    setDeleteSaving(true); setDeleteError('');
    try {
      await deleteGoogleMeetLiveSession(deleting.id, reason);
      setNotice('Session supprimée.');
      setDeleting(null);
      await load();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : 'Impossible de supprimer la session.');
    } finally { setDeleteSaving(false); }
  };
  if (loading && !allEvents.length) return <LoadingSpinner label="Chargement du calendrier admin" />;
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Administration</p>
        <h1 className="mt-2 text-3xl font-black text-brand-navy">Calendrier des sessions live</h1>
        <p className="mt-2 text-slate-600">Supervisez toutes les sessions Google Meet programmées sur sosprof.tn.</p>
      </header>
      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-3 underline">Réessayer</button></p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Sessions à venir" value={stats.upcoming} icon={CalendarClock} />
        <AdminStatCard label="Sessions aujourd'hui" value={stats.today} icon={CalendarClock} />
        <AdminStatCard label="En direct" value={stats.live} icon={CircleDot} />
        <AdminStatCard label="Sessions annulées" value={stats.cancelled} icon={VideoOff} />
        <AdminStatCard label="Sessions terminées" value={stats.completed} icon={CheckCircle2} />
        <AdminStatCard label="Enregistrements" value={stats.recordings} icon={PlayCircle} />
        <AdminStatCard label="Enregistrements manquants" value={stats.missingRecordings} icon={AlertCircle} />
        <AdminStatCard label="Co-host échoué" value={stats.cohostFailed} icon={AlertCircle} />
      </div>
      <Filters filters={filters} events={allEvents} change={setFilters} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <LiveSessionsCalendar events={events} month={month} view={view} onMonthChange={setMonth} onViewChange={setView} onSelect={setSelected} emptyText="Aucune session live trouvée." />
        <UpcomingLiveSessionsList events={events} onSelect={setSelected} emptyText="Aucune session à venir." />
      </div>
      {selected ? <AdminCalendarLiveSessionCard event={selected} history={history} onCancel={setCancelling} onPostpone={(event) => { setReportError(''); setReporting(event); }} onDelete={(event) => { setDeleteError(''); setDeleting(event); }} onRetryCohost={retryCohost} /> : <p className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-slate-500">Aucune session live trouvée.</p>}
      <ReportLiveSessionModal
        session={reporting ? {
          id: reporting.id,
          title: reporting.title,
          startsAt: reporting.startsAt,
          endsAt: reporting.endsAt,
          timezone: reporting.timezone,
          status: reporting.status,
          isCancelled: reporting.isCancelled,
          courseTitle: reporting.courseTitle,
          teacherName: reporting.teacherName,
          isRecurring: reporting.isRecurring,
        } : null}
        saving={savingReport}
        error={reportError}
        adminContext
        draftKey={draftKey(profile?.id, 'admin:report-live-session')}
        onClose={() => setReporting(null)}
        onSubmit={postpone}
      />
      <DeleteLiveSessionModal
        session={deleting ? {
          title: deleting.title,
          status: deleting.status,
          hasRecording: Boolean(deleting.recordingUrl),
          courseTitle: deleting.courseTitle,
          teacherName: deleting.teacherName,
          isRecurring: deleting.isRecurring,
        } : null}
        saving={deleteSaving}
        error={deleteError}
        adminContext
        onClose={() => setDeleting(null)}
        onConfirm={(reason) => void removeSession(reason)}
      />
      <ActionDialog open={Boolean(cancelling)} title="Annuler cette session live ?" message="Les invités seront informés par Google Calendar." fieldLabel="Motif de l’annulation" confirmLabel="Annuler la session" danger resetKey={cancelling?.id} onClose={() => setCancelling(null)} onConfirm={cancel} />
    </section>
  );
}

function Filters({ filters, events, change }: { filters: AdminLiveSessionCalendarFilters; events: CalendarLiveSessionEvent[]; change: (filters: AdminLiveSessionCalendarFilters) => void }) {
  const teachers = Array.from(new Map(events.map((event) => [event.teacherId, event.teacherName])).entries());
  const courses = Array.from(new Map(events.map((event) => [event.courseId, event.courseTitle])).entries());
  const subjects = Array.from(new Set(events.map((event) => event.subjectName).filter(Boolean))) as string[];
  return (
    <section className="grid gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <input value={filters.query ?? ''} onChange={(event) => change({ ...filters, query: event.target.value })} placeholder="Session, cours ou prof" className="h-12 rounded-xl border border-brand-border px-4 text-sm outline-none focus:border-brand-orange" />
      <select value={filters.status ?? 'all'} onChange={(event) => change({ ...filters, status: event.target.value as LiveSessionStatus | 'all' })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="all">Tous les statuts</option><option value="scheduled">À venir</option><option value="live">En direct</option><option value="completed">Terminées</option><option value="cancelled">Annulées</option><option value="deleted">Supprimées</option>
      </select>
      <select value={filters.period ?? ''} onChange={(event) => change({ ...filters, period: event.target.value as AdminLiveSessionCalendarFilters['period'] })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Toutes les dates</option><option value="upcoming">À venir</option><option value="past">Passées</option>
      </select>
      <select value={filters.hasRecording ?? ''} onChange={(event) => change({ ...filters, hasRecording: event.target.value as AdminLiveSessionCalendarFilters['hasRecording'] })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Tous les replays</option><option value="yes">Avec enregistrement</option><option value="no">Sans enregistrement</option>
      </select>
      <select value={filters.teacherId ?? ''} onChange={(event) => change({ ...filters, teacherId: event.target.value })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Tous les profs</option>{teachers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <select value={filters.courseId ?? ''} onChange={(event) => change({ ...filters, courseId: event.target.value })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Tous les cours</option>{courses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
      </select>
      <select value={filters.subjectName ?? ''} onChange={(event) => change({ ...filters, subjectName: event.target.value })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Toutes les matières</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
      </select>
      <select value={filters.provider ?? ''} onChange={(event) => change({ ...filters, provider: event.target.value as AdminLiveSessionCalendarFilters['provider'] })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Tous les fournisseurs</option><option value="google_meet">Google Meet</option>
      </select>
      <select value={filters.cohostStatus ?? ''} onChange={(event) => change({ ...filters, cohostStatus: event.target.value as AdminLiveSessionCalendarFilters['cohostStatus'] })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Tous les co-hosts</option><option value="assigned">Co-host actif</option><option value="failed">Co-host échoué</option><option value="unsupported">Co-host non supporté</option><option value="not_attempted">Non configuré</option>
      </select>
      <select value={filters.recurring ?? ''} onChange={(event) => change({ ...filters, recurring: event.target.value as AdminLiveSessionCalendarFilters['recurring'] })} className="h-12 rounded-xl border border-brand-border px-4 text-sm text-brand-navy">
        <option value="">Toutes les séries</option>
        <option value="yes">Sessions récurrentes</option>
        <option value="no">Sessions uniques</option>
      </select>
      <label className="text-xs font-bold text-slate-500">À partir du<input type="date" value={filters.dateFrom ?? ''} onChange={(event) => change({ ...filters, dateFrom: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-brand-border px-3 text-sm text-brand-navy" /></label>
      <label className="text-xs font-bold text-slate-500">Jusqu'au<input type="date" value={filters.dateTo ?? ''} onChange={(event) => change({ ...filters, dateTo: event.target.value })} className="mt-1 h-11 w-full rounded-xl border border-brand-border px-3 text-sm text-brand-navy" /></label>
      <label className="flex h-12 items-center gap-2 rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-navy"><input type="checkbox" checked={filters.hideTestSessions ?? false} onChange={(event) => change({ ...filters, hideTestSessions: event.target.checked })} />Masquer les sessions test</label>
      <button type="button" onClick={() => change({ status: 'all' })} className="h-12 rounded-xl border border-brand-border px-4 text-sm font-bold text-brand-navy hover:bg-slate-50">Réinitialiser</button>
    </section>
  );
}
