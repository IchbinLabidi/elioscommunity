import { CalendarLiveSessionEvent, LiveSession, LiveSessionStatus } from '../types/liveSessions';

type SessionTiming = Pick<LiveSession, 'is_cancelled' | 'status' | 'starts_at' | 'ends_at' | 'deleted_at'>;

export function getLiveSessionDisplayStatus(session: SessionTiming): LiveSessionStatus {
  if (session.deleted_at || session.status === 'deleted') return 'deleted';
  if (session.is_cancelled === true || session.status === 'cancelled') return 'cancelled';
  const now = Date.now();
  const startsAt = new Date(session.starts_at).getTime();
  const endsAt = new Date(session.ends_at).getTime();
  if (now >= startsAt && now <= endsAt) return 'live';
  if (now > endsAt) return 'completed';
  return 'scheduled';
}

function statusRank(status: LiveSessionStatus) {
  return { live: 0, scheduled: 1, completed: 2, cancelled: 3, deleted: 4 }[status];
}

function timeOrder(status: LiveSessionStatus, left: number, right: number) {
  return status === 'live' || status === 'scheduled' ? left - right : right - left;
}

export function sortLiveSessions(sessions: LiveSession[]) {
  return [...sessions].sort((left, right) => {
    const leftStatus = getLiveSessionDisplayStatus(left);
    const rightStatus = getLiveSessionDisplayStatus(right);
    return statusRank(leftStatus) - statusRank(rightStatus)
      || timeOrder(leftStatus, new Date(left.starts_at).getTime(), new Date(right.starts_at).getTime());
  });
}

export function sortCalendarLiveSessionEvents(events: CalendarLiveSessionEvent[]) {
  return [...events].sort((left, right) => statusRank(left.status) - statusRank(right.status)
    || timeOrder(left.status, new Date(left.startsAt).getTime(), new Date(right.startsAt).getTime()));
}
