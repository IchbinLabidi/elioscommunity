import { CalendarClock, ExternalLink, PlayCircle } from 'lucide-react';
import { LiveSession } from '../../types/liveSessions';
import { getLiveSessionDisplayStatus } from '../../utils/liveSessionStatus';
import GoogleMeetBadge from '../live/GoogleMeetBadge';
import LiveSessionStatusBadge from '../live/LiveSessionStatusBadge';

function schedule(session: LiveSession) {
  return new Intl.DateTimeFormat('fr-TN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: session.timezone,
  }).format(new Date(session.starts_at));
}

export default function StudentLiveSessionCard({ session, featured = false }: { session: LiveSession; featured?: boolean }) {
  const status = getLiveSessionDisplayStatus(session);
  const canJoin = (status === 'scheduled' || status === 'live') && Boolean(session.meeting_url);
  const hasRecording = status === 'completed' && session.replay_available && Boolean(session.recording_url);

  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm ${featured ? 'border-brand-orange/30 ring-1 ring-orange-100' : 'border-brand-border'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <LiveSessionStatusBadge status={status} />
        <GoogleMeetBadge />
        {session.is_recurring ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-brand-navy">Session {session.recurrence_index}/{session.recurrence_total_occurrences}</span> : null}
        {hasRecording ? <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-brand-orange">Enregistrement disponible</span> : null}
      </div>
      <h3 className="mt-3 truncate text-base font-black text-brand-navy">{session.title}</h3>
      <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
        <CalendarClock className="h-4 w-4 shrink-0 text-brand-orange" />{schedule(session)}
      </p>
      {session.postponed_at ? <p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs font-semibold text-orange-800">Session reportée{session.previous_starts_at ? ` · Initialement prévue le ${new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: session.timezone }).format(new Date(session.previous_starts_at))}` : ''}</p> : null}
      {featured && session.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{session.description}</p> : null}
      {status === 'cancelled' && session.cancelled_reason ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{session.cancelled_reason}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canJoin ? <a href={session.meeting_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" />Rejoindre la session</a> : null}
        {hasRecording ? <a href={session.recording_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-brand-border px-4 py-2.5 text-sm font-bold text-brand-navy"><PlayCircle className="h-4 w-4" />Voir l'enregistrement</a> : null}
        {status === 'completed' && !hasRecording ? <span className="text-xs font-semibold text-slate-500">Enregistrement non disponible</span> : null}
      </div>
    </article>
  );
}
