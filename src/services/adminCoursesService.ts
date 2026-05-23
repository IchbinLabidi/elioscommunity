import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import {
  AdminAuditLog,
  Course,
  CourseEnrollmentWithCourse,
  CourseReviewStatus,
  CourseWithContent,
  CourseWithTeacher,
  Profile,
  Subject,
} from '../types/database';
import { getCourseContentForBuilder } from './courseContentService';

export type AdminCourseStatus = 'all' | 'published' | 'draft' | 'hidden' | 'featured' | CourseReviewStatus;
export type AdminCourseFilters = {
  query?: string;
  subject?: string;
  teacherId?: string;
  status?: AdminCourseStatus;
  price?: '' | 'free' | 'paid';
  sort?: 'newest' | 'oldest' | 'most-enrollments' | 'highest-price' | 'pending-first';
};

export type AdminCourseSummary = CourseWithTeacher & {
  teacher?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url' | 'verification_status'> | null;
  subjectRecord?: Subject | null;
  chaptersCount: number;
  videosCount: number;
  attachmentsCount: number;
  enrollmentsCount: number;
  approvedEnrollments: number;
  pendingEnrollments: number;
  rejectedEnrollments: number;
  reportsCount: number;
  estimatedRevenue: number;
};

export type AdminCourseStats = {
  total: number;
  published: number;
  drafts: number;
  hidden: number;
  featured: number;
  pendingReview: number;
  paid: number;
  free: number;
  totalEnrollments: number;
  pendingEnrollments: number;
};

export type CourseAdminAction = 'publish' | 'unpublish' | 'hide' | 'unhide' | 'feature' | 'unfeature' | 'approve' | 'request_changes' | 'reject' | 'delete' | 'restore';
export type CourseContentTarget = 'chapter' | 'video' | 'attachment';

function single<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function fail(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

async function summaries() {
  const { data, error } = await supabase
    .from('courses')
    .select('*, profiles:teacher_id(id, full_name, email, avatar_url, verification_status), subjects:subject_id(*)')
    .order('created_at', { ascending: false });
  if (error) return fail('adminCourses.list', error);
  const rows = (data ?? []) as Array<CourseWithTeacher & {
    profiles?: AdminCourseSummary['teacher'] | AdminCourseSummary['teacher'][];
    subjects?: Subject | Subject[] | null;
  }>;
  if (!rows.length) return [] as AdminCourseSummary[];
  const ids = rows.map((course) => course.id);
  const [chapters, videos, attachments, enrollments, reports] = await Promise.all([
    supabase.from('course_chapters').select('course_id').in('course_id', ids),
    supabase.from('chapter_videos').select('course_id').in('course_id', ids),
    supabase.from('chapter_attachments').select('course_id').in('course_id', ids),
    supabase.from('course_enrollments').select('course_id, status').in('course_id', ids),
    supabase.from('reports').select('target_id, status').eq('target_type', 'course').in('target_id', ids),
  ]);
  const aggregateError = chapters.error ?? videos.error ?? attachments.error ?? enrollments.error ?? reports.error;
  if (aggregateError) return fail('adminCourses.aggregates', aggregateError);
  return rows.map((course) => {
    const courseEnrollments = (enrollments.data ?? []).filter((row) => row.course_id === course.id);
    const approved = courseEnrollments.filter((row) => row.status === 'approved').length;
    return {
      ...course,
      teacher: single(course.profiles),
      subjectRecord: single(course.subjects),
      chaptersCount: (chapters.data ?? []).filter((row) => row.course_id === course.id).length,
      videosCount: (videos.data ?? []).filter((row) => row.course_id === course.id).length,
      attachmentsCount: (attachments.data ?? []).filter((row) => row.course_id === course.id).length,
      enrollmentsCount: courseEnrollments.length,
      approvedEnrollments: approved,
      pendingEnrollments: courseEnrollments.filter((row) => row.status === 'pending').length,
      rejectedEnrollments: courseEnrollments.filter((row) => row.status === 'rejected').length,
      reportsCount: (reports.data ?? []).filter((row) => row.target_id === course.id && row.status === 'pending').length,
      estimatedRevenue: approved * Number(course.price),
    };
  });
}

export async function getAdminCourses(filters: AdminCourseFilters = {}) {
  let courses = await summaries();
  const query = filters.query?.trim().toLowerCase() ?? '';
  if (query) courses = courses.filter((course) => `${course.title} ${course.description} ${course.subject} ${course.teacher?.full_name ?? ''}`.toLowerCase().includes(query));
  if (filters.subject) courses = courses.filter((course) => course.subject_id === filters.subject || course.subject === filters.subject);
  if (filters.teacherId) courses = courses.filter((course) => course.teacher_id === filters.teacherId);
  if (filters.price === 'free') courses = courses.filter((course) => Number(course.price) === 0);
  if (filters.price === 'paid') courses = courses.filter((course) => Number(course.price) > 0);
  if (filters.status && filters.status !== 'all') {
    courses = courses.filter((course) => {
      if (filters.status === 'published') return course.is_published && !course.is_hidden && !course.is_deleted;
      if (filters.status === 'draft') return !course.is_published && !course.is_deleted;
      if (filters.status === 'hidden') return Boolean(course.is_hidden);
      if (filters.status === 'featured') return Boolean(course.is_featured);
      return (course.admin_review_status ?? 'pending') === filters.status;
    });
  }
  return courses.sort((first, second) => {
    if (filters.sort === 'oldest') return new Date(first.created_at).getTime() - new Date(second.created_at).getTime();
    if (filters.sort === 'most-enrollments') return second.enrollmentsCount - first.enrollmentsCount;
    if (filters.sort === 'highest-price') return Number(second.price) - Number(first.price);
    if (filters.sort === 'pending-first') return Number((second.admin_review_status ?? 'pending') === 'pending') - Number((first.admin_review_status ?? 'pending') === 'pending');
    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
}

export async function getAdminCourseStats(): Promise<AdminCourseStats> {
  const courses = await summaries();
  return {
    total: courses.length,
    published: courses.filter((course) => course.is_published && !course.is_hidden && !course.is_deleted).length,
    drafts: courses.filter((course) => !course.is_published && !course.is_deleted).length,
    hidden: courses.filter((course) => course.is_hidden).length,
    featured: courses.filter((course) => course.is_featured).length,
    pendingReview: courses.filter((course) => (course.admin_review_status ?? 'pending') === 'pending').length,
    paid: courses.filter((course) => Number(course.price) > 0).length,
    free: courses.filter((course) => Number(course.price) === 0).length,
    totalEnrollments: courses.reduce((total, course) => total + course.enrollmentsCount, 0),
    pendingEnrollments: courses.reduce((total, course) => total + course.pendingEnrollments, 0),
  };
}

export async function getAdminCourseById(courseId: string) {
  return (await summaries()).find((course) => course.id === courseId) ?? null;
}

export async function getAdminCourseContent(courseId: string): Promise<CourseWithContent | null> {
  const course = await getAdminCourseById(courseId);
  return course ? getCourseContentForBuilder(course) : null;
}

export async function getCourseEnrollments(courseId: string) {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('*, student:profiles!course_enrollments_student_id_fkey(id,full_name,avatar_url,email)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });
  if (error) return fail('adminCourses.enrollments', error);
  return Promise.all(((data ?? []) as CourseEnrollmentWithCourse[]).map(async (enrollment) => {
    if (!enrollment.payment_proof_path) return enrollment;
    const { data: signed, error: proofError } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(enrollment.payment_proof_path, 60 * 60);
    if (proofError) {
      logSupabaseError('adminCourses.enrollmentProof', proofError);
      return enrollment;
    }
    return { ...enrollment, payment_proof_url: signed.signedUrl };
  }));
}

export async function getCourseAdminActions(courseId: string) {
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .eq('target_type', 'course')
    .eq('target_id', courseId)
    .order('created_at', { ascending: false });
  if (error) return fail('adminCourses.actions', error);
  return (data ?? []) as AdminAuditLog[];
}

export async function manageCourse(courseId: string, action: CourseAdminAction, reason?: string) {
  const { data, error } = await supabase.rpc('admin_manage_course', {
    target_course_id: courseId,
    admin_action: action,
    reason: reason || null,
  });
  if (error) return fail(`adminCourses.${action}`, error);
  return data as Course;
}

export async function moderateCourseContent(type: CourseContentTarget, id: string, action: 'hide' | 'unhide', reason?: string) {
  const { error } = await supabase.rpc('admin_moderate_course_content', {
    target_type: type,
    target_id: id,
    admin_action: action,
    reason: reason || null,
  });
  if (error) return fail(`adminCourses.content.${action}`, error);
}

export const publishCourse = (id: string) => manageCourse(id, 'publish');
export const unpublishCourse = (id: string, reason: string) => manageCourse(id, 'unpublish', reason);
export const hideCourse = (id: string, reason: string) => manageCourse(id, 'hide', reason);
export const unhideCourse = (id: string) => manageCourse(id, 'unhide');
export const featureCourse = (id: string) => manageCourse(id, 'feature');
export const unfeatureCourse = (id: string) => manageCourse(id, 'unfeature');
export const approveCourse = (id: string, note?: string) => manageCourse(id, 'approve', note);
export const requestCourseChanges = (id: string, note: string) => manageCourse(id, 'request_changes', note);
export const rejectCourse = (id: string, reason: string) => manageCourse(id, 'reject', reason);
export const deleteAdminCourse = (id: string, reason: string) => manageCourse(id, 'delete', reason);
export const restoreCourse = (id: string) => manageCourse(id, 'restore');
export const hideChapter = (id: string, reason: string) => moderateCourseContent('chapter', id, 'hide', reason);
export const unhideChapter = (id: string) => moderateCourseContent('chapter', id, 'unhide');
export const hideVideo = (id: string, reason: string) => moderateCourseContent('video', id, 'hide', reason);
export const unhideVideo = (id: string) => moderateCourseContent('video', id, 'unhide');
export const hideAttachment = (id: string, reason: string) => moderateCourseContent('attachment', id, 'hide', reason);
export const unhideAttachment = (id: string) => moderateCourseContent('attachment', id, 'unhide');
