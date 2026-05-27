import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

export async function caller(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth) throw new Error('Authentification requise.');
  const token = auth.replace('Bearer ', '');
  const client = adminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Authentification requise.');
  const { data: profile } = await client.from('profiles').select('id, full_name, email, role, is_blocked, verification_status').eq('id', data.user.id).single();
  if (!profile) throw new Error('Profil introuvable.');
  return { client, profile, authUser: data.user };
}

export async function preferredMeetEmail(
  client: ReturnType<typeof adminClient>,
  profile: { id: string; email?: string | null },
  authEmail?: string | null,
) {
  const { data, error } = await client.from('profiles').select('meet_email').eq('id', profile.id).maybeSingle();
  if (error && !error.message.toLowerCase().includes('meet_email')) {
    console.error('Unable to read optional Meet email', { userId: profile.id, message: error.message, code: error.code });
  }
  return data?.meet_email?.trim() || profile.email?.trim() || authEmail?.trim() || '';
}

export async function requireCourseTeacher(req: Request, courseId: string) {
  const context = await caller(req);
  if (context.profile.role !== 'teacher') throw new Error('Acces professeur requis.');
  if (context.profile.is_blocked || ['blocked', 'suspended'].includes(context.profile.verification_status ?? '')) {
    throw new Error('Votre compte professeur ne peut pas programmer de session.');
  }
  const { data: course } = await context.client.from('courses').select('id,title,teacher_id').eq('id', courseId).single();
  if (!course || course.teacher_id !== context.profile.id) throw new Error('Cours introuvable ou non autorise.');
  return { ...context, course };
}

export async function requireSessionOwner(req: Request, sessionId: string) {
  const context = await caller(req);
  const { data: session } = await context.client.from('course_live_sessions').select('*, courses:course_id(title)').eq('id', sessionId).single();
  if (!session) throw new Error('Session introuvable.');
  if (session.deleted_at || session.status === 'deleted') throw new Error('Cette session est supprimée.');
  const allowed = context.profile.role === 'admin' || (context.profile.role === 'teacher' && session.teacher_id === context.profile.id);
  if (!allowed) throw new Error('Action non autorisee.');
  return { ...context, session };
}

type GoogleDiagnostic = {
  googleStatusCode?: number | null;
  googleErrorMessage?: string | null;
  missingScopes?: boolean;
  previewUnsupported?: boolean;
  attemptedMethod?: string | null;
  attemptedEndpoint?: string | null;
};

class GoogleIntegrationError extends Error {
  googleStatusCode: number | null;
  googleErrorMessage: string | null;
  missingScopes: boolean;
  previewUnsupported: boolean;

  constructor(message: string, diagnostic: GoogleDiagnostic = {}) {
    super(message);
    this.name = 'GoogleIntegrationError';
    this.googleStatusCode = diagnostic.googleStatusCode ?? null;
    this.googleErrorMessage = diagnostic.googleErrorMessage ?? null;
    this.missingScopes = diagnostic.missingScopes ?? false;
    this.previewUnsupported = diagnostic.previewUnsupported ?? false;
  }
}

function googleApiMessage(body: Record<string, unknown>) {
  const error = body.error as { message?: string; status?: string; error_description?: string } | string | undefined;
  if (typeof error === 'string') return error;
  return error?.message || error?.error_description || String(body.error_description ?? '') || null;
}

function googleDiagnostic(statusCode: number, body: Record<string, unknown>) {
  const message = googleApiMessage(body) ?? `Google API returned ${statusCode}.`;
  const content = `${message} ${JSON.stringify(body)}`.toLowerCase();
  return {
    googleStatusCode: statusCode,
    googleErrorMessage: message,
    missingScopes: content.includes('insufficient_scope') || content.includes('insufficient authentication scopes'),
    previewUnsupported: statusCode === 501 || (statusCode === 403 && (
      content.includes('permission denied')
      || content.includes('permission_denied')
      || content.includes('developer preview')
      || content.includes('not enrolled')
    )),
  };
}

function safeCohostReason(
  diagnostic: GoogleDiagnostic,
  fallback: string,
) {
  if (diagnostic.missingScopes) return 'Scopes Google Meet manquants. Regénérez GOOGLE_REFRESH_TOKEN avec les scopes Meet requis.';
  if (diagnostic.previewUnsupported) return 'Permission Google Meet refusée. La fonctionnalité co-host Developer Preview ou les permissions Workspace ne sont pas disponibles.';
  if (diagnostic.googleStatusCode === 404) return "Espace Google Meet introuvable. Le Meet n'a pas pu être résolu depuis l'événement Calendar.";
  if (diagnostic.googleStatusCode === 401) return 'Authentification OAuth Google refusée. Vérifiez le client OAuth et le refresh token.';
  return fallback;
}

export async function googleToken() {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');
  if (!clientId || !clientSecret || !refreshToken) throw new Error("L'integration Google Meet n'est pas configuree.");
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const oauthCode = String(data?.error ?? '');
    const diagnostic = googleDiagnostic(response.status, data);
    const oauthProblem = ['invalid_grant', 'unauthorized_client'].includes(oauthCode);
    console.error('Google OAuth token refresh failed', {
      status: response.status,
      code: oauthCode,
      message: diagnostic.googleErrorMessage,
    });
    throw new GoogleIntegrationError(
      oauthProblem
        ? 'Authentification OAuth Google refusée. Vérifiez le client OAuth et le refresh token.'
        : 'Impossible de se connecter à Google Calendar.',
      diagnostic,
    );
  }
  return data.access_token as string;
}

export async function googleEvent(method: 'POST' | 'PATCH' | 'DELETE', eventId: string | null, body?: unknown, calendarOverride?: string | null) {
  const calendarId = calendarOverride || Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!calendarId) throw new Error("L'integration Google Meet n'est pas configuree.");
  const token = await googleToken();
  const calendar = encodeURIComponent(calendarId);
  const suffix = eventId ? `/${encodeURIComponent(eventId)}` : '';
  const params = method === 'DELETE' ? '?sendUpdates=all' : '?conferenceDataVersion=1&sendUpdates=all';
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendar}/events${suffix}${params}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const responseBody = await response.text();
    console.error('Google Calendar error', { method, eventId, status: response.status, responseBody });
    if (response.status === 404 && eventId) throw new Error("L'événement Google Calendar est introuvable.");
    if (method === 'DELETE') throw new Error("Impossible de supprimer l'événement Google Calendar.");
    throw new Error('Impossible de creer ou modifier la session Google Meet.');
  }
  return method === 'DELETE' ? null : await response.json();
}

export function eventPayload(input: { title: string; description?: string; startsAt: string; endsAt: string; timezone: string; courseTitle: string; teacherName: string; teacherEmail?: string; attendees?: CalendarAttendee[] }, includeConference = false) {
  const attendees = [
    ...(input.teacherEmail ? [{ email: input.teacherEmail, ...(input.teacherName ? { displayName: input.teacherName } : {}) }] : []),
    ...(input.attendees ?? []),
  ].filter((attendee, index, all) => all.findIndex((candidate) => candidate.email.toLowerCase() === attendee.email.toLowerCase()) === index);
  return {
    summary: input.title,
    description: `${input.description ?? ''}\n\nCours : ${input.courseTitle}\nProf : ${input.teacherName}\nPlateforme : sosprof.tn`.trim(),
    start: { dateTime: input.startsAt, timeZone: input.timezone },
    end: { dateTime: input.endsAt, timeZone: input.timezone },
    ...(attendees.length ? { attendees } : {}),
    ...(includeConference ? { conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}),
  };
}

type NotifiableSession = { id: string; course_id: string; teacher_id: string };
type LiveNotificationData = Record<string, string | number | boolean | null | undefined>;

type CalendarAttendee = { email: string; displayName?: string };
type MeetSpaceResult = {
  meetCode?: string | null;
  spaceName?: string;
  conferenceRecord?: string;
  status?: 'failed' | 'unsupported';
  error?: string;
  assignedAt?: string;
} & GoogleDiagnostic;
type CohostResult = {
  status: 'assigned' | 'failed' | 'unsupported';
  assignedAt?: string;
  error?: string;
} & GoogleDiagnostic;
type MeetSpaceConfigurationResult = {
  spaceConfigStatus: 'configured' | 'failed' | 'unsupported';
  spaceConfigError?: string | null;
  artifactConfigStatus: 'unsupported';
  artifactConfigError: string;
  payload?: Record<string, unknown> | null;
};

const requiredMeetCohostScopes = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.settings',
  'https://www.googleapis.com/auth/meetings.space.readonly',
];

async function missingMeetCohostScopes(accessToken: string) {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Unable to inspect Google Meet OAuth scopes', {
        status: response.status,
        message: googleApiMessage(body),
      });
      return null;
    }
    const granted = new Set(String(body.scope ?? '').split(/\s+/).filter(Boolean));
    return requiredMeetCohostScopes.filter((scope) => !granted.has(scope));
  } catch (error) {
    console.error('Unable to inspect Google Meet OAuth scopes', {
      message: error instanceof Error ? error.message : 'Unknown scope inspection error.',
    });
    return null;
  }
}

export async function configureMeetSpaceForCoHosts(input: { sessionId: string; spaceName: string }): Promise<MeetSpaceConfigurationResult> {
  const updateMask = 'config.moderation';
  const url = `https://meet.googleapis.com/v2/${input.spaceName}?updateMask=${encodeURIComponent(updateMask)}`;
  const artifactConfigError = "L'API Google Meet expose artifactConfig pour la génération automatique d'artefacts, mais pas le partage Calendar des artefacts avec les co-hosts.";
  console.log('Configuring Meet space for co-hosts', {
    sessionId: input.sessionId,
    spaceName: input.spaceName,
    updateMask,
  });
  try {
    const token = await googleToken();
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.spaceName,
        config: { moderation: 'ON' },
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const diagnostic = googleDiagnostic(response.status, body);
      console.error('Meet space configuration failed', {
        status: response.status,
        responseBody: body,
      });
      return {
        spaceConfigStatus: [404, 501].includes(response.status) ? 'unsupported' : 'failed',
        spaceConfigError: safeCohostReason(diagnostic, diagnostic.googleErrorMessage ?? `Google Meet spaces.patch returned ${response.status}.`),
        artifactConfigStatus: 'unsupported',
        artifactConfigError,
        payload: body,
      };
    }
    return {
      spaceConfigStatus: 'configured',
      spaceConfigError: null,
      artifactConfigStatus: 'unsupported',
      artifactConfigError,
      payload: body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de configurer Host Management.';
    console.error('Meet space configuration failed', { status: null, responseBody: message });
    return {
      spaceConfigStatus: 'failed',
      spaceConfigError: message,
      artifactConfigStatus: 'unsupported',
      artifactConfigError,
      payload: null,
    };
  }
}

export async function approvedStudentAttendees(client: ReturnType<typeof adminClient>, courseId: string) {
  const { data, error } = await client
    .from('course_enrollments')
    .select('student_id, student:profiles!course_enrollments_student_id_fkey(email,full_name)')
    .eq('course_id', courseId)
    .eq('status', 'approved');
  if (error) {
    console.error('Unable to load approved student attendees', { courseId, message: error.message, code: error.code });
    throw new Error('Impossible de charger les etudiants approuves pour les invitations Calendar.');
  }
  return (data ?? []).flatMap((item) => {
    const profile = Array.isArray(item.student) ? item.student[0] : item.student;
    return profile?.email ? [{ email: profile.email, ...(profile.full_name ? { displayName: profile.full_name } : {}) }] : [];
  });
}

export function meetingCodeFromUri(meetingUrl?: string | null) {
  return meetingUrl?.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i)?.[1] ?? null;
}

export async function resolveMeetSpaceFromCalendarEvent(event: {
  hangoutLink?: string;
  conferenceData?: { conferenceId?: string; entryPoints?: Array<{ entryPointType: string; uri: string }> };
}): Promise<MeetSpaceResult> {
  const meetingUri = event.hangoutLink
    || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri;
  const meetCode = meetingCodeFromUri(meetingUri) || event.conferenceData?.conferenceId || null;
  if (!meetCode) {
    return {
      status: 'unsupported' as const,
      error: "Espace Google Meet introuvable dans l'événement Calendar.",
      previewUnsupported: false,
    };
  }
  try {
    const token = await googleToken();
    const res = await fetch(`https://meet.googleapis.com/v2/spaces/${encodeURIComponent(meetCode)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.name) {
      const diagnostic = googleDiagnostic(res.status, body);
      return {
        meetCode,
        status: 'unsupported' as const,
        error: safeCohostReason(diagnostic, `Espace Google Meet indisponible (${res.status}).`),
        ...diagnostic,
      };
    }
    return {
      meetCode,
      spaceName: body.name as string,
      conferenceRecord: body.activeConference?.conferenceRecord as string | undefined,
    };
  } catch (error) {
    const diagnostic = error instanceof GoogleIntegrationError ? error : null;
    return {
      meetCode,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : "Impossible de résoudre l'espace Google Meet.",
      googleStatusCode: diagnostic?.googleStatusCode ?? null,
      googleErrorMessage: diagnostic?.googleErrorMessage ?? null,
      missingScopes: diagnostic?.missingScopes ?? false,
      previewUnsupported: diagnostic?.previewUnsupported ?? false,
    };
  }
}

export async function assignTeacherAsMeetCoHost(input: { sessionId: string; spaceName?: string; teacherEmail: string }): Promise<CohostResult> {
  if (!input.spaceName) {
    return {
      status: 'unsupported' as const,
      error: "Espace Google Meet introuvable. Le co-host ne peut pas être configuré.",
      previewUnsupported: false,
    };
  }
  const method = 'POST';
  const url = `https://meet.googleapis.com/v2beta/${input.spaceName}/members`;
  console.log('Assigning teacher as Meet co-host', {
    sessionId: input.sessionId,
    spaceName: input.spaceName,
    teacherEmail: input.teacherEmail,
  });
  try {
    const token = await googleToken();
    const missingScopes = await missingMeetCohostScopes(token);
    if (missingScopes?.length) {
      const message = `Scopes Google Meet manquants : ${missingScopes.join(', ')}. Regénérez GOOGLE_REFRESH_TOKEN avec les scopes Meet requis.`;
      console.error('Meet co-host OAuth scopes missing', { missingScopes });
      return {
        status: 'failed' as const,
        error: message,
        googleErrorMessage: message,
        missingScopes: true,
        previewUnsupported: false,
        attemptedMethod: null,
        attemptedEndpoint: null,
      };
    }
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.teacherEmail, role: 'COHOST' }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const diagnostic = googleDiagnostic(res.status, body);
      const methodNotFound = res.status === 404 && (diagnostic.googleErrorMessage ?? '').toLowerCase().includes('method not found');
      const endpointUnavailable = res.status === 501 || methodNotFound;
      const unsupported = [403, 404, 501].includes(res.status);
      const failureReason = methodNotFound
        ? 'Google Meet spaces.members v2beta endpoint requires Developer Preview access or is not enabled for this Workspace/project.'
        : safeCohostReason(diagnostic, diagnostic.googleErrorMessage ?? `Google Meet members API returned ${res.status}.`);
      console.error('Meet co-host API failed', {
        status: res.status,
        statusText: res.statusText,
        responseBody: body,
      });
      return {
        status: unsupported ? 'unsupported' as const : 'failed' as const,
        error: failureReason,
        ...diagnostic,
        previewUnsupported: diagnostic.previewUnsupported || endpointUnavailable,
        attemptedMethod: method,
        attemptedEndpoint: url,
      };
    }
    return {
      status: 'assigned' as const,
      assignedAt: new Date().toISOString(),
      attemptedMethod: method,
      attemptedEndpoint: url,
    };
  } catch (error) {
    const diagnostic = error instanceof GoogleIntegrationError ? error : null;
    const message = error instanceof Error ? error.message : 'Impossible de configurer le co-host Google Meet.';
    console.error('Google Meet co-host assignment failed', {
      sessionId: input.sessionId,
      teacherEmail: input.teacherEmail,
      message,
      status: diagnostic?.googleStatusCode ?? null,
    });
    return {
      status: 'failed' as const,
      error: message,
      googleStatusCode: diagnostic?.googleStatusCode ?? null,
      googleErrorMessage: diagnostic?.googleErrorMessage ?? null,
      missingScopes: diagnostic?.missingScopes ?? false,
      previewUnsupported: diagnostic?.previewUnsupported ?? false,
      attemptedMethod: method,
      attemptedEndpoint: url,
    };
  }
}

function liveNotificationLogType(type: string) {
  if (type === 'live_session_created') return 'scheduled';
  if (type === 'live_session_postponed' || type === 'live_session_updated') return 'updated';
  if (type === 'live_session_cancelled' || type === 'live_session_deleted') return 'cancelled';
  if (type === 'live_session_recording_added') return 'recording_available';
  return null;
}

export async function notifyApprovedStudents(
  client: ReturnType<typeof adminClient>,
  session: NotifiableSession,
  type: string,
  title: string,
  message: string,
  data: LiveNotificationData = {},
  eventKey = `${type}:${session.id}:${message}`,
) {
  const { data: enrollments } = await client.from('course_enrollments').select('student_id').eq('course_id', session.course_id).eq('status', 'approved');
  if (!enrollments?.length) return;
  const rows = enrollments.map((item) => ({
    user_id: item.student_id, actor_id: session.teacher_id, type, title, message,
    target_type: 'course_live_session', target_id: session.id, target_url: `/courses/${session.course_id}/learn`,
    data: { courseId: session.course_id, sessionId: session.id, meetingProvider: 'google_meet', ...data },
    dedupe_key: `${eventKey}:${item.student_id}`,
  }));
  const { error } = await client.from('notifications').upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true });
  if (error) console.error('Live session notification insert failed', error);
  const notificationType = liveNotificationLogType(type);
  if (notificationType) {
    const logRows = enrollments.map((item) => ({
      live_session_id: session.id,
      student_id: item.student_id,
      notification_type: notificationType,
    }));
    const { error: logError } = await client
      .from('live_session_notifications')
      .upsert(logRows, { onConflict: 'live_session_id,student_id,notification_type', ignoreDuplicates: true });
    if (logError) console.error('Live session delivery log insert failed', logError);
  }
}
