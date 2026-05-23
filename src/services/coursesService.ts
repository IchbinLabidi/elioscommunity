import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Course, CourseEnrollment, CourseWithTeacher, TeacherPublicStats } from '../types/database';
import { ensureCurrentTeacherCanAct } from './accountGuards';
import { getMyEnrollmentsByCourseId } from './enrollmentsService';
import { uploadCourseCover as uploadCourseCoverFile } from './uploadService';
import { notifyTeacherNewCourse } from './notificationsService';

export type CourseFilters = {
  query?: string;
  subject?: string;
  level?: string;
  format?: string;
  teacherId?: string;
  priceType?: 'free' | 'paid' | '';
  accessStatus?: 'all' | 'purchased' | 'not-purchased' | 'pending';
  sort?: 'newest' | 'price-low' | 'price-high' | 'highest-rated-teacher';
};

export type CoursePayload = Omit<Course, 'id' | 'created_at' | 'updated_at' | 'lesson_count'>;

const publicCourseFields = 'id, subject_id, teacher_id, title, description, subject, level, price, currency, duration, format, cover_url, course_link, contact_whatsapp, payment_instructions, payment_method, payment_phone, payment_bank_account, is_published, created_at, updated_at';
const courseSelect = `${publicCourseFields}, profiles:teacher_id(id, full_name, avatar_url, specialty), subjects:subject_id(*)`;

async function attachTeacherStats(courses: CourseWithTeacher[]) {
  const teacherIds = Array.from(new Set(courses.map((course) => course.teacher_id)));
  if (!teacherIds.length) return courses;

  const { data, error } = await supabase
    .from('teacher_public_stats')
    .select('*')
    .in('teacher_id', teacherIds);

  if (error) {
    logSupabaseError('courses.teacherStats', error);
    return courses;
  }

  const stats = new Map(((data ?? []) as TeacherPublicStats[]).map((stat) => [stat.teacher_id, stat]));
  return courses.map((course) => ({
    ...course,
    profiles: course.profiles ? {
      ...course.profiles,
      teacher_public_stats: stats.get(course.teacher_id) ?? null,
    } : course.profiles,
  }));
}

export async function getLessonCountsByCourseIds(courseIds: string[], publicOutline = false) {
  if (!courseIds.length) return new Map<string, number>();
  const { data, error } = await supabase
    .from(publicOutline ? 'course_curriculum_public' : 'course_chapters')
    .select('course_id')
    .in('course_id', courseIds);

  if (error) {
    logSupabaseError('courses.lessonCounts', error);
    return new Map<string, number>();
  }

  return (data ?? []).reduce((counts, lesson) => {
    const courseId = String(lesson.course_id);
    counts.set(courseId, (counts.get(courseId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function attachLessonCounts<T extends Course>(courses: T[], publicOutline = false) {
  const counts = await getLessonCountsByCourseIds(courses.map((course) => course.id), publicOutline);
  return courses.map((course) => ({ ...course, lesson_count: counts.get(course.id) ?? 0 }));
}

export async function getPublishedCourses(filters: CourseFilters = {}) {
  const { data, error } = await supabase
    .from('courses')
    .select(courseSelect)
    .eq('is_published', true)
    .eq('is_hidden', false)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('courses.published', error);
    throw error;
  }

  const query = filters.query?.trim().toLowerCase() ?? '';
  let courses = await attachLessonCounts(await attachTeacherStats((data ?? []) as unknown as CourseWithTeacher[]), true);
  if (query) courses = courses.filter((course) => `${course.title} ${course.description} ${course.subject}`.toLowerCase().includes(query));
  if (filters.subject) courses = courses.filter((course) => course.subject === filters.subject || course.subject_id === filters.subject);
  if (filters.level) courses = courses.filter((course) => course.level === filters.level);
  if (filters.format) courses = courses.filter((course) => course.format === filters.format);
  if (filters.teacherId) courses = courses.filter((course) => course.teacher_id === filters.teacherId);
  if (filters.priceType === 'free') courses = courses.filter((course) => Number(course.price) === 0);
  if (filters.priceType === 'paid') courses = courses.filter((course) => Number(course.price) > 0);

  return courses.sort((a, b) => {
    if (filters.sort === 'price-low') return Number(a.price) - Number(b.price);
    if (filters.sort === 'price-high') return Number(b.price) - Number(a.price);
    if (filters.sort === 'highest-rated-teacher') {
      const firstRating = Number(Array.isArray(a.profiles?.teacher_public_stats) ? a.profiles?.teacher_public_stats[0]?.average_rating : a.profiles?.teacher_public_stats?.average_rating ?? 0);
      const secondRating = Number(Array.isArray(b.profiles?.teacher_public_stats) ? b.profiles?.teacher_public_stats[0]?.average_rating : b.profiles?.teacher_public_stats?.average_rating ?? 0);
      return secondRating - firstRating;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getCourseCatalog(filters: CourseFilters = {}, currentStudentId?: string) {
  const [courses, enrollmentMap] = await Promise.all([
    getPublishedCourses(filters),
    currentStudentId ? getMyEnrollmentsByCourseId() : Promise.resolve(new Map<string, CourseEnrollment>()),
  ]);

  const accessFiltered = courses.filter((course) => {
    const status = enrollmentMap.get(course.id)?.status;
    if (!filters.accessStatus || filters.accessStatus === 'all') return true;
    if (filters.accessStatus === 'purchased') return status === 'approved';
    if (filters.accessStatus === 'pending') return status === 'pending';
    return status !== 'approved' && status !== 'pending';
  });

  return { courses: accessFiltered, enrollmentMap };
}

export async function getCourseAccessStatus(courseId: string, studentId?: string) {
  if (!studentId) return null;
  const enrollment = (await getMyEnrollmentsByCourseId()).get(courseId);
  return enrollment?.status ?? null;
}

export async function getRecommendedCourses(studentId: string) {
  const { courses, enrollmentMap } = await getCourseCatalog({ sort: 'newest' }, studentId);
  return courses
    .filter((course) => Number(course.price) === 0 || !['approved', 'pending'].includes(enrollmentMap.get(course.id)?.status ?? ''))
    .slice(0, 4);
}

export async function getCoursesByTeacherId(teacherId: string, includeUnpublished = false) {
  const select = includeUnpublished ? '*, subjects:subject_id(*)' : `${publicCourseFields}, subjects:subject_id(*)`;
  let query = supabase.from('courses').select(select).eq('teacher_id', teacherId).eq('is_hidden', false).eq('is_deleted', false).order('created_at', { ascending: false });
  if (!includeUnpublished) query = query.eq('is_published', true);
  const { data, error } = await query;
  if (error) {
    logSupabaseError('courses.byTeacher', error);
    throw error;
  }
  return attachLessonCounts((data ?? []) as unknown as Course[]);
}

export async function getMyCourses(teacherId: string) {
  return getCoursesByTeacherId(teacherId, true);
}

export async function getCourseById(courseId: string) {
  const { data, error } = await supabase.from('courses').select('*, subjects:subject_id(*)').eq('id', courseId).single();
  if (error) {
    logSupabaseError('courses.detail', error);
    throw error;
  }
  const course = data as Course;
  if (course.is_published) void notifyTeacherNewCourse(course.teacher_id, course.id);
  return course;
}

export async function getPublishedCourseById(courseId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select(courseSelect)
    .eq('id', courseId)
    .eq('is_published', true)
    .eq('is_hidden', false)
    .eq('is_deleted', false)
    .single();
  if (error) {
    logSupabaseError('courses.publicDetail', error);
    throw error;
  }
  const [course] = await attachLessonCounts(await attachTeacherStats([data as unknown as CourseWithTeacher]));
  return course;
}

export async function createCourse(courseData: CoursePayload) {
  await ensureCurrentTeacherCanAct('courses.create');
  const { data, error } = await supabase.from('courses').insert(courseData).select().single();
  if (error) {
    logSupabaseError('courses.create', error);
    throw error;
  }
  return data as Course;
}

export async function updateCourse(courseId: string, courseData: Partial<CoursePayload>) {
  await ensureCurrentTeacherCanAct('courses.update', true);
  const { data, error } = await supabase.from('courses').update(courseData).eq('id', courseId).select().single();
  if (error) {
    logSupabaseError('courses.update', error);
    throw error;
  }
  return data as Course;
}

export async function deleteCourse(courseId: string) {
  await ensureCurrentTeacherCanAct('courses.delete', true);
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) {
    logSupabaseError('courses.delete', error);
    throw error;
  }
}

export async function toggleCoursePublished(courseId: string, isPublished: boolean) {
  const course = await updateCourse(courseId, { is_published: isPublished });
  if (isPublished) void notifyTeacherNewCourse(course.teacher_id, course.id);
  return course;
}

export const uploadCourseCover = uploadCourseCoverFile;
