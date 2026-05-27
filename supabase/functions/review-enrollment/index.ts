import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function failure(message: string, code: string, status: number) {
  return json({ success: false, message, error: message, code }, status);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  let enrollmentId = '';
  let action = '';
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return failure('Session invalide.', 'SESSION_MISSING', 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !authData.user) return failure('Session invalide.', 'SESSION_INVALID', 401);

    const input = await req.json();
    enrollmentId = typeof input?.enrollmentId === 'string' ? input.enrollmentId : '';
    action = typeof input?.action === 'string' ? input.action : '';
    const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
    const note = typeof input?.note === 'string' ? input.note.trim() : '';
    if (!enrollmentId) return failure("Demande d'inscription introuvable.", 'ENROLLMENT_REQUIRED', 400);
    if (action !== 'approve' && action !== 'reject') return failure('Action de traitement invalide.', 'INVALID_ACTION', 400);

    const { data: actor, error: actorError } = await admin
      .from('profiles')
      .select('id,role,is_blocked,verification_status')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (actorError || !actor) return failure('Vous n’êtes pas autorisé à traiter cette demande.', 'ACTOR_NOT_ALLOWED', 403);

    console.log('Review enrollment request', { enrollmentId, action, actorId: actor.id, actorRole: actor.role });

    const { data: enrollment, error: enrollmentError } = await admin
      .from('course_enrollments')
      .select('*')
      .eq('id', enrollmentId)
      .maybeSingle();
    if (enrollmentError) throw enrollmentError;
    if (!enrollment) return failure("Demande d'inscription introuvable.", 'ENROLLMENT_NOT_FOUND', 404);

    const { data: course, error: courseError } = await admin
      .from('courses')
      .select('id,title,teacher_id,price,currency')
      .eq('id', enrollment.course_id)
      .maybeSingle();
    if (courseError) throw courseError;
    if (!course) return failure('Cours introuvable.', 'COURSE_NOT_FOUND', 404);

    if (actor.role !== 'admin' && actor.role !== 'teacher') {
      return failure('Vous n’êtes pas autorisé à traiter cette demande.', 'ROLE_NOT_ALLOWED', 403);
    }
    if (actor.role === 'teacher') {
      const teacherAllowed = actor.role === 'teacher'
        && !actor.is_blocked
        && !['suspended', 'blocked'].includes(actor.verification_status ?? 'pending')
        && (enrollment.teacher_id === actor.id || course.teacher_id === actor.id);
      if (!teacherAllowed) {
        return failure('Vous ne pouvez traiter que les demandes liées à vos propres cours.', 'COURSE_NOT_OWNED', 403);
      }
    }
    if (enrollment.status === 'cancelled') return failure('Cette demande est annulée et ne peut plus être traitée.', 'ENROLLMENT_CANCELLED', 409);
    if (enrollment.status === 'approved') return failure('Cette demande est déjà approuvée.', 'ALREADY_APPROVED', 409);
    if (enrollment.status === 'rejected') return failure('Cette demande est déjà rejetée.', 'ALREADY_REJECTED', 409);
    if (enrollment.status !== 'pending') return failure('Cette demande ne peut pas être traitée dans son état actuel.', 'INVALID_STATUS', 409);
    if (action === 'approve' && !enrollment.payment_proof_path && !enrollment.payment_proof_url) {
      return failure('Preuve de paiement manquante.', 'PAYMENT_PROOF_MISSING', 400);
    }

    const now = new Date().toISOString();
    const updates = action === 'approve' ? {
      status: 'approved',
      approved_at: now,
      approved_by: actor.id,
      rejected_at: null,
      rejected_by: null,
      rejection_reason: null,
      reviewed_at: now,
      reviewed_by: actor.id,
      updated_at: now,
    } : {
      status: 'rejected',
      approved_at: null,
      approved_by: null,
      rejected_at: now,
      rejected_by: actor.id,
      rejection_reason: reason || null,
      reviewed_at: now,
      reviewed_by: actor.id,
      updated_at: now,
    };
    const { data: updated, error: updateError } = await admin
      .from('course_enrollments')
      .update(updates)
      .eq('id', enrollment.id)
      .eq('status', 'pending')
      .select('*')
      .single();
    if (updateError) throw updateError;

    const { error: actionError } = await admin.from('enrollment_actions').insert({
      enrollment_id: updated.id,
      admin_id: actor.id,
      action: action === 'approve' ? 'approved' : 'rejected',
      previous_status: enrollment.status,
      new_status: updated.status,
      reason: action === 'reject' ? reason || null : null,
      note: note || null,
    });
    if (actionError) console.error('Review enrollment history failed', { enrollmentId, action, message: actionError.message, code: actionError.code });

    let warning: string | null = null;
    if (action === 'approve') {
      const { data: teacher } = await admin.from('profiles').select('teacher_revenue_share_percent').eq('id', course.teacher_id).maybeSingle();
      const share = Number(teacher?.teacher_revenue_share_percent ?? 50);
      const gross = Number(course.price ?? 0);
      const teacherAmount = Number((gross * share / 100).toFixed(3));
      const platformAmount = Number((gross - teacherAmount).toFixed(3));
      const { error: earningsError } = await admin.from('teacher_earnings').upsert({
        teacher_id: course.teacher_id,
        course_id: course.id,
        enrollment_id: updated.id,
        gross_amount: gross,
        teacher_share_percent: share,
        teacher_amount: teacherAmount,
        platform_amount: platformAmount,
        currency: course.currency ?? 'TND',
        status: 'earned',
        earned_at: now,
      }, { onConflict: 'enrollment_id', ignoreDuplicates: true });
      if (earningsError) {
        warning = 'Demande approuvée, mais le revenu professeur n’a pas pu être calculé automatiquement.';
        console.error('Teacher earning creation failed', { enrollmentId, action, message: earningsError.message, code: earningsError.code });
      }
    }

    const notificationTitle = action === 'approve' ? 'Inscription approuvée' : 'Inscription refusée';
    const notificationMessage = action === 'approve'
      ? `Votre accès au cours « ${course.title} » a été validé.`
      : `Votre inscription au cours « ${course.title} » a été refusée.${reason ? ` Motif : ${reason}` : ''}`;
    const notificationType = action === 'approve' ? 'enrollment_approved' : 'enrollment_rejected';
    const { error: notificationError } = await admin.from('notifications').upsert({
      user_id: enrollment.student_id,
      actor_id: actor.id,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      target_type: 'course_enrollment',
      target_id: enrollment.id,
      target_url: action === 'approve' ? `/courses/${course.id}/learn` : '/student/enrollments',
      data: { courseId: course.id, enrollmentId: enrollment.id },
      dedupe_key: `${notificationType}:${enrollment.id}:${enrollment.student_id}`,
    }, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (notificationError) console.error('Review enrollment notification failed', { enrollmentId, action, message: notificationError.message, code: notificationError.code });

    return json({
      success: true,
      enrollment: updated,
      message: warning ?? (action === 'approve' ? 'Demande approuvée.' : 'Demande rejetée.'),
      warning,
    });
  } catch (error) {
    const safe = error as { message?: string; code?: string };
    console.error('Review enrollment failed', { enrollmentId, action, message: safe?.message, code: safe?.code });
    return failure('Impossible de mettre à jour cette demande. Vérifiez les permissions Supabase.', 'DATABASE_UPDATE_FAILED', 500);
  }
});
