import { BookOpen, ExternalLink, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CalendarLiveSessionEvent } from '../../types/liveSessions';
import GoogleMeetBadge from '../live/GoogleMeetBadge';
import LiveSessionStatusBadge from '../live/LiveSessionStatusBadge';

export default function StudentCalendarLiveSessionCard({ event }: { event: CalendarLiveSessionEvent }) {
  const canJoin = (event.status === 'scheduled' || event.status === 'live') && Boolean(event.meetingUrl);
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2"><LiveSessionStatusBadge status={event.status} /><GoogleMeetBadge /></div>
      <h3 className="mt-3 text-lg font-black text-brand-navy">{event.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{event.courseTitle} · {event.teacherName}</p>
      <p className="mt-3 text-sm font-semibold text-slate-500">{new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.startsAt))}</p>
      {event.postponedAt ? <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm text-orange-800"><strong>Session reportée.</strong>{event.previousStartsAt ? ` Initialement prévue le ${new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.previousStartsAt))}.` : ''}</p> : null}
      {event.status === 'cancelled' && event.cancelledReason ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">Session annulée : {event.cancelledReason}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {canJoin ? <a href={event.meetingUrl!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand-orange px-3 py-2 text-xs font-bold text-white"><ExternalLink className="h-4 w-4" />Rejoindre la session</a> : null}
        {event.status === 'completed' && event.replayAvailable && event.recordingUrl ? <a href={event.recordingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><PlayCircle className="h-4 w-4" />Voir l'enregistrement</a> : null}
        {event.status === 'completed' && (!event.replayAvailable || !event.recordingUrl) ? <span className="self-center text-xs font-semibold text-slate-500">Enregistrement non disponible</span> : null}
        <Link to={`/courses/${event.courseId}/learn`} className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><BookOpen className="h-4 w-4" />Ouvrir le cours</Link>
      </div>
    </article>
  );
}
