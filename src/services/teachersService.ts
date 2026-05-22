import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Profile, TeacherPublicStats, TeacherRatingWithStudent, TeacherWithStats } from '../types/database';
import { getTeacherRatings } from './ratingsService';

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

async function getStatsForTeachers(teacherIds: string[]) {
  if (!teacherIds.length) return new Map<string, TeacherPublicStats>();
  const { data, error } = await supabase
    .from('teacher_public_stats')
    .select('*')
    .in('teacher_id', teacherIds);

  if (error) {
    logSupabaseError('teachers.stats', error);
    throw error;
  }

  return new Map(((data ?? []) as TeacherPublicStats[]).map((stat) => [stat.teacher_id, stat]));
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

export function getTeacherStats(teacher: TeacherWithStats): TeacherPublicStats | null {
  return (Array.isArray(teacher.teacher_public_stats) ? teacher.teacher_public_stats[0] : teacher.teacher_public_stats) ?? null;
}

export async function getTeacherReviews(teacherId: string): Promise<TeacherRatingWithStudent[]> {
  return getTeacherRatings(teacherId);
}
