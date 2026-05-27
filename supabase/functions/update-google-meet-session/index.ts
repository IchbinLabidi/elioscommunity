import { approvedStudentAttendees, assignTeacherAsMeetCoHost, configureMeetSpaceForCoHosts, corsHeaders, eventPayload, googleEvent, json, notifyApprovedStudents, preferredMeetEmail, requireSessionOwner, resolveMeetSpaceFromCalendarEvent } from '../_shared/live-sessions.ts';

function meetingUrl(event: { hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> } }) {
  return event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { sessionId, title: newTitle, description: newDescription, startsAt: newStartsAt, endsAt: newEndsAt, timezone: newTimezone, reactivate: requestReactivate } = await req.json();
    if (!sessionId) throw new Error('Session requise.');
    const { client, profile, authUser, session } = await requireSessionOwner(req, sessionId);
    const startsAt = newStartsAt || session.starts_at;
    const endsAt = newEndsAt || session.ends_at;
    if (new Date(endsAt) <= new Date(startsAt)) throw new Error("L'heure de fin doit suivre l'heure de début.");

    const title = newTitle?.trim() || session.title;
    const description = newDescription ?? session.description;
    const timezone = newTimezone || session.timezone;
    const reactivate = requestReactivate === true;
    const wasCancelled = session.is_cancelled === true || session.status === 'cancelled';
    const { data: teacherProfile } = await client
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', session.teacher_id)
      .single();
    const teacherName = teacherProfile?.full_name ?? profile.full_name;
    const teacherEmail = teacherProfile
      ? await preferredMeetEmail(client, teacherProfile, profile.id === session.teacher_id ? authUser.email : null)
      : '';
    const studentAttendees = await approvedStudentAttendees(client, session.course_id);
    const baseUpdate = {
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    };

    if (wasCancelled && !reactivate) {
      console.info('Keeping cancelled live session while saving edits', { sessionId: session.id, teacherId: profile.id });
      const { data: updated, error } = await client
        .from('course_live_sessions')
        .update(baseUpdate)
        .eq('id', session.id)
        .select('*')
        .single();
      if (error) throw error;
      return json(updated);
    }

    const calendarPayload = eventPayload({
      title,
      description,
      startsAt,
      endsAt,
      timezone,
      courseTitle: session.courses?.title ?? 'Cours sosprof.tn',
      teacherName,
      teacherEmail,
      attendees: studentAttendees,
    });

    let event;
    if (session.google_event_id) {
      try {
        event = await googleEvent('PATCH', session.google_event_id, calendarPayload);
      } catch (error) {
        if (!reactivate) throw error;
        console.error('Google event patch failed during reactivation; creating replacement event', {
          sessionId: session.id,
          googleEventId: session.google_event_id,
          message: error instanceof Error ? error.message : 'Unknown Google Calendar error',
        });
        event = await googleEvent('POST', null, eventPayload({
          title,
          description,
          startsAt,
          endsAt,
          timezone,
          courseTitle: session.courses?.title ?? 'Cours sosprof.tn',
          teacherName,
          teacherEmail,
          attendees: studentAttendees,
        }, true));
      }
    } else if (reactivate) {
      event = await googleEvent('POST', null, eventPayload({
        title,
        description,
        startsAt,
        endsAt,
        timezone,
        courseTitle: session.courses?.title ?? 'Cours sosprof.tn',
        teacherName,
        teacherEmail,
        attendees: studentAttendees,
      }, true));
    } else {
      throw new Error('Événement Google Calendar introuvable pour cette session.');
    }

    const resolvedMeetingUrl = meetingUrl(event) || session.meeting_url;
    if (reactivate && !resolvedMeetingUrl) throw new Error('Impossible de recréer le lien Google Meet.');

    const resolvedSpace = await resolveMeetSpaceFromCalendarEvent(event);
    const methodUnavailable = session.teacher_cohost_status === 'unsupported'
      && session.teacher_cohost_google_status_code === 404
      && /method not found/i.test(`${session.teacher_cohost_google_message ?? ''} ${session.teacher_cohost_error ?? ''}`);
    const retryCohost = !methodUnavailable
      && (session.teacher_cohost_status !== 'assigned' || session.teacher_cohost_email !== teacherEmail);
    const cohostSpaceName = resolvedSpace.spaceName ?? session.google_meet_space_name;
    const spaceConfiguration = retryCohost && cohostSpaceName
      ? await configureMeetSpaceForCoHosts({ sessionId: session.id, spaceName: cohostSpaceName })
      : null;
    const cohostResult = retryCohost && teacherEmail
      ? cohostSpaceName && spaceConfiguration?.spaceConfigStatus === 'configured'
        ? await assignTeacherAsMeetCoHost({ sessionId: session.id, spaceName: cohostSpaceName, teacherEmail })
        : {
          status: spaceConfiguration?.spaceConfigStatus === 'failed' ? 'failed' as const : 'unsupported' as const,
          assignedAt: undefined,
          error: "Host Management n'a pas pu être activé automatiquement ; l'attribution co-host n'a pas été tentée.",
          googleStatusCode: resolvedSpace.googleStatusCode ?? null,
          googleErrorMessage: resolvedSpace.googleErrorMessage ?? null,
          missingScopes: resolvedSpace.missingScopes ?? false,
          previewUnsupported: resolvedSpace.previewUnsupported ?? false,
          attemptedMethod: null,
          attemptedEndpoint: null,
        }
      : null;
    const { data: updated, error } = await client
      .from('course_live_sessions')
      .update({
        ...baseUpdate,
        meeting_url: resolvedMeetingUrl,
        google_event_id: event.id ?? session.google_event_id,
        google_calendar_id: Deno.env.get('GOOGLE_CALENDAR_ID') ?? session.google_calendar_id,
        google_conference_id: event.conferenceData?.conferenceId ?? session.google_conference_id,
        google_html_link: event.htmlLink,
        google_payload: event,
        google_meet_space_name: resolvedSpace.spaceName ?? session.google_meet_space_name ?? null,
        google_meet_conference_record: resolvedSpace.conferenceRecord ?? session.google_meet_conference_record ?? null,
        teacher_cohost_email: teacherEmail || session.teacher_cohost_email || null,
        ...(cohostResult ? {
          teacher_cohost_status: cohostResult.status,
          teacher_cohost_error: cohostResult.error ?? null,
          teacher_cohost_assigned_at: cohostResult.assignedAt ?? null,
          teacher_cohost_google_status_code: cohostResult.googleStatusCode ?? null,
          teacher_cohost_google_message: cohostResult.googleErrorMessage ?? null,
          teacher_cohost_missing_scopes: cohostResult.missingScopes ?? false,
          teacher_cohost_preview_unsupported: cohostResult.previewUnsupported ?? false,
          teacher_cohost_attempted_method: cohostResult.attemptedMethod ?? null,
          teacher_cohost_attempted_endpoint: cohostResult.attemptedEndpoint ?? null,
        } : {}),
        ...(spaceConfiguration ? {
          meet_space_config_status: spaceConfiguration.spaceConfigStatus,
          meet_space_config_error: spaceConfiguration.spaceConfigError ?? null,
          meet_artifact_config_status: spaceConfiguration.artifactConfigStatus,
          meet_artifact_config_error: spaceConfiguration.artifactConfigError,
          google_meet_config_payload: spaceConfiguration.payload ?? null,
        } : {}),
        ...(reactivate ? {
          status: 'scheduled',
          is_cancelled: false,
          cancelled_reason: null,
          cancelled_at: null,
        } : {}),
      })
      .eq('id', session.id)
      .select('*')
      .single();
    if (error) throw error;

    if (reactivate) {
      if (updated.is_cancelled === true || updated.status !== 'scheduled') {
        throw new Error('La session n’a pas été reprogrammée correctement.');
      }
      console.info('Reactivated live session', { sessionId: session.id, teacherId: profile.id, status: updated.status });
      await notifyApprovedStudents(
        client,
        updated,
        'live_session_updated',
        'Session live reprogrammée',
        `Une session live du cours ${session.courses?.title ?? ''} a été reprogrammée.`,
        { startsAt: updated.starts_at },
        `live_session_updated:${updated.id}:${updated.updated_at}`,
      );
    } else {
      await notifyApprovedStudents(
        client,
        updated,
        'live_session_updated',
        'Session live mise à jour',
        `La session live du cours ${session.courses?.title ?? ''} a été mise à jour.`,
        { startsAt: updated.starts_at },
        `live_session_updated:${updated.id}:${updated.updated_at}`,
      );
    }
    return json(updated);
  } catch (error) {
    console.error('update-google-meet-session', error);
    return json({ error: error instanceof Error ? error.message : 'Impossible de mettre à jour la session.' }, 400);
  }
});
