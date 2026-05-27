import { ExternalLink, PlayCircle, X } from 'lucide-react';
import { ReactNode } from 'react';
import { CalendarLiveSessionEvent } from '../../types/liveSessions';
import GoogleMeetBadge from '../live/GoogleMeetBadge';
import LiveSessionStatusBadge from '../live/LiveSessionStatusBadge';

export default function CalendarSessionModal({ event, canJoin, canReplay, children, onClose }: { event: CalendarLiveSessionEvent | null; canJoin: boolean; canReplay: boolean; children?: ReactNode; onClose: () => void }) {
  if (!event) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <section role="dialog" aria-modal="true" aria-label={event.title} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2"><LiveSessionStatusBadge status={event.status} /><GoogleMeetBadge /></div>
          <button type="button" aria-label="Fermer" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <h2 className="mt-4 text-2xl font-black text-brand-navy">{event.title}</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">{event.courseTitle} · {event.teacherName}</p>
        <p className="mt-4 text-sm text-slate-600">{new Intl.DateTimeFormat('fr-TN', { dateStyle: 'full', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.startsAt))}</p>
        {event.description ? <p className="mt-4 text-sm leading-6 text-slate-600">{event.description}</p> : null}
        {event.status === 'cancelled' && event.cancelledReason ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">Motif : {event.cancelledReason}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {canJoin && event.meetingUrl && (event.status === 'scheduled' || event.status === 'live') ? <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-3 text-sm font-bold text-white"><ExternalLink className="h-4 w-4" />Rejoindre</a> : null}
          {canReplay && event.status === 'completed' && event.replayAvailable && event.recordingUrl ? <a href={event.recordingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy"><PlayCircle className="h-4 w-4" />Voir l'enregistrement</a> : null}
          {children}
        </div>
      </section>
    </div>
  );
}
