import { approvedStudentAttendees, assignTeacherAsMeetCoHost, configureMeetSpaceForCoHosts, corsHeaders, eventPayload, googleEvent, json, notifyApprovedStudents, preferredMeetEmail, requireCourseTeacher, resolveMeetSpaceFromCalendarEvent } from '../_shared/live-sessions.ts';

type Occurrence = { startsAt: string; endsAt: string; occurrenceIndex: number; weekday?: string; hour?: number; minute?: number; biweekly?: boolean };
type RecurrenceType = 'single' | 'daily' | 'weekly' | 'multiple_weekdays' | 'custom';

function displayDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat('fr-TN', { dateStyle: 'long', timeStyle: 'short', timeZone: timezone }).format(new Date(value));
}

function validatedOccurrences(input: Record<string, unknown>) {
  const recurrence = input.recurrence as { type?: RecurrenceType; durationMinutes?: number; occurrences?: Occurrence[] } | undefined;
  const type = recurrence?.type ?? 'single';
  const recurrenceStartsAt = type === 'single' ? null : new Date(String(input.startsAt ?? ''));
  const supplied = type === 'single'
    ? [{ startsAt: String(input.startsAt ?? ''), endsAt: String(input.endsAt ?? ''), occurrenceIndex: 1 }]
    : recurrence?.occurrences ?? [];
  if (!['single', 'daily', 'weekly', 'multiple_weekdays', 'custom'].includes(type)) throw new Error('Type de récurrence invalide.');
  if (!supplied.length || supplied.length > 30) throw new Error('Une série doit contenir entre 1 et 30 sessions.');
  if (type !== 'single' && (!Number.isInteger(recurrence?.durationMinutes) || Number(recurrence?.durationMinutes) <= 0)) {
    throw new Error('Durée de séance invalide.');
  }
  if (type !== 'single' && (!recurrenceStartsAt || Number.isNaN(recurrenceStartsAt.getTime()))) throw new Error('Date de début de répétition invalide.');
  const occurrences = supplied.map((item, index) => {
    const startsAt = new Date(item.startsAt);
    const endsAt = new Date(item.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw new Error('Dates de session invalides.');
    if (type !== 'single' && startsAt.getTime() < Date.now()) throw new Error('Les sessions récurrentes doivent être programmées dans le futur.');
    if (type !== 'single') {
      if (recurrenceStartsAt && startsAt < recurrenceStartsAt) throw new Error('Une occurrence précède la date de début de répétition.');
      if (endsAt.getTime() - startsAt.getTime() !== Number(recurrence?.durationMinutes) * 60 * 1000) throw new Error('Durée de séance incohérente.');
      if (!['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(String(item.weekday ?? ''))) throw new Error('Jour de récurrence invalide.');
      if (!Number.isInteger(item.hour) || Number(item.hour) < 0 || Number(item.hour) > 23 || !Number.isInteger(item.minute) || Number(item.minute) < 0 || Number(item.minute) > 59) {
        throw new Error('Heure de récurrence invalide.');
      }
      if (item.biweekly !== undefined && typeof item.biweekly !== 'boolean') throw new Error('Cadence de récurrence invalide.');
    }
    return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), occurrenceIndex: index + 1 };
  });
  for (let index = 1; index < occurrences.length; index += 1) {
    if (occurrences[index].startsAt <= occurrences[index - 1].startsAt) {
      throw new Error('Les occurrences doivent être uniques et classées par date.');
    }
  }
  return {
    type,
    occurrences,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = await req.json();
    if (!input.courseId || !String(input.title ?? '').trim()) throw new Error('Informations de session incomplètes.');
    const timezone = input.timezone || 'Africa/Tunis';
    const recurrence = validatedOccurrences(input);
    const recurring = recurrence.type !== 'single';
    const { client, profile, authUser, course } = await requireCourseTeacher(req, input.courseId);
    const teacherEmail = await preferredMeetEmail(client, profile, authUser.email);
    if (!teacherEmail) throw new Error("Adresse email du professeur introuvable pour l'invitation Google Meet.");
    const studentAttendees = await approvedStudentAttendees(client, course.id);
    console.log('Google Meet teacher attendee', { teacherEmail });

    let recurrenceGroupId: string | null = null;
    if (recurring) {
      const { data: group, error: groupError } = await client.from('live_session_recurrence_groups').insert({
        course_id: course.id, teacher_id: profile.id, title: input.title.trim(), description: input.description || null,
        recurrence_type: recurrence.type, timezone, total_occurrences: recurrence.occurrences.length, created_by: profile.id,
      }).select('id').single();
      if (groupError) throw groupError;
      recurrenceGroupId = group.id;
    }

    const sessions: Record<string, unknown>[] = [];
    const failures: Array<{ occurrenceIndex: number; startsAt: string; error: string }> = [];
    for (const occurrence of recurrence.occurrences) {
      try {
        const event = await googleEvent('POST', null, eventPayload({
          title: input.title.trim(), description: input.description, startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt, timezone, courseTitle: course.title, teacherName: profile.full_name,
          teacherEmail, attendees: studentAttendees,
        }, true));
        const meetingUrl = event.hangoutLink || event.conferenceData?.entryPoints?.find((entry: { entryPointType: string }) => entry.entryPointType === 'video')?.uri;
        if (!meetingUrl) throw new Error('Impossible de créer la session Google Meet.');
        const resolvedSpace = await resolveMeetSpaceFromCalendarEvent(event);
        const { data: session, error } = await client.from('course_live_sessions').insert({
          course_id: course.id, teacher_id: profile.id, title: input.title.trim(), description: input.description || null,
          starts_at: occurrence.startsAt, ends_at: occurrence.endsAt, timezone, meeting_url: meetingUrl,
          google_event_id: event.id, google_calendar_id: Deno.env.get('GOOGLE_CALENDAR_ID'),
          google_conference_id: event.conferenceData?.conferenceId ?? null, google_html_link: event.htmlLink,
          google_payload: event, google_meet_space_name: resolvedSpace.spaceName ?? null,
          google_meet_conference_record: resolvedSpace.conferenceRecord ?? null, teacher_cohost_email: teacherEmail,
          teacher_cohost_status: resolvedSpace.status ?? 'not_attempted', teacher_cohost_error: resolvedSpace.error ?? null,
          teacher_cohost_google_status_code: resolvedSpace.googleStatusCode ?? null,
          teacher_cohost_google_message: resolvedSpace.googleErrorMessage ?? null,
          teacher_cohost_missing_scopes: resolvedSpace.missingScopes ?? false,
          teacher_cohost_preview_unsupported: resolvedSpace.previewUnsupported ?? false,
          meet_space_config_status: 'not_attempted', meet_artifact_config_status: 'not_attempted',
          recurrence_group_id: recurrenceGroupId, recurrence_index: recurring ? occurrence.occurrenceIndex : null,
          recurrence_type: recurring ? recurrence.type : null,
          recurrence_total_occurrences: recurring ? recurrence.occurrences.length : null, is_recurring: recurring,
          created_by: profile.id, updated_by: profile.id,
        }).select('*').single();
        if (error) {
          await googleEvent('DELETE', event.id);
          throw error;
        }
        const setup = resolvedSpace.spaceName
          ? await configureMeetSpaceForCoHosts({ sessionId: session.id, spaceName: resolvedSpace.spaceName })
          : { spaceConfigStatus: 'unsupported' as const, spaceConfigError: resolvedSpace.error ?? 'Espace Google Meet introuvable.', artifactConfigStatus: 'unsupported' as const, artifactConfigError: "Le partage des artefacts n'est pas exposé par l'API Google Meet.", payload: null };
        const cohost = resolvedSpace.spaceName && setup.spaceConfigStatus === 'configured'
          ? await assignTeacherAsMeetCoHost({ sessionId: session.id, spaceName: resolvedSpace.spaceName, teacherEmail })
          : { status: setup.spaceConfigStatus === 'unsupported' ? 'unsupported' as const : 'failed' as const, error: "Host Management n'a pas pu être activé automatiquement.", assignedAt: undefined };
        const { data: finalSession, error: updateError } = await client.from('course_live_sessions').update({
          teacher_cohost_status: cohost.status, teacher_cohost_error: cohost.error ?? null,
          teacher_cohost_assigned_at: cohost.assignedAt ?? null,
          meet_space_config_status: setup.spaceConfigStatus, meet_space_config_error: setup.spaceConfigError ?? null,
          meet_artifact_config_status: setup.artifactConfigStatus, meet_artifact_config_error: setup.artifactConfigError,
          google_meet_config_payload: setup.payload ?? null,
        }).eq('id', session.id).select('*').single();
        if (updateError) console.error('Unable to persist Google Meet co-host outcome', { sessionId: session.id, message: updateError.message });
        sessions.push(finalSession ?? session);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Impossible de créer cette occurrence.';
        failures.push({ occurrenceIndex: occurrence.occurrenceIndex, startsAt: occurrence.startsAt, error: message });
        if (occurrence.occurrenceIndex === 1) {
          if (recurrenceGroupId) await client.from('live_session_recurrence_groups').delete().eq('id', recurrenceGroupId);
          throw error;
        }
      }
    }
    if (!sessions.length) throw new Error('Impossible de créer les sessions récurrentes.');
    const first = sessions[0] as { id: string; course_id: string; teacher_id: string };
    if (recurring) {
      await notifyApprovedStudents(client, first, 'live_session_recurring_created', 'Nouvelles sessions live programmées', `${sessions.length} sessions live ont été programmées pour le cours « ${course.title} ».`, { courseId: course.id, recurrenceGroupId, createdCount: sessions.length }, `live_session_recurring_created:${recurrenceGroupId}`);
      return json({ success: true, sessions, createdCount: sessions.length, failedCount: failures.length, failures, recurrenceGroupId });
    }
    await notifyApprovedStudents(client, first, 'live_session_created', 'Nouvelle session live programmée', `Une session live du cours « ${course.title} » a été programmée pour le ${displayDate(recurrence.occurrences[0].startsAt, timezone)}.`, { courseId: course.id, startsAt: recurrence.occurrences[0].startsAt });
    return json(sessions[0]);
  } catch (error) {
    console.error('create-google-meet-session', { message: error instanceof Error ? error.message : 'Unable to create live session.' });
    return json({ error: error instanceof Error ? error.message : 'Impossible de créer la session Google Meet.' }, 400);
  }
});
