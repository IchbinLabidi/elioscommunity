import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CourseEnrollment, CourseEnrollmentWithCourse, EnrollmentAction, EnrollmentStatus } from '../types/database';
import { reviewEnrollmentRequest } from './enrollmentReviewService';

export type AdminEnrollmentFilters = {
  query?: string;
  status?: EnrollmentStatus | 'all';
  subject?: string;
  teacherId?: string;
  proof?: '' | 'with-proof' | 'without-proof';
  from?: string;
  to?: string;
  sort?: 'newest' | 'oldest' | 'pending-first' | 'highest-price';
};

export type AdminEnrollmentStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  estimatedRevenue: number;
};

export type AdminEnrollmentAction = 'approve' | 'reject' | 'reset' | 'cancel' | 'grant' | 'remove_access' | 'note';

const enrollmentSelect = `
  *,
  courses:course_id(id,title,cover_url,price,currency,subject,subject_id,is_published),
  teacher:profiles!course_enrollments_teacher_id_fkey(id,full_name,avatar_url),
  student:profiles!course_enrollments_student_id_fkey(id,full_name,avatar_url,email),
  reviewer:profiles!course_enrollments_reviewed_by_fkey(id,full_name,role)
`;

function fail(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

export async function getPaymentProofSignedUrl(enrollment: CourseEnrollment) {
  if (!enrollment.payment_proof_path) return null;
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(enrollment.payment_proof_path, 60 * 10);
  if (error) return fail('adminEnrollments.proofSignedUrl', error);
  return data.signedUrl;
}

async function attachProofUrls(rows: CourseEnrollmentWithCourse[]) {
  return Promise.all(rows.map(async (enrollment) => {
    try {
      return { ...enrollment, payment_proof_url: await getPaymentProofSignedUrl(enrollment), payment_proof_error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      return {
        ...enrollment,
        payment_proof_url: null,
        payment_proof_error: message.includes('permission') || message.includes('row-level')
          ? 'Vous n’êtes pas autorisé à consulter cette preuve.'
          : 'Impossible d’ouvrir la preuve de paiement.',
      };
    }
  }));
}

async function loadEnrollments() {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select(enrollmentSelect)
    .order('created_at', { ascending: false });
  if (error) return fail('adminEnrollments.list', error);
  return attachProofUrls((data ?? []) as CourseEnrollmentWithCourse[]);
}

export async function getAdminEnrollments(filters: AdminEnrollmentFilters = {}) {
  let enrollments = await loadEnrollments();
  const query = filters.query?.trim().toLowerCase() ?? '';
  if (query) {
    enrollments = enrollments.filter((item) => (
      `${item.student?.full_name ?? ''} ${item.student?.email ?? ''} ${item.courses?.title ?? ''} ${item.teacher?.full_name ?? ''}`
        .toLowerCase()
        .includes(query)
    ));
  }
  if (filters.status && filters.status !== 'all') enrollments = enrollments.filter((item) => item.status === filters.status);
  if (filters.subject) enrollments = enrollments.filter((item) => item.courses?.subject_id === filters.subject || item.courses?.subject === filters.subject);
  if (filters.teacherId) enrollments = enrollments.filter((item) => item.teacher_id === filters.teacherId);
  if (filters.proof === 'with-proof') enrollments = enrollments.filter((item) => Boolean(item.payment_proof_path));
  if (filters.proof === 'without-proof') enrollments = enrollments.filter((item) => !item.payment_proof_path);
  if (filters.from) enrollments = enrollments.filter((item) => item.created_at >= filters.from!);
  if (filters.to) enrollments = enrollments.filter((item) => item.created_at.slice(0, 10) <= filters.to!);
  return enrollments.sort((first, second) => {
    if (filters.sort === 'oldest') return new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
    if (filters.sort === 'pending-first') return Number(second.status === 'pending') - Number(first.status === 'pending');
    if (filters.sort === 'highest-price') return Number(second.courses?.price ?? 0) - Number(first.courses?.price ?? 0);
    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
}

export async function getEnrollmentStats(filters: AdminEnrollmentFilters = {}): Promise<AdminEnrollmentStats> {
  const filtered = Boolean(filters.query || filters.status && filters.status !== 'all' || filters.subject || filters.teacherId || filters.proof || filters.from || filters.to);
  const enrollments = filtered ? await getAdminEnrollments(filters) : await (async () => {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('id, status, courses:course_id(price)');
    if (error) return fail('adminEnrollments.stats', error);
    return (data ?? []).map((item) => ({
      ...item,
      courses: Array.isArray(item.courses) ? item.courses[0] : item.courses,
    })) as CourseEnrollmentWithCourse[];
  })();
  return {
    total: enrollments.length,
    pending: enrollments.filter((item) => item.status === 'pending').length,
    approved: enrollments.filter((item) => item.status === 'approved').length,
    rejected: enrollments.filter((item) => item.status === 'rejected').length,
    cancelled: enrollments.filter((item) => item.status === 'cancelled').length,
    estimatedRevenue: enrollments
      .filter((item) => item.status === 'approved')
      .reduce((total, item) => total + Number(item.courses?.price ?? 0), 0),
  };
}

export async function getAdminEnrollmentById(enrollmentId: string) {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select(enrollmentSelect)
    .eq('id', enrollmentId)
    .maybeSingle();
  if (error) return fail('adminEnrollments.detail', error);
  if (!data) return null;
  const [enrollment] = await attachProofUrls([data as CourseEnrollmentWithCourse]);
  return enrollment;
}

export async function getEnrollmentActions(enrollmentId: string) {
  const { data, error } = await supabase
    .from('enrollment_actions')
    .select('*, admin:profiles!enrollment_actions_admin_id_fkey(id,full_name,role)')
    .eq('enrollment_id', enrollmentId)
    .order('created_at', { ascending: false });
  if (error) return fail('adminEnrollments.actions', error);
  return (data ?? []) as EnrollmentAction[];
}

export async function manageEnrollment(enrollmentId: string, action: AdminEnrollmentAction, reason?: string, note?: string) {
  if (action === 'approve' || action === 'reject') {
    return reviewEnrollmentRequest(enrollmentId, action, reason, note);
  }
  const { data, error } = await supabase.rpc('admin_manage_enrollment', {
    target_enrollment_id: enrollmentId,
    admin_action: action,
    reason: reason || null,
    note: note || null,
  });
  if (error) return fail(`adminEnrollments.${action}`, error);
  return { success: true as const, enrollment: data as CourseEnrollment, message: 'Décision enregistrée.' };
}

export const approveEnrollment = (id: string, note?: string) => manageEnrollment(id, 'approve', undefined, note);
export const rejectEnrollment = (id: string, reason: string, note?: string) => manageEnrollment(id, 'reject', reason, note);
export const resetEnrollmentToPending = (id: string, reason?: string) => manageEnrollment(id, 'reset', reason);
export const cancelEnrollment = (id: string, reason: string) => manageEnrollment(id, 'cancel', reason);
export const grantEnrollmentAccess = (id: string, note?: string) => manageEnrollment(id, 'grant', undefined, note);
export const removeEnrollmentAccess = (id: string, reason: string) => manageEnrollment(id, 'remove_access', reason);
export const addEnrollmentNote = (id: string, note: string) => manageEnrollment(id, 'note', undefined, note);
