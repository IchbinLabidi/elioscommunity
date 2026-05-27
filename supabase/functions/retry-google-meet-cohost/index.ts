import { assignTeacherAsMeetCoHost, configureMeetSpaceForCoHosts, corsHeaders, json, preferredMeetEmail, requireSessionOwner, resolveMeetSpaceFromCalendarEvent } from '../_shared/live-sessions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error('Session requise.');
    const { client, profile, authUser, session } = await requireSessionOwner(req, sessionId);
    const { data: teacherProfile } = await client
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', session.teacher_id)
      .single();
    if (!teacherProfile) throw new Error('Profil professeur introuvable.');
    const teacherEmail = await preferredMeetEmail(
      client,
      teacherProfile,
      profile.id === session.teacher_id ? authUser.email : null,
    );
    if (!teacherEmail) throw new Error('Adresse Google du professeur introuvable.');

    const resolved = session.google_meet_space_name
      ? {
        spaceName: session.google_meet_space_name,
        conferenceRecord: session.google_meet_conference_record,
        status: undefined,
        error: undefined,
        googleStatusCode: null,
        googleErrorMessage: null,
        missingScopes: false,
        previewUnsupported: false,
      }
      : await resolveMeetSpaceFromCalendarEvent(session.google_payload ?? { hangoutLink: session.meeting_url });
    const spaceConfiguration = resolved.spaceName
      ? await configureMeetSpaceForCoHosts({ sessionId: session.id, spaceName: resolved.spaceName })
      : {
        spaceConfigStatus: 'unsupported' as const,
        spaceConfigError: resolved.error ?? 'Espace Google Meet introuvable pour activer Host Management.',
        artifactConfigStatus: 'unsupported' as const,
        artifactConfigError: "Le partage des artefacts avec les co-hosts n'est pas exposé par l'API Google Meet.",
        payload: null,
      };
    const result = resolved.spaceName && spaceConfiguration.spaceConfigStatus === 'configured'
      ? await assignTeacherAsMeetCoHost({
          sessionId: session.id,
          spaceName: resolved.spaceName,
          teacherEmail,
      })
      : {
        status: spaceConfiguration.spaceConfigStatus === 'unsupported' ? 'unsupported' as const : 'failed' as const,
        assignedAt: undefined,
        error: "Host Management n'a pas pu être activé automatiquement ; l'attribution co-host n'a pas été tentée.",
        googleStatusCode: resolved.googleStatusCode ?? null,
        googleErrorMessage: resolved.googleErrorMessage ?? null,
        missingScopes: resolved.missingScopes ?? false,
        previewUnsupported: resolved.previewUnsupported ?? false,
        attemptedMethod: null,
        attemptedEndpoint: null,
      };
    const { data: updated, error } = await client
      .from('course_live_sessions')
      .update({
        google_meet_space_name: resolved.spaceName ?? session.google_meet_space_name ?? null,
        google_meet_conference_record: resolved.conferenceRecord ?? session.google_meet_conference_record ?? null,
        teacher_cohost_email: teacherEmail,
        teacher_cohost_status: result.status,
        teacher_cohost_error: result.error ?? null,
        teacher_cohost_assigned_at: result.assignedAt ?? null,
        teacher_cohost_google_status_code: result.googleStatusCode ?? null,
        teacher_cohost_google_message: result.googleErrorMessage ?? null,
        teacher_cohost_missing_scopes: result.missingScopes ?? false,
        teacher_cohost_preview_unsupported: result.previewUnsupported ?? false,
        teacher_cohost_attempted_method: result.attemptedMethod ?? null,
        teacher_cohost_attempted_endpoint: result.attemptedEndpoint ?? null,
        meet_space_config_status: spaceConfiguration.spaceConfigStatus,
        meet_space_config_error: spaceConfiguration.spaceConfigError ?? null,
        meet_artifact_config_status: spaceConfiguration.artifactConfigStatus,
        meet_artifact_config_error: spaceConfiguration.artifactConfigError,
        google_meet_config_payload: spaceConfiguration.payload ?? null,
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select('*')
      .single();
    if (error) throw error;
    return json(updated);
  } catch (error) {
    console.error('retry-google-meet-cohost', {
      message: error instanceof Error ? error.message : 'Unable to retry co-host assignment.',
    });
    return json({ error: error instanceof Error ? error.message : 'Impossible de réessayer la configuration co-host.' }, 400);
  }
});
