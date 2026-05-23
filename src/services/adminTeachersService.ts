import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import {
  Answer,
  Course,
  CourseEnrollment,
  Profile,
  TeacherAdminNote,
  TeacherPublicStats,
  TeacherRating,
  TeacherVerificationDetails,
  TeacherVerificationHistory,
  TeacherVerificationStatus,
} from '../types/database';
import { createNotification } from './notificationsService';

export type AdminTeacherFilters = {
  query?: string;
  status?: TeacherVerificationStatus | 'all';
  specialty?: string;
  activity?: 'all' | 'courses' | 'answers';
  sort?: 'newest' | 'highest-rating' | 'most-answers' | 'most-courses' | 'pending-first';
};

export type AdminTeacherSummary = Profile & TeacherPublicStats & {
  enrollments_count: number;
};

function fail(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

async function attachSummaryStats(teachers: Profile[]) {
  if (!teachers.length) return [] as AdminTeacherSummary[];
  const teacherIds = teachers.map((teacher) => teacher.id);
  const [enrollmentsResult, coursesResult, answersResult, ratingsResult, followsResult] = await Promise.all([
    supabase.from('course_enrollments').select('teacher_id').in('teacher_id', teacherIds),
    supabase.from('courses').select('id, teacher_id').in('teacher_id', teacherIds),
    supabase.from('answers').select('id, teacher_id, is_best').in('teacher_id', teacherIds),
    supabase.from('ratings').select('id, teacher_id, rating, review').in('teacher_id', teacherIds),
    supabase.from('teacher_follows').select('teacher_id').in('teacher_id', teacherIds),
  ]);
  if (enrollmentsResult.error) logSupabaseError('adminTeachers.enrollmentsCount', enrollmentsResult.error);
  if (coursesResult.error) logSupabaseError('adminTeachers.courseCounts', coursesResult.error);
  if (answersResult.error) logSupabaseError('adminTeachers.answerCounts', answersResult.error);
  if (ratingsResult.error) logSupabaseError('adminTeachers.ratingCounts', ratingsResult.error);
  if (followsResult.error) logSupabaseError('adminTeachers.followerCounts', followsResult.error);
  return teachers.map((teacher) => {
    const ratings = (ratingsResult.data ?? []).filter((item) => item.teacher_id === teacher.id);
    const answers = (answersResult.data ?? []).filter((item) => item.teacher_id === teacher.id);
    const directStats: TeacherPublicStats = {
      teacher_id: teacher.id,
      average_rating: ratings.length ? ratings.reduce((total, item) => total + Number(item.rating), 0) / ratings.length : 0,
      total_ratings: ratings.length,
      total_reviews: ratings.filter((item) => Boolean(item.review?.trim())).length,
      total_answers: answers.length,
      total_best_answers: answers.filter((item) => item.is_best).length,
      total_courses: (coursesResult.data ?? []).filter((item) => item.teacher_id === teacher.id).length,
      follower_count: (followsResult.data ?? []).filter((item) => item.teacher_id === teacher.id).length,
    };
    return {
      ...teacher,
      ...directStats,
      follower_count: Number(directStats.follower_count ?? 0),
      enrollments_count: (enrollmentsResult.data ?? []).filter((item) => item.teacher_id === teacher.id).length,
    };
  });
}

export async function getAdminTeachers(filters: AdminTeacherFilters = {}) {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'teacher').order('created_at', { ascending: false });
  if (error) return fail('adminTeachers.list', error);
  let teachers = await attachSummaryStats((data ?? []) as Profile[]);
  const query = filters.query?.trim().toLowerCase() ?? '';
  if (query) teachers = teachers.filter((teacher) => `${teacher.full_name} ${teacher.email} ${teacher.specialty ?? ''}`.toLowerCase().includes(query));
  if (filters.status && filters.status !== 'all') teachers = teachers.filter((teacher) => (teacher.verification_status ?? (teacher.is_verified ? 'verified' : 'pending')) === filters.status);
  if (filters.specialty) teachers = teachers.filter((teacher) => teacher.specialty?.toLowerCase().includes(filters.specialty!.toLowerCase()));
  if (filters.activity === 'courses') teachers = teachers.filter((teacher) => teacher.total_courses > 0);
  if (filters.activity === 'answers') teachers = teachers.filter((teacher) => teacher.total_answers > 0);
  return teachers.sort((first, second) => {
    if (filters.sort === 'highest-rating') return second.average_rating - first.average_rating;
    if (filters.sort === 'most-answers') return second.total_answers - first.total_answers;
    if (filters.sort === 'most-courses') return second.total_courses - first.total_courses;
    if (filters.sort === 'pending-first') return Number((second.verification_status ?? 'pending') === 'pending') - Number((first.verification_status ?? 'pending') === 'pending');
    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
}

export async function getAdminTeacherById(teacherId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', teacherId).eq('role', 'teacher').maybeSingle();
  if (error) return fail('adminTeachers.profile', error);
  return data as Profile | null;
}

export async function getAdminTeacherStats(teacherId: string) {
  const summaries = await attachSummaryStats([(await getAdminTeacherById(teacherId))!].filter(Boolean));
  return summaries[0] ?? null;
}

export async function getTeacherCourses(teacherId: string) {
  const { data, error } = await supabase.from('courses').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) return fail('adminTeachers.courses', error);
  return (data ?? []) as Course[];
}

export async function getTeacherAnswers(teacherId: string) {
  const { data, error } = await supabase.from('answers').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) return fail('adminTeachers.answers', error);
  return (data ?? []) as Answer[];
}

export async function getTeacherReviews(teacherId: string) {
  const { data, error } = await supabase.from('ratings').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) return fail('adminTeachers.reviews', error);
  return (data ?? []) as TeacherRating[];
}

export async function getTeacherEnrollments(teacherId: string) {
  const { data, error } = await supabase.from('course_enrollments').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) return fail('adminTeachers.enrollments', error);
  return (data ?? []) as CourseEnrollment[];
}

export async function getTeacherVerificationDetails(teacherId: string) {
  const { data, error } = await supabase.from('teacher_verification_private').select('*').eq('teacher_id', teacherId).maybeSingle();
  if (error) return fail('adminTeachers.verificationDetails', error);
  return data as TeacherVerificationDetails | null;
}

export async function getTeacherVerificationHistory(teacherId: string) {
  const { data, error } = await supabase.from('teacher_verification_history').select('*, admin:profiles!teacher_verification_history_admin_id_fkey(id, full_name)').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) return fail('adminTeachers.history', error);
  return (data ?? []) as TeacherVerificationHistory[];
}

export async function getTeacherAdminNotes(teacherId: string) {
  const { data, error } = await supabase.from('teacher_admin_notes').select('*, admin:profiles!teacher_admin_notes_admin_id_fkey(id, full_name)').eq('teacher_id', teacherId).order('created_at', { ascending: false });
  if (error) return fail('adminTeachers.notes', error);
  return (data ?? []) as TeacherAdminNote[];
}

async function notifyStatus(teacherId: string, status: TeacherVerificationStatus) {
  const copy = {
    verified: ['Profil prof verifie', 'Votre profil a ete verifie. Vous pouvez maintenant apparaitre comme prof verifie.'],
    rejected: ['Verification refusee', 'Votre demande de verification a ete refusee. Consultez le motif et mettez a jour votre profil.'],
    suspended: ['Compte prof suspendu', 'Votre compte professeur a ete suspendu temporairement.'],
    blocked: ['Compte prof bloque', 'Votre compte professeur est bloque. Contactez le support.'],
    pending: ['Statut de verification mis a jour', 'Votre profil est en attente de verification.'],
  }[status];
  const { data } = await supabase.auth.getUser();
  await createNotification({ userId: teacherId, actorId: data.user?.id ?? null, type: 'admin_message', title: copy[0], message: copy[1], targetType: 'teacher', targetId: teacherId, targetUrl: '/teacher/dashboard' });
}

async function setTeacherStatus(teacherId: string, status: TeacherVerificationStatus, reason?: string) {
  const { data, error } = await supabase.rpc('admin_set_teacher_verification', { target_teacher_id: teacherId, new_status: status, reason: reason ?? null });
  if (error) return fail('adminTeachers.status', error);
  void notifyStatus(teacherId, status).catch((notificationError) => logSupabaseError('adminTeachers.statusNotification', notificationError));
  return data as Profile;
}

export const verifyTeacher = (teacherId: string) => setTeacherStatus(teacherId, 'verified');
export const rejectTeacher = (teacherId: string, reason: string) => setTeacherStatus(teacherId, 'rejected', reason);
export const suspendTeacher = (teacherId: string, reason: string) => setTeacherStatus(teacherId, 'suspended', reason);
export const unsuspendTeacher = (teacherId: string) => setTeacherStatus(teacherId, 'pending');
export const blockTeacher = (teacherId: string, reason: string) => setTeacherStatus(teacherId, 'blocked', reason);
export const unblockTeacher = (teacherId: string) => setTeacherStatus(teacherId, 'pending');
export const removeTeacherVerification = (teacherId: string, reason?: string) => setTeacherStatus(teacherId, 'pending', reason);

export async function addTeacherAdminNote(teacherId: string, note: string) {
  const { data, error } = await supabase.rpc('admin_add_teacher_note', { target_teacher_id: teacherId, note_text: note });
  if (error) return fail('adminTeachers.note.add', error);
  return data as TeacherAdminNote;
}
