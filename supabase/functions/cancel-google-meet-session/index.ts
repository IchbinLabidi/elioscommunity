import { corsHeaders, googleEvent, json, notifyApprovedStudents, requireSessionOwner } from '../_shared/live-sessions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const input = await req.json();
    if (!input.sessionId) throw new Error('Session requise.');
    const { client, profile, session } = await requireSessionOwner(req, input.sessionId);
    if (session.google_event_id) await googleEvent('DELETE', session.google_event_id);
    const { data: updated, error } = await client.from('course_live_sessions').update({
      status: 'cancelled', is_cancelled: true, cancelled_reason: input.reason || null,
      cancelled_at: new Date().toISOString(), updated_by: profile.id,
    }).eq('id', session.id).select('*').single();
    if (error) throw error;
    await notifyApprovedStudents(client, updated, 'live_session_cancelled', 'Session live annulée', `La session live du cours ${session.courses?.title ?? ''} a été annulée.`, { courseId: session.course_id });
    return json(updated);
  } catch (error) {
    console.error('cancel-google-meet-session', error);
    return json({ error: error instanceof Error ? error.message : "Impossible d'annuler la session." }, 400);
  }
});
