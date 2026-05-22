import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CourseEnrollment, CourseEnrollmentWithCourse, EnrollmentStatus } from '../types/database';
import { ensureCurrentUserIsNotBlocked } from './accountGuards';
import { uploadPaymentProof as uploadPaymentProofFile, validatePaymentProofFile } from './uploadService';

const enrollmentSelect = `
  *,
  courses:course_id(id,title,cover_url,price,currency,subject),
  teacher:profiles!course_enrollments_teacher_id_fkey(id,full_name,avatar_url),
  student:profiles!course_enrollments_student_id_fkey(id,full_name,avatar_url,email)
`;

export { validatePaymentProofFile };

export async function uploadPaymentProof(file: File, studentId: string, courseId: string) {
  return uploadPaymentProofFile(file, studentId, courseId);
}

async function attachProofUrls(enrollments: CourseEnrollmentWithCourse[]) {
  return Promise.all(enrollments.map(async (enrollment) => {
    if (!enrollment.payment_proof_path) return enrollment;
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(enrollment.payment_proof_path, 60 * 60);
    if (error) {
      logSupabaseError('enrollments.proofSignedUrl', error);
      return enrollment;
    }
    return { ...enrollment, payment_proof_url: data.signedUrl };
  }));
}

export async function getMyEnrollmentForCourse(courseId: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logSupabaseError('enrollments.authUser', authError);
    throw authError;
  }
  const studentId = authData.user?.id;
  if (!studentId) return null;

  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) {
    logSupabaseError('enrollments.myCourse', error);
    throw error;
  }

  return data as CourseEnrollment | null;
}

export async function createEnrollment(courseId: string, proofFile: File, paymentNote: string) {
  const studentId = await ensureCurrentUserIsNotBlocked('enrollments.create');
  const uploaded = await uploadPaymentProof(proofFile, studentId, courseId);
  const { data, error } = await supabase.rpc('create_course_enrollment', {
    target_course_id: courseId,
    proof_url: uploaded.publicUrl,
    proof_path: uploaded.path,
    payment_note: paymentNote || null,
  });

  if (error) {
    logSupabaseError('enrollments.create', error);
    throw error;
  }

  return data as CourseEnrollment;
}

export async function getMyEnrollments() {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select(enrollmentSelect)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('enrollments.mine', error);
    throw error;
  }

  return attachProofUrls((data ?? []) as CourseEnrollmentWithCourse[]);
}

export async function getTeacherEnrollmentRequests() {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select(enrollmentSelect)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('enrollments.teacherRequests', error);
    throw error;
  }

  return attachProofUrls((data ?? []) as CourseEnrollmentWithCourse[]);
}

export async function reviewEnrollment(enrollmentId: string, status: Extract<EnrollmentStatus, 'approved' | 'rejected'>, rejectionReason = '') {
  const { data, error } = await supabase.rpc('review_course_enrollment', {
    target_enrollment_id: enrollmentId,
    new_status: status,
    review_note: rejectionReason || null,
  });

  if (error) {
    logSupabaseError('enrollments.review', error);
    throw error;
  }

  return data as CourseEnrollment;
}

export async function hasApprovedEnrollment(courseId: string) {
  const enrollment = await getMyEnrollmentForCourse(courseId);
  return enrollment?.status === 'approved';
}

export async function getCourseAccess(courseId: string) {
  const { data, error } = await supabase.rpc('has_course_access', {
    target_course_id: courseId,
  });

  if (error) {
    logSupabaseError('enrollments.access', error);
    return false;
  }

  return Boolean(data);
}
