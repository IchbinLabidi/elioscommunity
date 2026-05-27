import { approvedStudentAttendees, assignTeacherAsMeetCoHost, configureMeetSpaceForCoHosts, corsHeaders, eventPayload, googleEvent, json, notifyApprovedStudents, preferredMeetEmail, requireSessionOwner, resolveMeetSpaceFromCalendarEvent } from '../_shared/live-sessions.ts';

function displayDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('fr-TN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

function meetingUrl(event: { hangoutLink?: string; conferenceData?: { entryPoints?: Array<{ entryPointType: string; uri: string }> } }) {
  return event.hangoutLink || event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = await req.json();
    if (!input.sessionId || !input.newStartsAt || !input.newEndsAt) {
      throw new Error('La session et les nouvelles dates sont requises.');
    }
    const newStartsAt = new Date(input.newStartsAt);
    const newEndsAt = new Date(input.newEndsAt);
    if (Number.isNaN(newStartsAt.getTime()) || Number.isNaN(newEndsAt.getTime())) {
      throw new Error('Dates de report invalides.');
    }
    if (newEndsAt <= newStartsAt) throw new Error("L'heure de fin doit suivre l'heure de début.");

    const { client, profile, session } = await requireSessionOwner(req, input.sessionId);
    if (session.deleted_at || session.status === 'deleted') throw new Error('Une session supprimée ne peut pas être reportée.');
    const cancelled = session.is_cancelled === true || session.status === 'cancelled';
    const completed = !cancelled && new Date(session.ends_at).getTime() < Date.now();
    if (cancelled && input.reactivate !== true) {
      throw new Error('Confirmez la réactivation pour reporter cette session annulée.');
    }
    if (completed && input.confirmCompleted !== true) {
      throw new Error('Confirmez la reprogrammation de cette session terminée.');
    }
    const timezone = input.timezone || session.timezone || 'Africa/Tunis';
    let calendarEvent;
    let recreatedCalendarEvent = false;
    if (session.google_event_id) {
      try {
        calendarEvent = await googleEvent('PATCH', session.google_event_id, {
          start: { dateTime: input.newStartsAt, timeZone: timezone },
          end: { dateTime: input.newEndsAt, timeZone: timezone },
        });
      } catch (error) {
        const missingEvent = error instanceof Error && error.message.includes('introuvable');
        if (!(cancelled && input.reactivate === true && missingEvent)) throw error;
      }
    } else if (!(cancelled && input.reactivate === true)) {
      throw new Error("L'événement Google Calendar est introuvable.");
    }

    const { data: teacherProfile } = await client
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', session.teacher_id)
      .maybeSingle();
    const teacherEmail = teacherProfile ? await preferredMeetEmail(client, teacherProfile, null) : '';

    if (!calendarEvent) {
      if (!teacherProfile || !teacherEmail) throw new Error("Adresse email du professeur introuvable pour recréer la session.");
      const studentAttendees = await approvedStudentAttendees(client, session.course_id);
      calendarEvent = await googleEvent('POST', null, eventPayload({
        title: session.title,
        description: session.description ?? undefined,
        startsAt: input.newStartsAt,
        endsAt: input.newEndsAt,
        timezone,
        courseTitle: session.courses?.title ?? 'Cours sosprof.tn',
        teacherName: teacherProfile.full_name,
        teacherEmail,
        attendees: studentAttendees,
      }, true));
      if (!meetingUrl(calendarEvent)) throw new Error('Impossible de recréer le lien Google Meet.');
      recreatedCalendarEvent = true;
    }

    const now = new Date().toISOString();
    const derivedStatus = newStartsAt.getTime() <= Date.now() && newEndsAt.getTime() >= Date.now()
      ? 'live'
      : newEndsAt.getTime() < Date.now() ? 'completed' : 'scheduled';
    const cohostUpdate: Record<string, unknown> = {};

    const resolvedSpace = recreatedCalendarEvent ? await resolveMeetSpaceFromCalendarEvent(calendarEvent) : null;
    const currentSpaceName = resolvedSpace?.spaceName ?? session.google_meet_space_name;
    if ((recreatedCalendarEvent || session.teacher_cohost_status !== 'assigned') && currentSpaceName && teacherEmail) {
          const configuration = await configureMeetSpaceForCoHosts({ sessionId: session.id, spaceName: currentSpaceName });
          const cohost = configuration.spaceConfigStatus === 'configured'
            ? await assignTeacherAsMeetCoHost({ sessionId: session.id, spaceName: currentSpaceName, teacherEmail })
            : null;
          Object.assign(cohostUpdate, {
            meet_space_config_status: configuration.spaceConfigStatus,
            meet_space_config_error: configuration.spaceConfigError ?? null,
            meet_artifact_config_status: configuration.artifactConfigStatus,
            meet_artifact_config_error: configuration.artifactConfigError,
            google_meet_config_payload: configuration.payload ?? null,
            ...(cohost ? {
              teacher_cohost_email: teacherEmail,
              teacher_cohost_status: cohost.status,
              teacher_cohost_error: cohost.error ?? null,
              teacher_cohost_assigned_at: cohost.assignedAt ?? null,
              teacher_cohost_google_status_code: cohost.googleStatusCode ?? null,
              teacher_cohost_google_message: cohost.googleErrorMessage ?? null,
              teacher_cohost_missing_scopes: cohost.missingScopes ?? false,
              teacher_cohost_preview_unsupported: cohost.previewUnsupported ?? false,
              teacher_cohost_attempted_method: cohost.attemptedMethod ?? null,
              teacher_cohost_attempted_endpoint: cohost.attemptedEndpoint ?? null,
            } : {}),
          });
    }

    const { data: updated, error } = await client
      .from('course_live_sessions')
      .update({
        starts_at: input.newStartsAt,
        ends_at: input.newEndsAt,
        timezone,
        status: derivedStatus,
        is_cancelled: false,
        cancelled_reason: null,
        cancelled_at: null,
        postponed_at: now,
        postponed_by: profile.id,
        previous_starts_at: session.starts_at,
        previous_ends_at: session.ends_at,
        postpone_reason: input.reason?.trim() || null,
        postpone_count: Number(session.postpone_count ?? 0) + 1,
        updated_by: profile.id,
        updated_at: now,
        ...(recreatedCalendarEvent ? {
          meeting_url: meetingUrl(calendarEvent),
          google_event_id: calendarEvent.id,
          google_calendar_id: Deno.env.get('GOOGLE_CALENDAR_ID') ?? session.google_calendar_id,
          google_conference_id: calendarEvent.conferenceData?.conferenceId ?? null,
          google_html_link: calendarEvent.htmlLink ?? null,
          google_payload: calendarEvent,
          google_meet_space_name: resolvedSpace?.spaceName ?? null,
          google_meet_conference_record: resolvedSpace?.conferenceRecord ?? null,
        } : {}),
        ...cohostUpdate,
      })
      .eq('id', session.id)
      .select('*')
      .single();
    if (error) throw error;

    const { error: historyError } = await client.from('live_session_history').insert({
      session_id: session.id,
      action: 'postponed',
      actor_id: profile.id,
      old_starts_at: session.starts_at,
      old_ends_at: session.ends_at,
      new_starts_at: input.newStartsAt,
      new_ends_at: input.newEndsAt,
      reason: input.reason?.trim() || null,
    });
    if (historyError) {
      console.error('Live session postpone history insert failed', {
        sessionId: session.id,
        actorId: profile.id,
        message: historyError.message,
        code: historyError.code,
      });
    }

    const reasonText = input.reason?.trim() ? ` Raison : ${input.reason.trim()}` : '';
    await notifyApprovedStudents(
      client,
      updated,
      'live_session_postponed',
      'Session live reportée',
      `La session « ${session.title} » du cours « ${session.courses?.title ?? ''} » est reportée au ${displayDate(input.newStartsAt, timezone)}.${reasonText}`,
      { startsAt: input.newStartsAt },
      `live_session_postponed:${updated.id}:${updated.postpone_count ?? updated.updated_at}`,
    );
    console.info('Live session postponed', { sessionId: session.id, actorId: profile.id, newStartsAt: input.newStartsAt });
    return json(updated);
  } catch (error) {
    console.error('report-google-meet-session', {
      message: error instanceof Error ? error.message : 'Unable to postpone live session.',
    });
    return json({ error: error instanceof Error ? error.message : 'Impossible de reporter la session.' }, 400);
  }
});
