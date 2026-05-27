import { CalendarClock, Info, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import useFormDraft from '../../hooks/useFormDraft';
import { LiveSessionStatus, ReportGoogleMeetLiveSessionInput } from '../../types/liveSessions';

type ReportableSession = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: LiveSessionStatus;
  isCancelled: boolean;
  courseTitle?: string;
  teacherName?: string;
  isRecurring?: boolean;
};

type Props = {
  session: ReportableSession | null;
  saving: boolean;
  error: string;
  adminContext?: boolean;
  draftKey: string;
  onClose: () => void;
  onSubmit: (input: ReportGoogleMeetLiveSessionInput) => Promise<boolean>;
};

function dateTimeParts(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

function toIso(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

export default function ReportLiveSessionModal({ session, saving, error, adminContext = false, draftKey, onClose, onSubmit }: Props) {
  const [startsDate, setStartsDate] = useState('');
  const [startsTime, setStartsTime] = useState('');
  const [endsDate, setEndsDate] = useState('');
  const [endsTime, setEndsTime] = useState('');
  const [timezone, setTimezone] = useState('Africa/Tunis');
  const [reason, setReason] = useState('');
  const [reactivate, setReactivate] = useState(false);
  const [confirmCompleted, setConfirmCompleted] = useState(false);
  const [validation, setValidation] = useState('');
  const restoredRef = useRef(false);
  const draft = useFormDraft({
    key: `${draftKey}:${session?.id ?? 'none'}`,
    values: { startsDate, startsTime, endsDate, endsTime, timezone, reason, reactivate, confirmCompleted },
    onRestore: (values) => {
      restoredRef.current = true;
      setStartsDate(values.startsDate);
      setStartsTime(values.startsTime);
      setEndsDate(values.endsDate);
      setEndsTime(values.endsTime);
      setTimezone(values.timezone);
      setReason(values.reason);
      setReactivate(values.reactivate);
      setConfirmCompleted(values.confirmCompleted);
    },
    enabled: Boolean(session),
  });

  useEffect(() => {
    if (!session) return;
    if (restoredRef.current) {
      restoredRef.current = false;
      return;
    }
    const starts = dateTimeParts(session.startsAt);
    const ends = dateTimeParts(session.endsAt);
    setStartsDate(starts.date);
    setStartsTime(starts.time);
    setEndsDate(ends.date);
    setEndsTime(ends.time);
    setTimezone(session.timezone || 'Africa/Tunis');
    setReason('');
    setReactivate(false);
    setConfirmCompleted(false);
    setValidation('');
  }, [session]);

  if (!session) return null;
  const activeSession = session;
  const cancelled = session.isCancelled || session.status === 'cancelled';
  const completed = session.status === 'completed';

  async function submit(event: FormEvent) {
    event.preventDefault();
    const newStartsAt = toIso(startsDate, startsTime);
    const newEndsAt = toIso(endsDate, endsTime);
    if (new Date(newEndsAt) <= new Date(newStartsAt)) {
      setValidation("L'heure de fin doit suivre l'heure de début.");
      return;
    }
    if (cancelled && !reactivate) {
      setValidation('Confirmez la réactivation pour reporter cette session annulée.');
      return;
    }
    if (completed && !confirmCompleted) {
      setValidation('Confirmez la reprogrammation de cette session terminée.');
      return;
    }
    setValidation('');
    if (await onSubmit({
      sessionId: activeSession.id,
      newStartsAt,
      newEndsAt,
      timezone,
      reason: reason.trim() || undefined,
      reactivate: cancelled ? reactivate : undefined,
      confirmCompleted: completed ? confirmCompleted : undefined,
    })) draft.clearDraft();
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="report-session-title" className="max-h-[calc(100vh-24px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-brand-border bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-brand-orange"><CalendarClock className="h-4 w-4" />Sessions live</p>
            <h2 id="report-session-title" className="mt-2 text-2xl font-black text-brand-navy">Reporter la session</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Choisissez une nouvelle date et une nouvelle heure. Les étudiants approuvés seront informés automatiquement.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-border text-slate-500 hover:bg-slate-50 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        {adminContext ? <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><strong className="text-brand-navy">{session.courseTitle}</strong>{session.teacherName ? ` · ${session.teacherName}` : ''}</p> : null}
        {session.isRecurring ? <p className="mt-5 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-800">Cette session fait partie d'une série récurrente. Le report concerne uniquement cette occurrence.</p> : null}
        {cancelled ? (
          <label className="mt-5 flex items-start gap-3 rounded-xl bg-orange-50 p-4 text-sm text-orange-800">
            <input type="checkbox" checked={reactivate} onChange={(event) => setReactivate(event.target.checked)} className="mt-0.5 accent-brand-orange" />
            <span><strong className="block">Cette session est annulée.</strong>Le report va la réactiver et la rendre à nouveau visible comme session planifiée.</span>
          </label>
        ) : null}
        {completed ? (
          <label className="mt-5 flex items-start gap-3 rounded-xl bg-orange-50 p-4 text-sm text-orange-800">
            <input type="checkbox" checked={confirmCompleted} onChange={(event) => setConfirmCompleted(event.target.checked)} className="mt-0.5 accent-brand-orange" />
            <span><strong className="block">Cette session est déjà terminée.</strong>Je confirme vouloir la reprogrammer à une nouvelle date.</span>
          </label>
        ) : null}
        {error || validation ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error || validation}</p> : null}
        <form onSubmit={(event) => void submit(event)} className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeFields label="Nouvelle date de début" date={startsDate} time={startsTime} onDate={setStartsDate} onTime={setStartsTime} />
            <DateTimeFields label="Nouvelle date de fin" date={endsDate} time={endsTime} onDate={setEndsDate} onTime={setEndsTime} />
          </div>
          <label className="block text-sm font-bold text-brand-navy">Fuseau horaire
            <input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-brand-orange" />
          </label>
          <label className="block text-sm font-bold text-brand-navy">Raison du report <span className="font-normal text-slate-400">(facultatif)</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-brand-orange" placeholder="Ex. Indisponibilité exceptionnelle du professeur" />
          </label>
          {draft.restored ? <p className="text-xs font-semibold text-orange-700">Votre report non enregistré a été restauré.</p> : null}
          <p className="flex gap-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />Le même lien Google Meet est conservé lorsque l'événement Calendar existe toujours.</p>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60">Annuler</button>
            <button disabled={saving} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Report en cours...' : 'Reporter la session'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DateTimeFields({ label, date, time, onDate, onTime }: { label: string; date: string; time: string; onDate: (value: string) => void; onTime: (value: string) => void }) {
  return (
    <fieldset className="rounded-xl border border-slate-100 p-3">
      <legend className="px-1 text-sm font-bold text-brand-navy">{label}</legend>
      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
        <input required type="date" value={date} onChange={(event) => onDate(event.target.value)} className="min-w-0 rounded-lg border border-brand-border px-3 py-3 text-sm outline-none focus:border-brand-orange" />
        <input required type="time" value={time} onChange={(event) => onTime(event.target.value)} className="min-w-0 rounded-lg border border-brand-border px-3 py-3 text-sm outline-none focus:border-brand-orange" />
      </div>
    </fieldset>
  );
}
