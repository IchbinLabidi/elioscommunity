import { CalendarClock, CalendarPlus, CircleDot, PlayCircle, Search, Users, Video } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getTeacherEnrollmentRequests } from '../../services/enrollmentsService';
import { addLiveSessionRecording, cancelGoogleMeetLiveSession, createGoogleMeetLiveSession, deleteGoogleMeetLiveSession, getTeacherCourseLiveSessions, reportGoogleMeetLiveSession, retryGoogleMeetCohost, updateGoogleMeetLiveSession } from '../../services/liveSessionsService';
import { Course } from '../../types/database';
import { LiveSession, UpdateGoogleMeetLiveSessionInput } from '../../types/liveSessions';
import useFormDraft, { draftKey } from '../../hooks/useFormDraft';
import { generateLiveSessionOccurrences } from '../../utils/liveSessionRecurrence';
import { getLiveSessionDisplayStatus } from '../../utils/liveSessionStatus';
import TeacherLiveSessionCard from '../live-sessions/TeacherLiveSessionCard';
import LiveSessionFormModal, { LiveSessionFormValue } from './LiveSessionFormModal';
import LiveSessionRecordingModal from './LiveSessionRecordingModal';
import ReportLiveSessionModal from './ReportLiveSessionModal';
import DeleteLiveSessionModal from './DeleteLiveSessionModal';

type Filter = 'all' | 'scheduled' | 'live' | 'completed' | 'cancelled' | 'recordings';

const emptyForm: LiveSessionFormValue = {
  title: '',
  description: '',
  startsDate: '',
  startsTime: '',
  durationHours: 1,
  durationMinutes: 0,
  timezone: 'Africa/Tunis',
  recurrence: { enabled: false, frequency: 'weekly', endDate: '', selectedDays: {} },
};

function dateTimeParts(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - offset).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

function sessionEndFromDuration(startsAt: string, hours: number, minutes: number) {
  const durationMinutes = (hours * 60) + minutes;
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error('La durée de chaque séance doit être supérieure à zéro.');
  }
  return {
    durationMinutes,
    endsAt: new Date(new Date(startsAt).getTime() + (durationMinutes * 60 * 1000)).toISOString(),
  };
}

export default function TeacherLiveSessionsManager({ course }: { course: Course }) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [approvedStudentsCount, setApprovedStudentsCount] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordingSession, setRecordingSession] = useState<LiveSession | null>(null);
  const [reportingSession, setReportingSession] = useState<LiveSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<LiveSession | null>(null);
  const [cancellingSession, setCancellingSession] = useState<LiveSession | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [reactivationUpdate, setReactivationUpdate] = useState<UpdateGoogleMeetLiveSessionInput | null>(null);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const liveSessionDraft = useFormDraft({
    key: draftKey(course.teacher_id, editingId ? `teacher:edit-live-session:${editingId}` : `teacher:create-live-session:${course.id}`),
    values: form,
    onRestore: setForm,
  });

  const editingSession = sessions.find((session) => session.id === editingId) ?? null;
  const editingCancelled = editingSession ? getLiveSessionDisplayStatus(editingSession) === 'cancelled' : false;
  const nextSession = sessions.find((session) => getLiveSessionDisplayStatus(session) === 'live')
    ?? sessions.find((session) => getLiveSessionDisplayStatus(session) === 'scheduled');

  const stats = useMemo(() => ({
    scheduled: sessions.filter((session) => getLiveSessionDisplayStatus(session) === 'scheduled').length,
    live: sessions.filter((session) => getLiveSessionDisplayStatus(session) === 'live').length,
    completed: sessions.filter((session) => getLiveSessionDisplayStatus(session) === 'completed').length,
    recordingMissing: sessions.filter((session) => getLiveSessionDisplayStatus(session) === 'completed' && !session.recording_url).length,
    cohostFailed: sessions.filter((session) => session.teacher_cohost_status === 'failed').length,
  }), [sessions]);

  const displayedSessions = useMemo(() => sessions.filter((session) => {
    const status = getLiveSessionDisplayStatus(session);
    const matchesFilter = filter === 'all'
      || (filter === 'recordings' ? status === 'completed' && !session.recording_url : status === filter);
    const query = search.trim().toLowerCase();
    return matchesFilter && (!query || `${session.title} ${session.description ?? ''}`.toLowerCase().includes(query));
  }), [filter, search, sessions]);

  const load = async () => {
    try {
      const [rows, enrollments] = await Promise.all([
        getTeacherCourseLiveSessions(course.id),
        getTeacherEnrollmentRequests().catch(() => []),
      ]);
      setSessions(rows);
      setApprovedStudentsCount(enrollments.filter((enrollment) => enrollment.course_id === course.id && enrollment.status === 'approved').length);
      return rows;
    } catch {
      setError('Impossible de charger les sessions live.');
      return [];
    }
  };

  useEffect(() => { void load(); }, [course.id]);

  function openCreate() {
    if (!liveSessionDraft.hasDraft) setForm(emptyForm);
    setEditingId(null);
    setModalError('');
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingId(null);
    setModalError('');
    setReactivationUpdate(null);
  }

  const saveEdit = async (input: UpdateGoogleMeetLiveSessionInput, reactivate = false) => {
    if (!editingId) return;
    setSaving(true);
    setModalError('');
    setNotice('');
    try {
      const updated = await updateGoogleMeetLiveSession(editingId, { ...input, reactivate });
      if (reactivate && (updated.is_cancelled || updated.status === 'cancelled')) {
        throw new Error('La session est toujours annulée sur le serveur. Veuillez réessayer après la mise à jour du service.');
      }
      const refreshedSessions = await load();
      const refreshed = refreshedSessions.find((session) => session.id === updated.id);
      if (reactivate && (!refreshed || refreshed.is_cancelled || refreshed.status === 'cancelled')) {
        throw new Error('La session reste annulée après actualisation. Veuillez réessayer.');
      }
      setNotice(reactivate ? 'Session live reprogrammée.' : 'Session live mise à jour.');
      liveSessionDraft.clearDraft();
      setFormOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      setReactivationUpdate(null);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Impossible de mettre à jour la session.');
    } finally {
      setSaving(false);
    }
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setModalError('');
    setNotice('');
    try {
      const recurring = form.recurrence.enabled && !editingId;
      const startsAt = recurring ? toIso(form.startsDate, '00:00') : toIso(form.startsDate, form.startsTime);
      const { durationMinutes, endsAt } = sessionEndFromDuration(startsAt, form.durationHours, form.durationMinutes);
      if (editingId) {
        const update = { title: form.title, description: form.description, startsAt, endsAt, timezone: form.timezone };
        if (editingCancelled) {
          setReactivationUpdate(update);
          return;
        }
        await saveEdit(update);
        return;
      }
      setSaving(true);
      const occurrences = generateLiveSessionOccurrences({
        startsAt, durationMinutes, timezone: form.timezone, recurrence: form.recurrence,
      });
      const response = await createGoogleMeetLiveSession({
        courseId: course.id, title: form.title, description: form.description, startsAt, endsAt, timezone: form.timezone,
        ...(recurring ? { recurrence: { enabled: true, type: form.recurrence.frequency, endDate: form.recurrence.endDate, durationMinutes, selectedDays: form.recurrence.selectedDays, occurrences } } : {}),
      });
      const created = 'sessions' in response ? response.sessions[0]! : response;
      setNotice(created.teacher_cohost_status === 'failed' || created.teacher_cohost_status === 'unsupported'
        ? 'Session programmée. Le Meet est créé, mais le co-host n\'a pas pu être configuré automatiquement.'
        : 'Session programmée avec succès.');
      if ('sessions' in response) {
        const hasCohostWarning = response.sessions.some((session) => session.teacher_cohost_status === 'failed' || session.teacher_cohost_status === 'unsupported');
        const result = response.failedCount ? `${response.createdCount} sessions créées, ${response.failedCount} échec(s).` : `${response.createdCount} sessions programmées avec succès.`;
        setNotice(hasCohostWarning ? `${result} Certaines sessions ont été créées sans co-host automatique.` : result);
      }
      liveSessionDraft.clearDraft();
      setFormOpen(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Impossible de créer la session Google Meet.');
    } finally {
      if (!editingId) setSaving(false);
    }
  }

  function edit(session: LiveSession) {
    const starts = dateTimeParts(session.starts_at);
    const durationMinutes = Math.max(1, Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / (60 * 1000)));
    setEditingId(session.id);
    setForm({
      title: session.title,
      description: session.description ?? '',
      startsDate: starts.date,
      startsTime: starts.time,
      durationHours: Math.floor(durationMinutes / 60),
      durationMinutes: durationMinutes % 60,
      timezone: session.timezone,
      recurrence: { enabled: false, frequency: 'weekly', endDate: '', selectedDays: {} },
    });
    setModalError('');
    setNotice('');
    setFormOpen(true);
  }

  async function cancel() {
    if (!cancellingSession) return;
    setError('');
    setSaving(true);
    try {
      await cancelGoogleMeetLiveSession(cancellingSession.id, cancelReason.trim());
      setNotice('Session live annulée.');
      setCancellingSession(null);
      setCancelReason('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'annuler la session.");
    } finally {
      setSaving(false);
    }
  }

  async function saveRecording(url: string) {
    if (!recordingSession || !url) return false;
    setSaving(true);
    setRecordingError('');
    try {
      await addLiveSessionRecording(recordingSession.id, url, true);
      setNotice('Enregistrement disponible pour les étudiants inscrits.');
      setRecordingSession(null);
      await load();
      return true;
    } catch (err) {
      setRecordingError(err instanceof Error ? err.message : "Impossible d'ajouter l'enregistrement.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function retryCohost(session: LiveSession) {
    setError('');
    try {
      const updated = await retryGoogleMeetCohost(session.id);
      setNotice(updated.teacher_cohost_status === 'assigned' ? 'Vous êtes configuré comme co-host.' : "Le Meet existe, mais le rôle co-host n'a pas pu être appliqué automatiquement.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de réessayer la configuration co-host.');
    }
  }

  async function postpone(input: Parameters<typeof reportGoogleMeetLiveSession>[0]) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await reportGoogleMeetLiveSession(input);
      setNotice('Session reportée avec succès.');
      setReportingSession(null);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de reporter la session.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeSession(reason?: string) {
    if (!deletingSession) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await deleteGoogleMeetLiveSession(deletingSession.id, reason);
      setNotice('Session supprimée.');
      setDeletingSession(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de supprimer la session.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-brand-orange">{course.subject}</p>
            <h2 className="mt-2 text-2xl font-black text-brand-navy">{course.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{approvedStudentsCount} étudiant(s) avec accès approuvé</p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <NextSession session={nextSession} />
            <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white shadow-sm">
              <CalendarPlus className="h-4 w-4" />Programmer une session
            </button>
          </div>
        </div>
      </section>

      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <TeacherStat label="Sessions à venir" value={stats.scheduled} icon={CalendarClock} />
          <TeacherStat label="En direct" value={stats.live} icon={CircleDot} />
          <TeacherStat label="Terminées" value={stats.completed} icon={Video} />
          <TeacherStat label="Enregistrements à ajouter" value={stats.recordingMissing} icon={PlayCircle} />
          <TeacherStat label="Co-host échoué" value={stats.cohostFailed} icon={Users} />
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une session..." className="h-11 w-full rounded-xl border border-brand-border pl-10 pr-4 text-sm outline-none focus:border-brand-orange" />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {([['all', 'Toutes'], ['scheduled', 'À venir'], ['live', 'En direct'], ['completed', 'Terminées'], ['cancelled', 'Annulées'], ['recordings', 'Enregistrements']] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setFilter(value)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold ${filter === value ? 'bg-brand-navy text-white' : 'bg-slate-50 text-brand-navy hover:bg-slate-100'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        {displayedSessions.length ? (
          <div className="space-y-3">
            {displayedSessions.map((session) => (
              <TeacherLiveSessionCard key={session.id} session={session} approvedStudentsCount={approvedStudentsCount} onEdit={edit} onPostpone={(item) => { setError(''); setReportingSession(item); }} onDelete={(item) => { setError(''); setDeletingSession(item); }} onCancel={(item) => { setError(''); setCancellingSession(item); setCancelReason(''); }} onRecording={setRecordingSession} onRetryCohost={retryCohost} />
            ))}
          </div>
        ) : sessions.length ? (
          <p className="rounded-2xl border border-dashed border-brand-border bg-white p-8 text-center text-slate-500">Aucune session ne correspond à ce filtre.</p>
        ) : (
          <EmptySessions onCreate={openCreate} />
        )}
      </section>

      <LiveSessionFormModal
        open={formOpen}
        editing={Boolean(editingId)}
        cancelled={editingCancelled}
        value={form}
        saving={saving}
        error={modalError}
        draftStatus={liveSessionDraft.status}
        draftSavedAt={liveSessionDraft.lastSavedAt}
        draftRestored={liveSessionDraft.restored}
        onDismissDraftRestore={liveSessionDraft.dismissRestoreBanner}
        onDiscardDraft={() => { liveSessionDraft.discardDraft(); setForm(emptyForm); }}
        onChange={setForm}
        onClose={closeForm}
        onSubmit={submit}
      />
      <LiveSessionRecordingModal session={recordingSession} saving={saving} error={recordingError} draftKey={draftKey(course.teacher_id, 'teacher:recording')} onClose={() => setRecordingSession(null)} onSave={saveRecording} />
      <ReportLiveSessionModal
        session={reportingSession ? {
          id: reportingSession.id,
          title: reportingSession.title,
          startsAt: reportingSession.starts_at,
          endsAt: reportingSession.ends_at,
          timezone: reportingSession.timezone,
          status: getLiveSessionDisplayStatus(reportingSession),
          isCancelled: reportingSession.is_cancelled,
          courseTitle: course.title,
          isRecurring: reportingSession.is_recurring,
        } : null}
        saving={saving}
        error={error}
        draftKey={draftKey(course.teacher_id, 'teacher:report-session')}
        onClose={() => setReportingSession(null)}
        onSubmit={postpone}
      />
      <DeleteLiveSessionModal
        session={deletingSession ? {
          title: deletingSession.title,
          status: getLiveSessionDisplayStatus(deletingSession),
          hasRecording: Boolean(deletingSession.recording_url),
          courseTitle: course.title,
          isRecurring: deletingSession.is_recurring,
        } : null}
        saving={saving}
        error={error}
        onClose={() => setDeletingSession(null)}
        onConfirm={(reason) => void removeSession(reason)}
      />
      {cancellingSession ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="cancel-session-title" className="w-full max-w-lg rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
            <h2 id="cancel-session-title" className="text-2xl font-black text-brand-navy">Annuler cette session ?</h2>
            <p className="mt-3 text-sm text-slate-600">{cancellingSession.title}</p>
            {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
            <label className="mt-5 block text-sm font-bold text-brand-navy">Motif d'annulation
              <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-brand-orange" />
            </label>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={() => setCancellingSession(null)} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60">Fermer</button>
              <button type="button" disabled={saving} onClick={() => void cancel()} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Annulation...' : 'Annuler la session'}</button>
            </div>
          </section>
        </div>
      ) : null}
      {reactivationUpdate ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="reactivate-session-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="reactivate-session-title" className="text-2xl font-black text-brand-navy">Réactiver cette session ?</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">Cette session est actuellement annulée. En enregistrant les modifications, elle sera reprogrammée et les étudiants inscrits seront informés.</p>
            {modalError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{modalError}</p> : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" disabled={saving} onClick={() => void saveEdit(reactivationUpdate, false)} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60">Garder annulée</button>
              <button type="button" disabled={saving} onClick={() => void saveEdit(reactivationUpdate, true)} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-60">Réactiver et enregistrer</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function NextSession({ session }: { session?: LiveSession }) {
  if (!session) return <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">Aucune session programmée</p>;
  const status = getLiveSessionDisplayStatus(session);
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold text-slate-500">{status === 'live' ? 'En direct maintenant' : 'Prochaine session'}</p>
      <p className="mt-1 text-sm font-bold text-brand-navy">{new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: session.timezone }).format(new Date(session.starts_at))}</p>
      {session.meeting_url ? <a href={session.meeting_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-brand-orange">Rejoindre</a> : null}
    </div>
  );
}

function EmptySessions({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border bg-white p-10 text-center">
      <CalendarClock className="mx-auto h-10 w-10 text-brand-orange" />
      <h2 className="mt-4 text-lg font-black text-brand-navy">Aucune session live programmée</h2>
      <p className="mt-2 text-sm text-slate-500">Programmez votre première session Google Meet pour ce cours.</p>
      <button type="button" onClick={onCreate} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white"><CalendarPlus className="h-4 w-4" />Programmer une session</button>
    </div>
  );
}

function TeacherStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof CalendarClock }) {
  return (
    <div className="flex min-w-0 items-center justify-between rounded-2xl border border-brand-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-brand-navy">{value}</p></div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-brand-orange"><Icon className="h-5 w-5" /></span>
    </div>
  );
}
