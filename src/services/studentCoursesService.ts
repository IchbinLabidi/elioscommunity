import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CourseEnrollmentWithCourse, CourseWithTeacher, EnrollmentStatus, VideoProgress } from '../types/database';
import { ensureCurrentUserIsNotBlocked } from './accountGuards';

export type StudentCourseFilters = {
  query?: string;
  subject?: string;
  teacherId?: string;
  level?: string;
  sort?: 'approved-recent' | 'accessed-recent';
};

export type StudentPurchasedCourse = CourseWithTeacher & {
  enrollment: CourseEnrollmentWithCourse;
  progress: {
    completedLessons: number;
    startedLessons: number;
    lastAccessedAt: string | null;
  };
};

const purchasedSelect = `
  *,
  courses:course_id(*, profiles:teacher_id(id,full_name,avatar_url,specialty), subjects:subject_id(*)),
  teacher:profiles!course_enrollments_teacher_id_fkey(id,full_name,avatar_url)
`;

async function loadMyEnrollments(status?: EnrollmentStatus) {
  await ensureCurrentUserIsNotBlocked('studentCourses.enrollments');
  let query = supabase
    .from('course_enrollments')
    .select(purchasedSelect)
    .order('reviewed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    logSupabaseError('studentCourses.enrollments', error);
    throw error;
  }
  return (data ?? []) as Array<CourseEnrollmentWithCourse & { courses?: CourseWithTeacher | null }>;
}

async function getProgress(courseIds: string[]) {
  if (!courseIds.length) return new Map<string, StudentPurchasedCourse['progress']>();
  const { data, error } = await supabase
    .from('video_progress')
    .select('course_id, completed, watched_seconds, last_watched_at')
    .in('course_id', courseIds);

  if (error) {
    logSupabaseError('studentCourses.progress', error);
    return new Map<string, StudentPurchasedCourse['progress']>();
  }

  return ((data ?? []) as Pick<VideoProgress, 'course_id' | 'completed' | 'watched_seconds' | 'last_watched_at'>[]).reduce((map, row) => {
    const current = map.get(row.course_id) ?? { completedLessons: 0, startedLessons: 0, lastAccessedAt: null };
    const lastAccessedAt = !current.lastAccessedAt || new Date(row.last_watched_at) > new Date(current.lastAccessedAt)
      ? row.last_watched_at
      : current.lastAccessedAt;
    map.set(row.course_id, {
      completedLessons: current.completedLessons + (row.completed ? 1 : 0),
      startedLessons: current.startedLessons + (row.completed || row.watched_seconds > 0 ? 1 : 0),
      lastAccessedAt,
    });
    return map;
  }, new Map<string, StudentPurchasedCourse['progress']>());
}

export async function getMyPurchasedCourses(filters: StudentCourseFilters = {}) {
  const enrollments = await loadMyEnrollments('approved');
  const rows = enrollments.filter((enrollment) => enrollment.courses);
  const progress = await getProgress(rows.map((enrollment) => enrollment.course_id));
  const query = filters.query?.trim().toLowerCase() ?? '';
  let courses = rows.map((enrollment) => ({
    ...(enrollment.courses as CourseWithTeacher),
    enrollment,
    progress: progress.get(enrollment.course_id) ?? { completedLessons: 0, startedLessons: 0, lastAccessedAt: null },
  }));

  if (query) courses = courses.filter((course) => `${course.title} ${course.description} ${course.profiles?.full_name ?? ''}`.toLowerCase().includes(query));
  if (filters.subject) courses = courses.filter((course) => course.subject_id === filters.subject || course.subject === filters.subject);
  if (filters.teacherId) courses = courses.filter((course) => course.teacher_id === filters.teacherId);
  if (filters.level) courses = courses.filter((course) => course.level === filters.level);

  return courses.sort((first, second) => {
    if (filters.sort === 'accessed-recent') return new Date(second.progress.lastAccessedAt ?? 0).getTime() - new Date(first.progress.lastAccessedAt ?? 0).getTime();
    return new Date(second.enrollment.reviewed_at ?? second.enrollment.created_at).getTime() - new Date(first.enrollment.reviewed_at ?? first.enrollment.created_at).getTime();
  });
}

export async function getMyEnrollmentStatuses() {
  const enrollments = await loadMyEnrollments();
  return new Map(enrollments.map((enrollment) => [enrollment.course_id, enrollment]));
}

export async function getMyPendingEnrollments() {
  return loadMyEnrollments('pending');
}

export async function getMyRejectedEnrollments() {
  return loadMyEnrollments('rejected');
}

export async function getMyApprovedEnrollments() {
  return loadMyEnrollments('approved');
}

export async function getPurchasedCourseIds() {
  return (await getMyApprovedEnrollments()).map((enrollment) => enrollment.course_id);
}
