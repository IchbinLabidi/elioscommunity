import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/live-sessions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const secret = Deno.env.get('LIVE_SESSION_CRON_SECRET');
    if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'Non autorise.' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = Date.now();
    const windows = [
      { kind: 'reminder_24h', ms: 24 * 60 * 60 * 1000 },
      { kind: 'reminder_1h', ms: 60 * 60 * 1000 },
      { kind: 'reminder_15m', ms: 15 * 60 * 1000 },
    ];
    let sent = 0;
    for (const window of windows) {
      const from = new Date(now + window.ms - 5 * 60 * 1000).toISOString();
      const to = new Date(now + window.ms + 5 * 60 * 1000).toISOString();
      const { data: sessions } = await client.from('course_live_sessions').select('id,course_id,teacher_id,title').eq('status', 'scheduled').eq('is_cancelled', false).gte('starts_at', from).lte('starts_at', to);
      for (const session of sessions ?? []) {
        const { data: enrolled } = await client.from('course_enrollments').select('student_id').eq('course_id', session.course_id).eq('status', 'approved');
        for (const student of enrolled ?? []) {
          const { error } = await client.from('live_session_notifications').insert({ live_session_id: session.id, student_id: student.student_id, notification_type: window.kind });
          if (error) continue;
          await client.from('notifications').upsert({ user_id: student.student_id, actor_id: session.teacher_id, type: 'live_session_reminder', title: 'Rappel de session live', message: `La session ${session.title} approche.`, target_type: 'course_live_session', target_id: session.id, target_url: `/courses/${session.course_id}/learn`, data: { courseId: session.course_id, sessionId: session.id, reminderType: window.kind }, dedupe_key: `live_session_reminder:${window.kind}:${session.id}:${student.student_id}` }, { onConflict: 'dedupe_key', ignoreDuplicates: true });
          sent += 1;
        }
      }
    }
    return json({ sent });
  } catch (error) {
    console.error('send-live-session-reminders', error);
    return json({ error: 'Impossible d envoyer les rappels.' }, 500);
  }
});
