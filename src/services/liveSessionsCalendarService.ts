import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import {
  AdminLiveSessionCalendarFilters,
  CalendarLiveSessionEvent,
  LiveSession,
  LiveSessionCalendarRange,
  LiveSessionStatus,
} from '../types/liveSessions';
import { getLiveSessionDisplayStatus, sortCalendarLiveSessionEvents, sortLiveSessions } from '../utils/liveSessionStatus';

type CourseCalendarRow = {
  id: string;
  title: string;
  subject: string | null;
  cover_url: string | null;
  teacher_id: string;
  profiles?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
};

function fail(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

function singleProfile(value: CourseCalendarRow['profiles']) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function getLiveSessionStatus(session: Pick<LiveSession, 'is_cancelled' | 'status' | 'starts_at' | 'ends_at' | 'deleted_at'>): LiveSessionStatus {
  return getLiveSessionDisplayStatus(session);
}

async function sessionRows(range?: LiveSessionCalendarRange, deletedOnly = false) {
  let query = supabase.from('course_live_sessions').select('*').order('starts_at', { ascending: true });
  query = deletedOnly ? query.not('deleted_at', 'is', null) : query.is('deleted_at', null).neq('status', 'deleted');
  if (range?.from) query = query.gte('starts_at', range.from);
  if (range?.to) query = query.lte('starts_at', range.to);
  const { data, error } = await query;
  if (error) return fail('liveCalendar.sessions', error);
  return sortLiveSessions((data ?? []) as LiveSession[]);
}

async function approvedCountByCourse(courseIds: string[]) {
  if (!courseIds.length) return new Map<string, number>();
  const { data, error } = await supabase.from('course_enrollments').select('course_id').eq('status', 'approved').in('course_id', courseIds);
  if (error) {
    logSupabaseError('liveCalendar.approvedCounts', error);
    return new Map<string, number>();
  }
  return (data ?? []).reduce((counts, item) => {
    counts.set(item.course_id, (counts.get(item.course_id) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function eventsForVisibleSessions(sessions: LiveSession[], includeCounts: boolean) {
  const courseIds = Array.from(new Set(sessions.map((session) => session.course_id)));
  if (!courseIds.length) return [] as CalendarLiveSessionEvent[];
  const [{ data: courses, error }, counts] = await Promise.all([
    supabase.from('courses').select('id,title,subject,cover_url,teacher_id,profiles:teacher_id(full_name)').in('id', courseIds),
    includeCounts ? approvedCountByCourse(courseIds) : Promise.resolve(new Map<string, number>()),
  ]);
  if (error) return fail('liveCalendar.courses', error);
  const coursesById = new Map(((courses ?? []) as unknown as CourseCalendarRow[]).map((course) => [course.id, course]));
  return sortCalendarLiveSessionEvents(sessions.map((session) => {
    const course = coursesById.get(session.course_id);
    return {
      id: session.id,
      title: session.title,
      description: session.description,
      courseId: session.course_id,
      courseTitle: course?.title ?? 'Cours',
      teacherId: session.teacher_id,
      teacherName: singleProfile(course?.profiles)?.full_name ?? 'Prof',
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      timezone: session.timezone,
      status: getLiveSessionStatus(session),
      provider: session.provider,
      meetingUrl: session.meeting_url,
      recordingUrl: session.recording_url,
      replayAvailable: session.replay_available,
      isCancelled: session.is_cancelled,
      cancelledReason: session.cancelled_reason,
      deletedAt: session.deleted_at ?? null,
      deletedBy: session.deleted_by ?? null,
      deleteReason: session.delete_reason ?? null,
      postponedAt: session.postponed_at ?? null,
      postponedBy: session.postponed_by ?? null,
      previousStartsAt: session.previous_starts_at ?? null,
      previousEndsAt: session.previous_ends_at ?? null,
      postponeReason: session.postpone_reason ?? null,
      postponeCount: session.postpone_count ?? 0,
      approvedStudentsCount: includeCounts ? counts.get(session.course_id) ?? 0 : undefined,
      courseCoverUrl: course?.cover_url ?? null,
      subjectName: course?.subject ?? null,
      teacherCohostEmail: session.teacher_cohost_email ?? null,
      teacherCohostStatus: session.teacher_cohost_status,
      teacherCohostError: session.teacher_cohost_error ?? null,
      teacherCohostGoogleStatusCode: session.teacher_cohost_google_status_code ?? null,
      teacherCohostGoogleMessage: session.teacher_cohost_google_message ?? null,
      meetSpaceConfigStatus: session.meet_space_config_status,
      meetSpaceConfigError: session.meet_space_config_error ?? null,
      meetArtifactConfigStatus: session.meet_artifact_config_status,
      meetArtifactConfigError: session.meet_artifact_config_error ?? null,
      googleMeetSpaceName: session.google_meet_space_name ?? null,
      googleEventId: session.google_event_id,
      googleCalendarId: session.google_calendar_id,
      googleHtmlLink: session.google_html_link,
      teacherCohostAttemptedMethod: session.teacher_cohost_attempted_method ?? null,
      teacherCohostAttemptedEndpoint: session.teacher_cohost_attempted_endpoint ?? null,
      recurrenceGroupId: session.recurrence_group_id ?? null,
      recurrenceIndex: session.recurrence_index ?? null,
      recurrenceType: session.recurrence_type ?? null,
      recurrenceTotalOccurrences: session.recurrence_total_occurrences ?? null,
      isRecurring: session.is_recurring ?? false,
    };
  }));
}

export async function getTeacherCalendarSessions(teacherId: string, range?: LiveSessionCalendarRange) {
  const sessions = (await sessionRows(range)).filter((session) => session.teacher_id === teacherId);
  return eventsForVisibleSessions(sessions, true);
}

export async function getStudentCalendarSessions(range?: LiveSessionCalendarRange) {
  return eventsForVisibleSessions(await sessionRows(range), false);
}

export async function getAdminCalendarSessions(filters: AdminLiveSessionCalendarFilters = {}, range?: LiveSessionCalendarRange) {
  return filterAdminCalendarSessions(await eventsForVisibleSessions(await sessionRows(range, filters.status === 'deleted'), true), filters);
}

export function filterAdminCalendarSessions(source: CalendarLiveSessionEvent[], filters: AdminLiveSessionCalendarFilters = {}) {
  let events = [...source];
  const query = filters.query?.trim().toLowerCase() ?? '';
  if (query) events = events.filter((event) => `${event.title} ${event.courseTitle} ${event.teacherName} ${event.subjectName ?? ''}`.toLowerCase().includes(query));
  if (filters.teacherId) events = events.filter((event) => event.teacherId === filters.teacherId);
  if (filters.courseId) events = events.filter((event) => event.courseId === filters.courseId);
  if (filters.subjectName) events = events.filter((event) => event.subjectName === filters.subjectName);
  if (filters.provider) events = events.filter((event) => event.provider === filters.provider);
  if (filters.status && filters.status !== 'all') events = events.filter((event) => event.status === filters.status);
  if (filters.cohostStatus) events = events.filter((event) => event.teacherCohostStatus === filters.cohostStatus);
  if (filters.recurring === 'yes') events = events.filter((event) => event.isRecurring);
  if (filters.recurring === 'no') events = events.filter((event) => !event.isRecurring);
  if (filters.hideTestSessions) events = events.filter((event) => !event.title.toLowerCase().includes('test'));
  const from = filters.dateFrom ? new Date(filters.dateFrom).toISOString() : '';
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).toISOString() : '';
  if (from) events = events.filter((event) => event.startsAt >= from);
  if (to) events = events.filter((event) => event.startsAt <= to);
  if (filters.hasRecording === 'yes') events = events.filter((event) => event.replayAvailable && Boolean(event.recordingUrl));
  if (filters.hasRecording === 'no') events = events.filter((event) => !event.replayAvailable || !event.recordingUrl);
  if (filters.period === 'upcoming') events = events.filter((event) => event.status === 'scheduled' || event.status === 'live');
  if (filters.period === 'past') events = events.filter((event) => event.status === 'completed' || event.status === 'cancelled');
  return sortCalendarLiveSessionEvents(events);
}

export function getAdminCalendarStats(events: CalendarLiveSessionEvent[]) {
  const today = new Date().toDateString();
  return {
    upcoming: events.filter((event) => event.status === 'scheduled' || event.status === 'live').length,
    live: events.filter((event) => event.status === 'live').length,
    today: events.filter((event) => new Date(event.startsAt).toDateString() === today).length,
    cancelled: events.filter((event) => event.status === 'cancelled').length,
    deleted: events.filter((event) => event.status === 'deleted').length,
    completed: events.filter((event) => event.status === 'completed').length,
    recordings: events.filter((event) => event.replayAvailable && Boolean(event.recordingUrl)).length,
    missingRecordings: events.filter((event) => event.status === 'completed' && (!event.replayAvailable || !event.recordingUrl)).length,
    cohostFailed: events.filter((event) => event.teacherCohostStatus === 'failed' || event.teacherCohostStatus === 'unsupported').length,
  };
}
