import { CalendarClock, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicCourseLiveSessionPreview, getStudentCourseLiveSessions } from '../../services/liveSessionsService';
import { LiveSession, LiveSessionPreview } from '../../types/liveSessions';
import { getLiveSessionDisplayStatus } from '../../utils/liveSessionStatus';
import StudentLiveSessionCard from '../live-sessions/StudentLiveSessionCard';

export default function StudentLiveSessionsPanel({ courseId, hasAccess, compact = false }: { courseId: string; hasAccess: boolean; compact?: boolean }) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [preview, setPreview] = useState<LiveSessionPreview>({ upcoming_count: 0, next_starts_at: null });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    (hasAccess ? getStudentCourseLiveSessions(courseId).then(setSessions) : getPublicCourseLiveSessionPreview(courseId).then(setPreview))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [courseId, hasAccess]);

  if (loading) return null;
  if (hasAccess) {
    const featured = sessions.find((session) => getLiveSessionDisplayStatus(session) === 'live')
      ?? sessions.find((session) => getLiveSessionDisplayStatus(session) === 'scheduled');
    const otherSessions = sessions.filter((session) => session.id !== featured?.id);
    const grouped = {
      scheduled: otherSessions.filter((session) => getLiveSessionDisplayStatus(session) === 'scheduled'),
      completed: otherSessions.filter((session) => getLiveSessionDisplayStatus(session) === 'completed').slice(0, 3),
      cancelled: otherSessions.filter((session) => getLiveSessionDisplayStatus(session) === 'cancelled'),
    };
    const hiddenCompletedCount = otherSessions.filter((session) => getLiveSessionDisplayStatus(session) === 'completed').length - grouped.completed.length;
    return (
      <section className="space-y-4">
        <h2 className={`flex items-center gap-2 font-black text-brand-navy ${compact ? 'text-base' : 'text-2xl'}`}><CalendarClock className="h-5 w-5 text-brand-orange" />Sessions live</h2>
        {!sessions.length ? <p className={`rounded-2xl border border-dashed border-brand-border bg-white text-center text-slate-500 ${compact ? 'p-4 text-sm' : 'p-6'}`}>Aucune session live prévue pour ce cours.</p> : null}
        {featured ? (
          <div>
            <p className="mb-3 text-sm font-bold text-brand-navy">{getLiveSessionDisplayStatus(featured) === 'live' ? 'Session en direct maintenant' : 'Prochaine session live'}</p>
            <StudentLiveSessionCard session={featured} featured />
          </div>
        ) : null}
        {otherSessions.length ? (
          <details className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-bold text-brand-navy">Autres sessions ({otherSessions.length})</summary>
            <div className="mt-4 space-y-5">
              <SessionGroup title="À venir" sessions={grouped.scheduled} />
              <SessionGroup title="Terminées" sessions={grouped.completed} />
              {hiddenCompletedCount > 0 ? <Link to="/student/calendar" className="inline-flex text-xs font-bold text-brand-navy hover:underline">Voir toutes les sessions ({hiddenCompletedCount} autre(s) terminée(s))</Link> : null}
              <SessionGroup title="Annulées" sessions={grouped.cancelled} />
            </div>
          </details>
        ) : null}
      </section>
    );
  }
  if (!preview.upcoming_count) return null;
  return (
    <section className={`rounded-2xl border border-brand-border bg-white shadow-sm ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-orange-50 p-3 text-brand-orange"><Lock className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-black text-brand-navy">Sessions live Google Meet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{preview.upcoming_count} session(s) live à venir. Les sessions live sont réservées aux étudiants inscrits au cours.</p>
        </div>
      </div>
    </section>
  );
}

function SessionGroup({ title, sessions }: { title: string; sessions: LiveSession[] }) {
  if (!sessions.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-500">{title}</h3>
      {sessions.map((session) => <StudentLiveSessionCard key={session.id} session={session} />)}
    </div>
  );
}
