import { caller, corsHeaders, googleEvent, json, notifyApprovedStudents } from '../_shared/live-sessions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { sessionId, reason } = await req.json();
    if (!sessionId) return json({ error: 'Session introuvable.' }, 404);

    const { client, profile } = await caller(req);
    const { data: session, error: loadError } = await client
      .from('course_live_sessions')
      .select('*, courses:course_id(title, teacher_id)')
      .eq('id', sessionId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!session) return json({ error: 'Session introuvable.' }, 404);
    if (session.deleted_at || session.status === 'deleted') {
      return json({ error: 'Cette session est déjà supprimée.' }, 409);
    }

    const ownsSession = session.teacher_id === profile.id || session.courses?.teacher_id === profile.id;
    if (profile.role !== 'admin' && !(profile.role === 'teacher' && ownsSession)) {
      return json({ error: "Vous n'êtes pas autorisé à supprimer cette session." }, 403);
    }

    let calendarWarning: string | null = null;
    if (session.google_event_id) {
      try {
        await googleEvent('DELETE', session.google_event_id, undefined, session.google_calendar_id);
      } catch (error) {
        if (error instanceof Error && error.message.includes('introuvable')) {
          calendarWarning = 'Google Calendar event already missing.';
        } else {
          throw error;
        }
      }
    }

    const now = new Date().toISOString();
    const { data: updated, error } = await client
      .from('course_live_sessions')
      .update({
        status: 'deleted',
        deleted_at: now,
        deleted_by: profile.id,
        delete_reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
        updated_by: profile.id,
        updated_at: now,
      })
      .eq('id', session.id)
      .select('*')
      .single();
    if (error) throw error;

    const reasonText = updated.delete_reason ? ` Raison : ${updated.delete_reason}` : '';
    await notifyApprovedStudents(
      client,
      updated,
      'live_session_deleted',
      'Session live supprimée',
      `La session live « ${session.title} » du cours « ${session.courses?.title ?? ''} » a été supprimée.${reasonText}`,
    );
    console.info('Live session soft deleted', {
      sessionId: session.id,
      actorId: profile.id,
      calendarWarning,
    });
    return json({ ...updated, message: 'Session supprimée.', calendarWarning });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de supprimer la session.';
    const status = message.includes('Authentification') ? 401 : 400;
    console.error('delete-google-meet-session', { message });
    return json({ error: message }, status);
  }
});
