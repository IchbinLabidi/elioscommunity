import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CourseEnrollment } from '../types/database';

export type EnrollmentReviewAction = 'approve' | 'reject';

export type EnrollmentReviewResult = {
  success: true;
  enrollment: CourseEnrollment;
  message: string;
  warning?: string | null;
};

function mapMessage(message: string, code?: string) {
  const normalized = message.toLowerCase();
  if (code === 'COURSE_NOT_OWNED' || normalized.includes('own') || normalized.includes('propres cours')) return 'Vous ne pouvez traiter que les demandes liées à vos propres cours.';
  if (code === 'ROLE_NOT_ALLOWED' || code === 'ACTOR_NOT_ALLOWED' || normalized.includes('permission') || normalized.includes('autorisé')) return 'Vous n’êtes pas autorisé à traiter cette demande.';
  if (code === 'ENROLLMENT_NOT_FOUND' || normalized.includes('introuvable') || normalized.includes('not found')) return "Demande d’inscription introuvable.";
  if (code === 'PAYMENT_PROOF_MISSING' || normalized.includes('preuve')) return 'Preuve de paiement manquante.';
  if (code === 'ALREADY_APPROVED' || normalized.includes('déjà approuv')) return 'Cette demande est déjà approuvée.';
  if (code === 'ALREADY_REJECTED' || normalized.includes('déjà rejet')) return 'Cette demande est déjà rejetée.';
  if (code === 'DATABASE_UPDATE_FAILED' || normalized.includes('row-level') || normalized.includes('rls')) return 'Impossible de mettre à jour cette demande. Vérifiez les permissions Supabase.';
  if (message && !normalized.includes('edge function returned')) return message;
  return "Impossible de traiter cette demande d’inscription.";
}

async function readFunctionError(error: unknown) {
  const functionError = error as { message?: string; context?: Response };
  if (functionError.context && typeof functionError.context.clone === 'function') {
    try {
      return await functionError.context.clone().json() as { message?: string; error?: string; code?: string };
    } catch {
      return null;
    }
  }
  return null;
}

export async function reviewEnrollmentRequest(enrollmentId: string, action: EnrollmentReviewAction, reason?: string, note?: string) {
  const { data, error } = await supabase.functions.invoke('review-enrollment', {
    body: { enrollmentId, action, reason: reason?.trim() || undefined, note: note?.trim() || undefined },
  });
  if (error) {
    const payload = await readFunctionError(error);
    logSupabaseError('enrollments.review', { error, payload, enrollmentId, action });
    throw new Error(mapMessage(payload?.message || payload?.error || error.message || '', payload?.code));
  }
  const result = data as EnrollmentReviewResult | { success?: false; message?: string; error?: string; code?: string };
  if (!result?.success) throw new Error(mapMessage(result?.message || result?.error || '', result?.code));
  return result;
}
