import { CalendarClock, ExternalLink, PlayCircle } from 'lucide-react';
import { ReactNode } from 'react';
import GoogleMeetBadge from './GoogleMeetBadge';
import LiveSessionStatusBadge from './LiveSessionStatusBadge';
import { LiveSession } from '../../types/liveSessions';
import { getLiveSessionStatus } from '../../services/liveSessionsCalendarService';

function schedule(session: LiveSession) {
  return new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: session.timezone }).format(new Date(session.starts_at));
}

export default function LiveSessionCard({ session, canJoin = false, controls }: { session: LiveSession; canJoin?: boolean; controls?: ReactNode }) {
  const status = getLiveSessionStatus(session);
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2"><LiveSessionStatusBadge status={status} /><GoogleMeetBadge /></div>
          <h3 className="mt-3 text-lg font-black text-brand-navy">{session.title}</h3>
          <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600"><CalendarClock className="h-4 w-4 text-brand-orange" />{schedule(session)}</p>
          {session.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{session.description}</p> : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {canJoin && (status === 'scheduled' || status === 'live') && session.meeting_url ? (
          <a href={session.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" />Rejoindre la session</a>
        ) : null}
        {canJoin && status === 'completed' && session.replay_available && session.recording_url ? (
          <a href={session.recording_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy"><PlayCircle className="h-4 w-4" />Voir l'enregistrement</a>
        ) : null}
        {controls}
      </div>
    </article>
  );
}
