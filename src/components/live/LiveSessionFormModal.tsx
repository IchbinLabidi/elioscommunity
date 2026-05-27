import { CalendarPlus, Info, X } from 'lucide-react';
import { FormEvent, useMemo } from 'react';
import DraftRestoreBanner from '../forms/DraftRestoreBanner';
import DraftStatus from '../forms/DraftStatus';
import { LiveSessionRecurrenceConfig, LiveSessionWeekdayKey } from '../../types/liveSessions';
import { defaultDaySchedule, generateLiveSessionOccurrences, weekdayLabels, weekdayOrder } from '../../utils/liveSessionRecurrence';

export type LiveSessionFormValue = {
  title: string;
  description: string;
  startsDate: string;
  startsTime: string;
  durationHours: number;
  durationMinutes: number;
  timezone: string;
  recurrence: LiveSessionRecurrenceConfig;
};

type Props = {
  open: boolean;
  editing: boolean;
  cancelled: boolean;
  value: LiveSessionFormValue;
  saving: boolean;
  error: string;
  draftStatus?: 'idle' | 'saving' | 'saved' | 'error';
  draftSavedAt?: string | null;
  draftRestored?: boolean;
  onDismissDraftRestore?: () => void;
  onDiscardDraft?: () => void;
  onChange: (value: LiveSessionFormValue) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};

function initialStartsAt(value: LiveSessionFormValue) {
  return value.startsDate && value.startsTime ? new Date(`${value.startsDate}T${value.startsTime}`).toISOString() : undefined;
}

export default function LiveSessionFormModal({ open, editing, cancelled, value, saving, error, draftStatus = 'idle', draftSavedAt = null, draftRestored = false, onDismissDraftRestore, onDiscardDraft, onChange, onClose, onSubmit }: Props) {
  const preview = useMemo(() => {
    if (editing || !value.recurrence.enabled || !value.startsDate) return { rows: [], error: '' };
    try {
      const rows = generateLiveSessionOccurrences({
        startsAt: new Date(`${value.startsDate}T00:00:00`).toISOString(),
        durationMinutes: (value.durationHours * 60) + value.durationMinutes,
        timezone: value.timezone,
        recurrence: value.recurrence,
      });
      return { rows, error: '' };
    } catch (previewError) {
      return { rows: [], error: previewError instanceof Error ? previewError.message : 'Configuration invalide.' };
    }
  }, [editing, value]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="live-session-form-title" className="max-h-[calc(100vh-24px)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-brand-border bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-brand-orange"><CalendarPlus className="h-4 w-4" />Google Meet</p>
            <h2 id="live-session-form-title" className="mt-2 text-2xl font-black text-brand-navy">{editing ? 'Modifier la session' : 'Programmer une session Google Meet'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Le lien Google Meet sera créé automatiquement et les étudiants approuvés seront invités.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-brand-border text-slate-500 hover:bg-slate-50 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </div>
        {cancelled ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">Cette session est annulée.</p> : null}
        {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        {draftRestored && onDismissDraftRestore && onDiscardDraft ? <div className="mt-5"><DraftRestoreBanner onKeep={onDismissDraftRestore} onDiscard={onDiscardDraft} /></div> : null}
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <label className="block text-sm font-bold text-brand-navy">Titre
            <input required value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-brand-orange" />
          </label>
          <label className="block text-sm font-bold text-brand-navy">Description
            <textarea value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-brand-orange" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {value.recurrence.enabled && !editing ? (
              <RecurrenceStartDateField date={value.startsDate} onDate={(startsDate) => onChange({ ...value, startsDate })} />
            ) : (
              <DateTimeFields date={value.startsDate} time={value.startsTime} onDate={(startsDate) => onChange({ ...value, startsDate })} onTime={(startsTime) => onChange({ ...value, startsTime })} />
            )}
            <DurationFields label={value.recurrence.enabled && !editing ? 'Durée de chaque séance' : 'Durée de la séance'} hours={value.durationHours} minutes={value.durationMinutes} onHours={(durationHours) => onChange({ ...value, durationHours })} onMinutes={(durationMinutes) => onChange({ ...value, durationMinutes })} />
          </div>
          <label className="block text-sm font-bold text-brand-navy">Fuseau horaire
            <input value={value.timezone} onChange={(event) => onChange({ ...value, timezone: event.target.value })} className="mt-2 w-full rounded-xl border border-brand-border px-4 py-3 font-normal outline-none focus:border-brand-orange" />
          </label>
          {!editing ? <RecurrencePlanner value={value} preview={preview} onChange={onChange} /> : null}
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <input type="checkbox" checked disabled className="mt-0.5 accent-brand-orange" />
            <span><strong className="block text-brand-navy">Inviter automatiquement les étudiants approuvés</strong>Activé par défaut pour protéger l'accès aux sessions du cours.</span>
          </label>
          <p className="flex gap-2 rounded-xl bg-orange-50 p-3 text-sm leading-6 text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />Le professeur sera configuré comme co-host si Google Meet l'autorise.</p>
          <DraftStatus status={draftStatus} lastSavedAt={draftSavedAt} />
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-brand-border px-5 py-3 text-sm font-bold text-brand-navy disabled:opacity-60">Annuler</button>
            <button disabled={saving} className="rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? (editing ? 'Mise à jour...' : 'Création du Meet...') : editing ? 'Enregistrer les modifications' : value.recurrence.enabled ? 'Programmer les sessions' : 'Programmer la session'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function RecurrencePlanner({ value, preview, onChange }: { value: LiveSessionFormValue; preview: { rows: ReturnType<typeof generateLiveSessionOccurrences>; error: string }; onChange: (value: LiveSessionFormValue) => void }) {
  const recurrence = value.recurrence;
  const selected = weekdayOrder.filter((day) => recurrence.selectedDays[day]?.enabled);
  const replace = (next: Partial<LiveSessionRecurrenceConfig>) => onChange({ ...value, recurrence: { ...recurrence, ...next } });
  const updateDay = (day: LiveSessionWeekdayKey, patch: Partial<NonNullable<LiveSessionRecurrenceConfig['selectedDays'][LiveSessionWeekdayKey]>>) => {
    const current = recurrence.selectedDays[day] ?? defaultDaySchedule(initialStartsAt(value));
    replace({ selectedDays: { ...recurrence.selectedDays, [day]: { ...current, ...patch } } });
  };
  const toggleDay = (day: LiveSessionWeekdayKey) => updateDay(day, { enabled: !recurrence.selectedDays[day]?.enabled });
  return (
    <section className="space-y-5 rounded-2xl border border-brand-border bg-slate-50/60 p-4 sm:p-5">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={recurrence.enabled} onChange={(event) => replace({ enabled: event.target.checked })} className="mt-1 h-4 w-4 accent-brand-orange" />
        <span><strong className="block text-sm text-brand-navy">Session récurrente</strong><span className="text-sm text-slate-600">Créez la même session live sur plusieurs dates.</span></span>
      </label>
      {recurrence.enabled ? <>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-brand-navy">Fréquence
            <select value={recurrence.frequency} onChange={(event) => {
              const frequency = event.target.value as LiveSessionRecurrenceConfig['frequency'];
              if (frequency === 'daily') {
                const schedule = defaultDaySchedule(initialStartsAt(value));
                replace({ frequency, selectedDays: Object.fromEntries(weekdayOrder.map((day) => [day, schedule])) });
              } else replace({ frequency });
            }} className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 font-normal outline-none focus:border-brand-orange">
              <option value="weekly">Chaque semaine</option><option value="daily">Chaque jour</option><option value="custom">Personnalisé</option>
            </select>
          </label>
          <label className="text-sm font-bold text-brand-navy">Répéter jusqu’au
            <input type="date" required value={recurrence.endDate} onChange={(event) => replace({ endDate: event.target.value })} className="mt-2 w-full rounded-xl border border-brand-border bg-white px-4 py-3 font-normal outline-none focus:border-brand-orange" />
          </label>
        </div>
        <div><p className="text-sm font-bold text-brand-navy">Jours</p><div className="mt-3 flex flex-wrap gap-2">
          {weekdayOrder.map((day) => <button type="button" key={day} onClick={() => toggleDay(day)} className={`rounded-xl px-4 py-2 text-sm font-bold ${recurrence.selectedDays[day]?.enabled ? 'bg-brand-orange text-white' : 'border border-brand-border bg-white text-slate-600'}`}>{weekdayLabels[day].short}</button>)}
        </div></div>
        <div className="space-y-3">{selected.map((day) => {
          const schedule = recurrence.selectedDays[day]!;
          return <div key={day} className="grid items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[minmax(100px,1fr)_100px_100px_auto]">
            <p className="font-bold text-brand-navy">{weekdayLabels[day].long}</p>
            <TimeSelect label="Heure" value={schedule.hour} max={23} onChange={(hour) => updateDay(day, { hour })} />
            <TimeSelect label="Minute" value={schedule.minute} max={55} step={5} onChange={(minute) => updateDay(day, { minute })} />
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={schedule.biweekly} onChange={(event) => updateDay(day, { biweekly: event.target.checked })} className="accent-brand-orange" />Une semaine sur deux</label>
          </div>;
        })}</div>
        <div className="rounded-xl bg-white p-4">
          <p className="text-sm font-bold text-brand-navy">Aperçu des sessions</p>
          {preview.error ? <p className="mt-2 text-sm font-semibold text-orange-700">{preview.error}</p> : <><p className="mt-1 text-xs text-slate-500">{preview.rows.length} {preview.rows.length === 1 ? 'session sera créée' : 'sessions seront créées'}</p><div className="mt-3 space-y-2">{preview.rows.slice(0, 5).map((item) => <p key={item.occurrenceIndex} className="text-xs font-semibold text-slate-600">{new Intl.DateTimeFormat('fr-TN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: value.timezone }).format(new Date(item.startsAt))} - {new Intl.DateTimeFormat('fr-TN', { hour: '2-digit', minute: '2-digit', timeZone: value.timezone }).format(new Date(item.endsAt))}</p>)}</div>{preview.rows.length > 5 ? <p className="mt-2 text-xs font-bold text-brand-orange">+ {preview.rows.length - 5} autres sessions</p> : null}</>}
          <p className="mt-3 text-xs text-orange-700">Chaque occurrence aura son propre lien Google Meet et pourra être modifiée séparément.</p>
        </div>
      </> : null}
    </section>
  );
}

function TimeSelect({ label, value, max, step = 1, onChange }: { label: string; value: number; max: number; step?: number; onChange: (value: number) => void }) {
  const options = Array.from({ length: Math.floor(max / step) + 1 }, (_, index) => index * step);
  return <label className="text-xs font-bold text-slate-500">{label}<select value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-2 py-2 text-sm text-brand-navy">{options.map((item) => <option key={item} value={item}>{String(item).padStart(2, '0')}</option>)}</select></label>;
}

function DurationFields({ label, hours, minutes, onHours, onMinutes }: { label: string; hours: number; minutes: number; onHours: (value: number) => void; onMinutes: (value: number) => void }) {
  return (
    <fieldset className="rounded-xl border border-slate-100 p-3">
      <legend className="px-1 text-sm font-bold text-brand-navy">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold text-slate-500">Heures
          <select required value={hours} onChange={(event) => onHours(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-3 py-3 text-sm text-brand-navy outline-none focus:border-brand-orange">
            {Array.from({ length: 24 }, (_, index) => <option key={index} value={index}>{index} h</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-500">Minutes
          <select required value={minutes} onChange={(event) => onMinutes(Number(event.target.value))} className="mt-1 block w-full rounded-lg border border-brand-border bg-white px-3 py-3 text-sm text-brand-navy outline-none focus:border-brand-orange">
            {Array.from({ length: 12 }, (_, index) => index * 5).map((item) => <option key={item} value={item}>{item} min</option>)}
          </select>
        </label>
      </div>
    </fieldset>
  );
}

function RecurrenceStartDateField({ date, onDate }: { date: string; onDate: (value: string) => void }) {
  return (
    <label className="rounded-xl border border-slate-100 p-3 text-sm font-bold text-brand-navy">
      À partir du
      <input required type="date" value={date} onChange={(event) => onDate(event.target.value)} className="mt-2 block w-full rounded-lg border border-brand-border px-3 py-3 text-sm font-normal outline-none focus:border-brand-orange" />
      <span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Les sessions seront générées à partir de cette date selon les jours sélectionnés.</span>
    </label>
  );
}

function DateTimeFields({ date, time, onDate, onTime }: { date: string; time: string; onDate: (value: string) => void; onTime: (value: string) => void }) {
  return (
    <fieldset className="rounded-xl border border-slate-100 p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
        <label className="text-xs font-bold text-slate-500">Date début séance
          <input required type="date" value={date} onChange={(event) => onDate(event.target.value)} className="mt-1 block w-full min-w-0 rounded-lg border border-brand-border px-3 py-3 text-sm font-normal text-brand-navy outline-none focus:border-brand-orange" />
        </label>
        <label className="text-xs font-bold text-slate-500">Heure début séance
          <input required type="time" value={time} onChange={(event) => onTime(event.target.value)} className="mt-1 block w-full min-w-0 rounded-lg border border-brand-border px-3 py-3 text-sm font-normal text-brand-navy outline-none focus:border-brand-orange" />
        </label>
      </div>
    </fieldset>
  );
}
