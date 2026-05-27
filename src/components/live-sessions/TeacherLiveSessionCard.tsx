import { CalendarClock, ExternalLink, Pencil, PlayCircle, TimerReset, Trash2, VideoOff } from 'lucide-react';
import { LiveSession } from '../../types/liveSessions';
import { getLiveSessionDisplayStatus } from '../../utils/liveSessionStatus';
import GoogleMeetBadge from '../live/GoogleMeetBadge';
import LiveSessionCohostDiagnostics from '../live/LiveSessionCohostDiagnostics';
import LiveSessionCohostStatus from '../live/LiveSessionCohostStatus';
import LiveSessionMeetSetupBadges from '../live/LiveSessionMeetSetupBadges';
import LiveSessionStatusBadge from '../live/LiveSessionStatusBadge';

type Props = {
  session: LiveSession;
  onEdit: (session: LiveSession) => void;
  onCancel: (session: LiveSession) => void;
  onRecording: (session: LiveSession) => void;
  onPostpone: (session: LiveSession) => void;
  onDelete: (session: LiveSession) => void;
  onRetryCohost: (session: LiveSession) => void;
  approvedStudentsCount?: number;
};

export default function TeacherLiveSessionCard({ session, onEdit, onCancel, onRecording, onPostpone, onDelete, onRetryCohost, approvedStudentsCount }: Props) {
  const status = getLiveSessionDisplayStatus(session);
  const mayJoin = (status === 'scheduled' || status === 'live') && Boolean(session.meeting_url);
  const hasRecording = session.replay_available && Boolean(session.recording_url);
  const methodUnavailable = session.teacher_cohost_status === 'unsupported'
    && session.teacher_cohost_google_status_code === 404
    && /method not found/i.test(`${session.teacher_cohost_google_message ?? ''} ${session.teacher_cohost_error ?? ''}`);

  return (
    <article className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <LiveSessionStatusBadge status={status} />
        <GoogleMeetBadge />
        <LiveSessionCohostStatus status={session.teacher_cohost_status} />
        {session.is_recurring ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-brand-navy">Récurrente {session.recurrence_index}/{session.recurrence_total_occurrences}</span> : null}
        {hasRecording ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Enregistrement disponible</span> : null}
      </div>
      <h3 className="mt-3 text-base font-black text-brand-navy">{session.title}</h3>
      <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
        <CalendarClock className="h-4 w-4 text-brand-orange" />
        {new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: session.timezone }).format(new Date(session.starts_at))}
      </p>
      {session.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{session.description}</p> : null}
      {session.postponed_at ? <p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs font-semibold text-orange-800">Session reportée{session.previous_starts_at ? ` · Initialement prévue le ${new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: session.timezone }).format(new Date(session.previous_starts_at))}` : ''}</p> : null}
      {approvedStudentsCount !== undefined ? <p className="mt-3 text-xs font-semibold text-slate-500">{approvedStudentsCount} étudiant(s) approuvé(s) invité(s)</p> : null}
      {session.is_recurring ? <p className="mt-3 text-xs font-semibold text-slate-500">Les actions concernent uniquement cette occurrence.</p> : null}
      {status === 'cancelled' && session.cancelled_reason ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{session.cancelled_reason}</p> : null}
      {session.teacher_cohost_status === 'assigned' ? <p className="mt-3 text-xs text-emerald-700">Vous pouvez gérer la séance et lancer l'enregistrement si l'enregistrement est autorisé.</p> : null}
      {session.teacher_cohost_status === 'failed' ? <p className="mt-3 text-xs text-orange-700">Le Meet est créé, mais le co-host n'a pas pu être configuré automatiquement.</p> : null}
      {methodUnavailable ? <p className="mt-3 text-xs text-orange-700">Co-host automatique non disponible avec la configuration Google actuelle.</p> : null}
      {session.teacher_cohost_status === 'unsupported' && !methodUnavailable ? <p className="mt-3 text-xs text-slate-600">Co-host automatique indisponible. Le professeur reste invité à la session Meet.</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {mayJoin ? <a href={session.meeting_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand-orange px-3 py-2 text-xs font-bold text-white"><ExternalLink className="h-4 w-4" />Rejoindre</a> : null}
        <button type="button" onClick={() => onEdit(session)} className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><Pencil className="h-4 w-4" />{status === 'cancelled' ? 'Réactiver / Modifier' : 'Modifier'}</button>
        <button type="button" onClick={() => onPostpone(session)} className="inline-flex items-center gap-1 rounded-xl border border-orange-100 px-3 py-2 text-xs font-bold text-brand-orange"><TimerReset className="h-4 w-4" />Reporter</button>
        {status === 'completed' && !hasRecording ? <button type="button" onClick={() => onRecording(session)} className="inline-flex items-center gap-1 rounded-xl bg-brand-orange px-3 py-2 text-xs font-bold text-white"><PlayCircle className="h-4 w-4" />Ajouter l'enregistrement</button> : null}
        {status === 'completed' && hasRecording ? <><a href={session.recording_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"><PlayCircle className="h-4 w-4" />Voir</a><button type="button" onClick={() => onRecording(session)} className="inline-flex items-center gap-1 rounded-xl border border-orange-100 px-3 py-2 text-xs font-bold text-brand-orange">Modifier</button></> : null}
        {(status === 'scheduled' || status === 'live') ? <button type="button" onClick={() => onCancel(session)} className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-700"><VideoOff className="h-4 w-4" />Annuler</button> : null}
        {session.teacher_cohost_status === 'failed' || (session.teacher_cohost_status === 'unsupported' && !methodUnavailable) ? <button type="button" onClick={() => onRetryCohost(session)} className="rounded-xl border border-orange-100 px-3 py-2 text-xs font-bold text-brand-orange">Réessayer co-host</button> : null}
        <button type="button" onClick={() => onDelete(session)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />Supprimer</button>
      </div>
      {import.meta.env.DEV && (session.teacher_cohost_status === 'failed' || session.teacher_cohost_status === 'unsupported') ? <div className="mt-4"><LiveSessionMeetSetupBadges session={session} /><div className="mt-3"><LiveSessionCohostDiagnostics session={session} /></div></div> : null}
    </article>
  );
}
