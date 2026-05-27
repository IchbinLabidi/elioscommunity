import { ExternalLink, Pencil, PlayCircle, TimerReset, Trash2, VideoOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CalendarLiveSessionEvent } from '../../types/liveSessions';
import GoogleMeetBadge from '../live/GoogleMeetBadge';
import LiveSessionStatusBadge from '../live/LiveSessionStatusBadge';

export default function TeacherCalendarLiveSessionCard({ event, onCancel, onPostpone, onDelete, onRecording }: { event: CalendarLiveSessionEvent; onCancel: (event: CalendarLiveSessionEvent) => void; onPostpone: (event: CalendarLiveSessionEvent) => void; onDelete: (event: CalendarLiveSessionEvent) => void; onRecording: (event: CalendarLiveSessionEvent) => void }) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2"><LiveSessionStatusBadge status={event.status} /><GoogleMeetBadge />{event.isRecurring ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-brand-navy">Récurrente {event.recurrenceIndex}/{event.recurrenceTotalOccurrences}</span> : null}</div>
      <h3 className="mt-3 text-lg font-black text-brand-navy">{event.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{event.courseTitle}</p>
      <p className="mt-3 text-sm font-semibold text-slate-500">{new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.startsAt))}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{event.approvedStudentsCount ?? 0} étudiant(s) approuvé(s)</p>
      {event.postponedAt ? <p className="mt-3 rounded-xl bg-orange-50 p-3 text-xs font-semibold text-orange-800">Session reportée{event.previousStartsAt ? ` · Initialement prévue le ${new Intl.DateTimeFormat('fr-TN', { dateStyle: 'medium', timeStyle: 'short', timeZone: event.timezone }).format(new Date(event.previousStartsAt))}` : ''}</p> : null}
      {event.status === 'cancelled' && event.cancelledReason ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{event.cancelledReason}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {(event.status === 'scheduled' || event.status === 'live') && event.meetingUrl ? <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-brand-orange px-3 py-2 text-xs font-bold text-white"><ExternalLink className="h-4 w-4" />Rejoindre</a> : null}
        <Link to={`/teacher/courses/${event.courseId}/live-sessions`} className="inline-flex items-center gap-1 rounded-xl border border-brand-border px-3 py-2 text-xs font-bold text-brand-navy"><Pencil className="h-4 w-4" />Modifier</Link>
        <button type="button" onClick={() => onPostpone(event)} className="inline-flex items-center gap-1 rounded-xl border border-orange-100 px-3 py-2 text-xs font-bold text-brand-orange"><TimerReset className="h-4 w-4" />Reporter</button>
        {event.status === 'completed' ? <button type="button" onClick={() => onRecording(event)} className="inline-flex items-center gap-1 rounded-xl border border-orange-100 px-3 py-2 text-xs font-bold text-brand-orange"><PlayCircle className="h-4 w-4" />{event.recordingUrl ? 'Voir / Modifier l’enregistrement' : 'Ajouter l’enregistrement'}</button> : null}
        {(event.status === 'scheduled' || event.status === 'live') ? <button type="button" onClick={() => onCancel(event)} className="inline-flex items-center gap-1 rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-700"><VideoOff className="h-4 w-4" />Annuler</button> : null}
        <button type="button" onClick={() => onDelete(event)} className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" />Supprimer</button>
      </div>
    </article>
  );
}
