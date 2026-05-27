import { CalendarPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveSessionsCalendar from '../components/calendar/LiveSessionsCalendar';
import UpcomingLiveSessionsList from '../components/calendar/UpcomingLiveSessionsList';
import TeacherCalendarLiveSessionCard from '../components/live-sessions/TeacherCalendarLiveSessionCard';
import ReportLiveSessionModal from '../components/live/ReportLiveSessionModal';
import DeleteLiveSessionModal from '../components/live/DeleteLiveSessionModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActionDialog from '../components/ui/ActionDialog';
import { useAuth } from '../contexts/AuthContext';
import { draftKey } from '../hooks/useFormDraft';
import { addLiveSessionRecording, cancelGoogleMeetLiveSession, deleteGoogleMeetLiveSession, reportGoogleMeetLiveSession } from '../services/liveSessionsService';
import { getTeacherCalendarSessions } from '../services/liveSessionsCalendarService';
import { CalendarLiveSessionEvent } from '../types/liveSessions';

export default function TeacherCalendarPage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<CalendarLiveSessionEvent[]>([]);
  const [selected, setSelected] = useState<CalendarLiveSessionEvent | null>(null);
  const [month, setMonth] = useState(new Date());
  const [view, setView] = useState<'month' | 'list'>(() => window.matchMedia('(max-width: 767px)').matches ? 'list' : 'month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reporting, setReporting] = useState<CalendarLiveSessionEvent | null>(null);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState('');
  const [deleting, setDeleting] = useState<CalendarLiveSessionEvent | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cancelling, setCancelling] = useState<CalendarLiveSessionEvent | null>(null);
  const [addingRecording, setAddingRecording] = useState<CalendarLiveSessionEvent | null>(null);

  const load = async () => {
    if (!profile) return;
    setLoading(true); setError('');
    try {
      const rows = await getTeacherCalendarSessions(profile.id);
      setEvents(rows);
      setSelected((current) => rows.find((row) => row.id === current?.id) ?? rows[0] ?? null);
    } catch {
      setError('Impossible de charger le calendrier.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [profile?.id]);

  const cancel = async (reason: string) => {
    if (!cancelling) return;
    try {
      await cancelGoogleMeetLiveSession(cancelling.id, reason);
      setNotice('Session live annulée.');
      setCancelling(null);
      await load();
    } catch { setError("Impossible d'annuler la session."); }
  };
  const recording = async (url: string) => {
    if (!addingRecording) return;
    if (!url) return;
    try {
      await addLiveSessionRecording(addingRecording.id, url, true);
      setNotice('Enregistrement disponible pour les étudiants inscrits.');
      setAddingRecording(null);
      await load();
    } catch { setError("Impossible d'ajouter l'enregistrement."); }
  };
  const postpone = async (input: Parameters<typeof reportGoogleMeetLiveSession>[0]) => {
    setReportSaving(true); setReportError('');
    try {
      await reportGoogleMeetLiveSession(input);
      setNotice('Session reportée avec succès.');
      setReporting(null);
      await load();
      return true;
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : 'Impossible de reporter la session.');
      return false;
    } finally { setReportSaving(false); }
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

  if (loading) return <LoadingSpinner label="Chargement du calendrier" />;
  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-orange">Sessions live</p>
          <h1 className="mt-2 text-3xl font-black text-brand-navy">Calendrier des sessions live</h1>
          <p className="mt-2 text-slate-600">Programmez et gérez vos sessions Google Meet pour vos cours.</p>
        </div>
        <Link to="/teacher/courses" className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white"><CalendarPlus className="h-4 w-4" />Programmer une session</Link>
      </header>
      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}<button type="button" onClick={() => void load()} className="ml-3 underline">Réessayer</button></p> : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <LiveSessionsCalendar events={events} month={month} view={view} onMonthChange={setMonth} onViewChange={setView} onSelect={setSelected} emptyText="Aucune session live programmée." />
        <UpcomingLiveSessionsList events={events} onSelect={setSelected} emptyText="Aucune session à venir." />
      </div>
      {selected ? <TeacherCalendarLiveSessionCard event={selected} onCancel={setCancelling} onPostpone={(event) => { setReportError(''); setReporting(event); }} onDelete={(event) => { setDeleteError(''); setDeleting(event); }} onRecording={setAddingRecording} /> : <Empty text="Aucune session live programmée." />}
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
          isRecurring: reporting.isRecurring,
        } : null}
        saving={reportSaving}
        error={reportError}
        draftKey={draftKey(profile?.id, 'teacher:calendar-report-session')}
        onClose={() => setReporting(null)}
        onSubmit={postpone}
      />
      <DeleteLiveSessionModal
        session={deleting ? {
          title: deleting.title,
          status: deleting.status,
          hasRecording: Boolean(deleting.recordingUrl),
          courseTitle: deleting.courseTitle,
          isRecurring: deleting.isRecurring,
        } : null}
        saving={deleteSaving}
        error={deleteError}
        onClose={() => setDeleting(null)}
        onConfirm={(reason) => void removeSession(reason)}
      />
      <ActionDialog open={Boolean(cancelling)} title="Annuler cette session live ?" message="Les étudiants inscrits verront que cette session est annulée." fieldLabel="Motif de l’annulation" confirmLabel="Annuler la session" danger resetKey={cancelling?.id} onClose={() => setCancelling(null)} onConfirm={cancel} />
      <ActionDialog open={Boolean(addingRecording)} title="Ajouter l’enregistrement" message={addingRecording?.title} fieldLabel="Lien de l’enregistrement" placeholder="https://..." required confirmLabel="Enregistrer" initialValue={addingRecording?.recordingUrl ?? ''} resetKey={addingRecording?.id} onClose={() => setAddingRecording(null)} onConfirm={recording} />
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center text-sm text-slate-500">{text}</p>;
}
