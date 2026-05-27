import { getErrorMessage, logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CreateGoogleMeetLiveSessionInput, CreateGoogleMeetLiveSessionResult, DeleteGoogleMeetLiveSessionInput, LiveSession, LiveSessionHistory, LiveSessionPreview, ReportGoogleMeetLiveSessionInput, UpdateGoogleMeetLiveSessionInput } from '../types/liveSessions';
import { sortLiveSessions } from '../utils/liveSessionStatus';

function fail(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

export async function getTeacherCourseLiveSessions(courseId: string) {
  const { data, error } = await supabase
    .from('course_live_sessions')
    .select('*')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .neq('status', 'deleted')
    .order('starts_at', { ascending: true });
  if (error) return fail('liveSessions.teacherList', error);
  return sortLiveSessions((data ?? []) as LiveSession[]);
}

export async function getStudentCourseLiveSessions(courseId: string) {
  const { data, error } = await supabase
    .from('course_live_sessions')
    .select('*')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .neq('status', 'deleted')
    .order('starts_at', { ascending: true });
  if (error) return fail('liveSessions.studentList', error);
  return sortLiveSessions((data ?? []) as LiveSession[]);
}

export async function getPublicCourseLiveSessionPreview(courseId: string) {
  const { data, error } = await supabase.rpc('get_course_live_session_preview', { target_course_id: courseId });
  if (error) {
    logSupabaseError('liveSessions.publicPreview', error);
    return { upcoming_count: 0, next_starts_at: null } as LiveSessionPreview;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    upcoming_count: Number(row?.upcoming_count ?? 0),
    next_starts_at: row?.next_starts_at ?? null,
  } as LiveSessionPreview;
}

async function invokeSessionFunction<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    logSupabaseError(`liveSessions.${name}`, error);
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const payload = await response.clone().json() as { error?: string; message?: string };
        if (payload.error || payload.message) throw new Error(payload.error || payload.message);
      } catch (responseError) {
        if (responseError instanceof Error && responseError.message !== 'Unexpected end of JSON input') throw responseError;
      }
    }
    throw new Error(getErrorMessage(error, 'Impossible de traiter la demande de session live.'));
  }
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export function createGoogleMeetLiveSession(input: CreateGoogleMeetLiveSessionInput) {
  return invokeSessionFunction<CreateGoogleMeetLiveSessionResult>('create-google-meet-session', { ...input });
}

export function updateGoogleMeetLiveSession(sessionId: string, input: UpdateGoogleMeetLiveSessionInput) {
  const body = {
    sessionId,
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    timezone: input.timezone,
    reactivate: input.reactivate === true,
  };
  if (import.meta.env.DEV) console.info('Updating live session', { sessionId, reactivate: body.reactivate });
  return invokeSessionFunction<LiveSession>('update-google-meet-session', body);
}

export function cancelGoogleMeetLiveSession(sessionId: string, reason?: string) {
  return invokeSessionFunction<LiveSession>('cancel-google-meet-session', { sessionId, reason });
}

export function reportGoogleMeetLiveSession(input: ReportGoogleMeetLiveSessionInput) {
  return invokeSessionFunction<LiveSession>('report-google-meet-session', { ...input });
}

export function deleteGoogleMeetLiveSession(sessionId: string, reason?: string) {
  const input: DeleteGoogleMeetLiveSessionInput = { sessionId, reason };
  return invokeSessionFunction<LiveSession>('delete-google-meet-session', { ...input });
}

export async function getLiveSessionHistory(sessionId: string) {
  const { data, error } = await supabase
    .from('live_session_history')
    .select('*, actor:profiles!actor_id(full_name,role)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });
  if (error) return fail('liveSessions.history', error);
  return (data ?? []) as unknown as LiveSessionHistory[];
}

export function retryGoogleMeetCohost(sessionId: string) {
  return invokeSessionFunction<LiveSession>('retry-google-meet-cohost', { sessionId });
}

export async function addLiveSessionRecording(sessionId: string, recordingUrl: string, replayAvailable: boolean) {
  const { data, error } = await supabase.rpc('set_live_session_recording', {
    target_session_id: sessionId,
    new_recording_url: recordingUrl,
    new_replay_available: replayAvailable,
  });
  if (error) return fail('liveSessions.recording', error);
  return data as LiveSession;
}
