import { BookOpen, ExternalLink, RefreshCw, TimerReset, Trash2, UserRound, VideoOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CalendarLiveSessionEvent, LiveSessionHistory } from '../../types/liveSessions';
import GoogleMeetBadge from '../live/GoogleMeetBadge';
import LiveSessionCohostStatus from '../live/LiveSessionCohostStatus';
import LiveSessionStatusBadge from '../live/LiveSessionStatusBadge';

export default function AdminCalendarLiveSessionCard({ event, history, onCancel, onPostpone, onDelete, onRetryCohost }: { event: CalendarLiveSessionEvent; history: LiveSessionHistory[]; onCancel: (event: CalendarLiveSessionEvent) => void; onPostpone: (event: CalendarLiveSessionEvent) => void; onDelete: (event: CalendarLiveSessionEvent) => void; onRetryCohost: (event: CalendarLiveSessionEvent) => void }) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2"><LiveSessionStatusBadge status={event.status} /><GoogleMeetBadge /><LiveSessionCohostStatus status={event.teacherCohostStatus} />{event.isRecurring ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-brand-navy">Récurrente {event.recurrenceIndex}/{event.recurrenceTotalOccurrences}</span> : null}{event.replayAvailable ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-brand-orange">Enregistrement disponible</span> : null}</div>
      <h3 className="mt-3 text-lg font-black text-brand-navy">{event.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{event.courseTitle} · {event.teacherName}</p>
      <p className="mt-3 text-sm font-semibold text-slate-500">{new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.startsAt))}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{event.approvedStudentsCount ?? 0} inscription(s) approuvée(s)</p>
      {event.status === 'deleted' ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"><strong>Session supprimée.</strong>{event.deleteReason ? ` Raison : ${event.deleteReason}` : ''}</p> : null}
      {event.postponedAt ? <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-800"><strong>Session reportée.</strong>{event.previousStartsAt ? ` Initialement prévue le ${new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.previousStartsAt))}.` : ''}{event.postponeReason ? ` Raison : ${event.postponeReason}` : ''}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {event.status !== 'cancelled' && event.status !== 'deleted' && event.meetingUrl ? <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand-orange px-3 py-2 text-xs font-bold text-white"><ExternalLink className="h-4 w-4" />Voir Meet</a> : null}
        {event.googleHtmlLink ? <a href={event.googleHtmlLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><ExternalLink className="h-4 w-4" />Calendar</a> : null}
        <Link to={`/admin/courses/${event.courseId}`} className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><BookOpen className="h-4 w-4" />Cours</Link>
        <Link to={`/admin/teachers/${event.teacherId}`} className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><UserRound className="h-4 w-4" />Prof</Link>
        {event.status !== 'deleted' ? <button type="button" onClick={() => onPostpone(event)} className="inline-flex items-center gap-1 rounded-xl border border-orange-100 px-3 py-2 text-xs font-bold text-brand-orange"><TimerReset className="h-4 w-4" />Reporter</button> : null}
        {event.status !== 'cancelled' && event.status !== 'deleted' ? <button type="button" onClick={() => onCancel(event)} className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-700"><VideoOff className="h-4 w-4" />Annuler</button> : null}
        {event.status !== 'deleted' && (event.teacherCohostStatus === 'failed' || event.teacherCohostStatus === 'unsupported') ? <button type="button" onClick={() => onRetryCohost(event)} className="inline-flex items-center gap-1 rounded-xl border border-orange-100 px-3 py-2 text-xs font-bold text-brand-orange"><RefreshCw className="h-4 w-4" />Réessayer co-host</button> : null}
        {event.status !== 'deleted' ? <button type="button" onClick={() => onDelete(event)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />Supprimer la session</button> : null}
      </div>
      <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-bold text-brand-navy">Diagnostics techniques</summary>
        <dl className="mt-3 grid gap-2 break-words sm:grid-cols-2">
          <Detail label="Espace Meet" value={event.googleMeetSpaceName} />
          <Detail label="Événement Google" value={event.googleEventId} />
          <Detail label="Calendrier" value={event.googleCalendarId} />
          <Detail label="Host Management" value={event.meetSpaceConfigStatus} />
          <Detail label="Artifacts" value={event.meetArtifactConfigStatus} />
          <Detail label="Erreur co-host" value={event.teacherCohostError} />
          <Detail label="Statut Google API" value={event.teacherCohostGoogleStatusCode} />
          <Detail label="Message Google API" value={event.teacherCohostGoogleMessage} />
          <Detail label="Méthode tentée" value={event.teacherCohostAttemptedMethod} />
          <Detail label="Endpoint tenté" value={event.teacherCohostAttemptedEndpoint} />
          <Detail label="Enregistrement" value={event.recordingUrl} />
          <Detail label="Reporté le" value={event.postponedAt} />
          <Detail label="Date initiale" value={event.previousStartsAt} />
          <Detail label="Raison du report" value={event.postponeReason} />
          <Detail label="Supprimée le" value={event.deletedAt} />
          <Detail label="Supprimée par" value={event.deletedBy} />
          <Detail label="Raison suppression" value={event.deleteReason} />
          <Detail label="Groupe récurrence" value={event.recurrenceGroupId} />
          <Detail label="Occurrence" value={event.isRecurring ? `${event.recurrenceIndex}/${event.recurrenceTotalOccurrences}` : null} />
        </dl>
      </details>
      {history.length ? (
        <section className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-sm font-black text-brand-navy">Historique des reports</h4>
          <div className="mt-3 space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-bold text-brand-navy">{item.actor?.full_name ?? 'Administrateur'} · {new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at))}</p>
                <p className="mt-1">Du {item.old_starts_at ? new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.old_starts_at)) : '-'} au {item.new_starts_at ? new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.new_starts_at)) : '-'}</p>
                {item.reason ? <p className="mt-1">Raison : {item.reason}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null;
  return <div><dt className="font-bold text-slate-500">{label}</dt><dd>{value}</dd></div>;
}
