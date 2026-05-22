import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Profile, TeacherPublicStats, TeacherRatingStats, TeacherRatingWithStudent, TeacherStats, TeacherWithStats } from '../types/database';
import { getTeacherRatings, getTeacherRatingStats } from './ratingsService';

export type TeacherFilters = {
  query?: string;
  subject?: string;
  minRating?: number;
  verifiedOnly?: boolean;
  sort?: 'highest-rated' | 'most-answers' | 'newest';
};

function statOf(teacher: TeacherWithStats) {
  return Array.isArray(teacher.teacher_public_stats) ? teacher.teacher_public_stats[0] : teacher.teacher_public_stats;
}

type RawTeacherPublicStats = Partial<TeacherPublicStats> & {
  teacher_id: string;
  total_followers?: number | null;
};

function emptyStats(teacherId: string): TeacherPublicStats {
  return {
    teacher_id: teacherId,
    average_rating: 0,
    total_ratings: 0,
    total_reviews: 0,
    total_answers: 0,
    total_best_answers: 0,
    total_courses: 0,
    follower_count: 0,
  };
}

function normalizePublicStats(row: RawTeacherPublicStats): TeacherPublicStats {
  return {
    teacher_id: row.teacher_id,
    average_rating: Number(row.average_rating ?? 0),
    total_ratings: Number(row.total_ratings ?? 0),
    total_reviews: Number(row.total_reviews ?? 0),
    total_answers: Number(row.total_answers ?? 0),
    total_best_answers: Number(row.total_best_answers ?? 0),
    total_courses: Number(row.total_courses ?? 0),
    follower_count: Number(row.follower_count ?? row.total_followers ?? 0),
  };
}

async function getPublishedCourseCounts(teacherIds: string[]) {
  const { data, error } = await supabase
    .from('courses')
    .select('teacher_id')
    .in('teacher_id', teacherIds)
    .eq('is_published', true)
    .eq('is_hidden', false);

  if (error) {
    logSupabaseError('teachers.stats.courseCounts', error);
    return new Map<string, number>();
  }

  return (data ?? []).reduce((counts, course) => {
    const teacherId = String(course.teacher_id);
    counts.set(teacherId, (counts.get(teacherId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}

async function getLegacyStatsForTeachers(teacherIds: string[]) {
  const { data, error } = await supabase
    .from('teacher_stats')
    .select('*')
    .in('teacher_id', teacherIds);

  if (error) {
    logSupabaseError('teachers.stats.legacy', error);
    return new Map<string, TeacherStats>();
  }

  return new Map(((data ?? []) as TeacherStats[]).map((stat) => [stat.teacher_id, stat]));
}

async function getAnswerCountsForTeachers(teacherIds: string[]) {
  const { data, error } = await supabase
    .from('answers')
    .select('teacher_id, is_best')
    .in('teacher_id', teacherIds)
    .eq('is_hidden', false);

  if (error) {
    logSupabaseError('teachers.stats.answerCounts', error);
    return new Map<string, { totalAnswers: number; totalBestAnswers: number }>();
  }

  return (data ?? []).reduce((counts, answer) => {
    const teacherId = String(answer.teacher_id);
    const current = counts.get(teacherId) ?? { totalAnswers: 0, totalBestAnswers: 0 };
    counts.set(teacherId, {
      totalAnswers: current.totalAnswers + 1,
      totalBestAnswers: current.totalBestAnswers + (answer.is_best ? 1 : 0),
    });
    return counts;
  }, new Map<string, { totalAnswers: number; totalBestAnswers: number }>());
}

async function getRatingStatsForTeachers(teacherIds: string[]) {
  const results = await Promise.all(teacherIds.map(async (teacherId) => {
    try {
      return await getTeacherRatingStats(teacherId);
    } catch {
      return null;
    }
  }));

  return new Map(results.filter((stat): stat is TeacherRatingStats => Boolean(stat)).map((stat) => [stat.teacher_id, stat]));
}

async function getFollowerCountsForTeachers(teacherIds: string[]) {
  const results = await Promise.all(teacherIds.map(async (teacherId) => {
    const { data, error } = await supabase.rpc('get_teacher_follower_count', { target_teacher_id: teacherId });
    if (error) {
      logSupabaseError('teachers.stats.followerCount', error);
      return [teacherId, 0] as const;
    }
    return [teacherId, Number(data ?? 0)] as const;
  }));

  return new Map(results);
}

async function fillMissingStats(teacherIds: string[], stats: Map<string, TeacherPublicStats>) {
  const missingIds = teacherIds.filter((teacherId) => !stats.has(teacherId));
  const [courseCounts, legacyStats, answerCounts, ratingStats, followerCounts] = await Promise.all([
    getPublishedCourseCounts(teacherIds),
    missingIds.length ? getLegacyStatsForTeachers(missingIds) : Promise.resolve(new Map<string, TeacherStats>()),
    missingIds.length ? getAnswerCountsForTeachers(missingIds) : Promise.resolve(new Map<string, { totalAnswers: number; totalBestAnswers: number }>()),
    missingIds.length ? getRatingStatsForTeachers(missingIds) : Promise.resolve(new Map<string, TeacherRatingStats>()),
    missingIds.length ? getFollowerCountsForTeachers(missingIds) : Promise.resolve(new Map<string, number>()),
  ]);

  teacherIds.forEach((teacherId) => {
    const current = stats.get(teacherId) ?? emptyStats(teacherId);
    const legacy = legacyStats.get(teacherId);
    const answers = answerCounts.get(teacherId);
    const ratings = ratingStats.get(teacherId);
    const fallbackCourseCount = Math.max(legacy?.course_count ?? 0, courseCounts.get(teacherId) ?? 0);

    stats.set(teacherId, {
      ...current,
      average_rating: current.average_rating || Number(ratings?.average_rating ?? legacy?.rating_average ?? 0),
      total_ratings: current.total_ratings || Number(ratings?.total_ratings ?? legacy?.rating_count ?? 0),
      total_reviews: current.total_reviews || Number(ratings?.total_reviews ?? 0),
      total_answers: current.total_answers || Number(answers?.totalAnswers ?? legacy?.answer_count ?? 0),
      total_best_answers: current.total_best_answers || Number(answers?.totalBestAnswers ?? 0),
      total_courses: Math.max(current.total_courses, fallbackCourseCount),
      follower_count: current.follower_count || followerCounts.get(teacherId) || 0,
    });
  });

  return stats;
}

async function getStatsForTeachers(teacherIds: string[]) {
  if (!teacherIds.length) return new Map<string, TeacherPublicStats>();
  const { data, error } = await supabase
    .from('teacher_public_stats')
    .select('*')
    .in('teacher_id', teacherIds);

  if (error) {
    logSupabaseError('teachers.stats', error);
    return fillMissingStats(teacherIds, new Map<string, TeacherPublicStats>());
  }

  const stats = new Map(((data ?? []) as RawTeacherPublicStats[]).map((stat) => [stat.teacher_id, normalizePublicStats(stat)]));
  return fillMissingStats(teacherIds, stats);
}

export async function getTeachers(filters: TeacherFilters = {}) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'teacher')
    .eq('is_blocked', false)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('teachers.list', error);
    throw error;
  }

  const stats = await getStatsForTeachers(((data ?? []) as TeacherWithStats[]).map((teacher) => teacher.id));
  const query = filters.query?.trim().toLowerCase() ?? '';
  let teachers = ((data ?? []) as TeacherWithStats[]).map((teacher) => ({
    ...teacher,
    teacher_public_stats: stats.get(teacher.id) ?? null,
  }));

  if (query) {
    teachers = teachers.filter((teacher) =>
      `${teacher.full_name} ${teacher.headline ?? ''} ${teacher.specialty ?? ''} ${teacher.subjects?.join(' ') ?? ''} ${teacher.bio ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  }
  if (filters.subject) teachers = teachers.filter((teacher) => teacher.subjects?.includes(filters.subject!) || teacher.specialty === filters.subject);
  if (filters.verifiedOnly) teachers = teachers.filter((teacher) => teacher.is_verified);
  if (filters.minRating) teachers = teachers.filter((teacher) => Number(statOf(teacher)?.average_rating ?? 0) >= filters.minRating!);

  return teachers.sort((a, b) => {
    if (filters.sort === 'highest-rated') return Number(statOf(b)?.average_rating ?? 0) - Number(statOf(a)?.average_rating ?? 0);
    if (filters.sort === 'most-answers') return Number(statOf(b)?.total_answers ?? 0) - Number(statOf(a)?.total_answers ?? 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export async function getTeacherById(teacherId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', teacherId)
    .eq('role', 'teacher')
    .single();

  if (error) {
    logSupabaseError('teachers.detail', error);
    throw error;
  }

  const stats = await getStatsForTeachers([teacherId]);
  return {
    ...(data as TeacherWithStats),
    teacher_public_stats: stats.get(teacherId) ?? null,
  };
}

export async function updateTeacherProfile(profileData: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', profileData.id)
    .select()
    .single();

  if (error) {
    logSupabaseError('teachers.updateProfile', error);
    throw error;
  }

  return data as Profile;
}

export function getTeacherStats(teacher: TeacherWithStats, publishedCourseCount = 0): TeacherPublicStats | null {
  const stats = (Array.isArray(teacher.teacher_public_stats) ? teacher.teacher_public_stats[0] : teacher.teacher_public_stats) ?? null;
  if (!stats && !publishedCourseCount) return null;

  const normalized = normalizePublicStats({ ...(stats ?? emptyStats(teacher.id)), teacher_id: teacher.id });
  return {
    ...normalized,
    total_courses: Math.max(normalized.total_courses, publishedCourseCount),
  };
}

export async function getTeacherReviews(teacherId: string): Promise<TeacherRatingWithStudent[]> {
  return getTeacherRatings(teacherId);
}
