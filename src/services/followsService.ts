import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CourseWithTeacher, TeacherFollow, TeacherPublicStats, TeacherWithStats } from '../types/database';
import { ensureCurrentUserIsNotBlocked } from './accountGuards';
import { notifyTeacherFollowed } from './notificationsService';

type FollowedTeacherRow = Pick<TeacherFollow, 'teacher_id'> & {
  teacher?: TeacherWithStats | TeacherWithStats[] | null;
};

const latestCourseSelect = 'id, subject_id, teacher_id, title, description, subject, level, price, currency, duration, format, cover_url, course_link, contact_whatsapp, is_published, created_at, updated_at, profiles:teacher_id(id, full_name, avatar_url, specialty), subjects:subject_id(*)';

async function getStudentId(action: string) {
  const studentId = await ensureCurrentUserIsNotBlocked(action);
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', studentId)
    .maybeSingle();

  if (error) {
    logSupabaseError(`${action}.role`, error);
    throw error;
  }

  if (data?.role !== 'student') throw new Error('Only students can follow teachers.');
  return studentId;
}

async function assertTeacherExists(teacherId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', teacherId)
    .eq('role', 'teacher')
    .maybeSingle();

  if (error) {
    logSupabaseError('follows.teacher', error);
    throw error;
  }

  if (!data) throw new Error('Teacher not found.');
}

async function attachTeacherStats(teachers: TeacherWithStats[]) {
  if (!teachers.length) return teachers;

  const { data, error } = await supabase
    .from('teacher_public_stats')
    .select('*')
    .in('teacher_id', teachers.map((teacher) => teacher.id));

  if (error) {
    logSupabaseError('follows.teacherStats', error);
    return teachers;
  }

  const stats = new Map(((data ?? []) as TeacherPublicStats[]).map((stat) => [stat.teacher_id, stat]));
  return teachers.map((teacher) => ({
    ...teacher,
    teacher_public_stats: stats.get(teacher.id) ?? null,
  }));
}

async function followedTeacherIds(studentId: string) {
  const { data, error } = await supabase
    .from('teacher_follows')
    .select('teacher_id')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('follows.teacherIds', error);
    throw error;
  }

  return (data ?? []).map((follow) => String(follow.teacher_id));
}

export async function followTeacher(teacherId: string) {
  const studentId = await getStudentId('follows.create');
  await assertTeacherExists(teacherId);

  const { data, error } = await supabase
    .from('teacher_follows')
    .insert({ student_id: studentId, teacher_id: teacherId })
    .select('*')
    .single();

  if (error) {
    logSupabaseError('follows.create', error);
    if (error.code === '23505') throw new Error('You already follow this teacher.');
    throw error;
  }

  const follow = data as TeacherFollow;
  void notifyTeacherFollowed(teacherId);
  return follow;
}

export async function unfollowTeacher(teacherId: string) {
  const studentId = await getStudentId('follows.delete');
  const { error } = await supabase
    .from('teacher_follows')
    .delete()
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId);

  if (error) {
    logSupabaseError('follows.delete', error);
    throw error;
  }
}

export async function isFollowingTeacher(teacherId: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logSupabaseError('follows.authUser', authError);
    throw authError;
  }

  if (!authData.user?.id) return false;

  const { data, error } = await supabase
    .from('teacher_follows')
    .select('id')
    .eq('student_id', authData.user.id)
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (error) {
    logSupabaseError('follows.status', error);
    throw error;
  }

  return Boolean(data);
}

export async function getFollowerCount(teacherId: string) {
  const { data, error } = await supabase.rpc('get_teacher_follower_count', {
    target_teacher_id: teacherId,
  });

  if (error) {
    logSupabaseError('follows.count', error);
    throw error;
  }

  return Number(data ?? 0);
}

export async function getFollowedTeachers(studentId: string) {
  const { data, error } = await supabase
    .from('teacher_follows')
    .select('teacher_id, teacher:profiles!teacher_follows_teacher_id_fkey(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('follows.teachers', error);
    throw error;
  }

  const teachers = ((data ?? []) as FollowedTeacherRow[])
    .flatMap((follow) => Array.isArray(follow.teacher) ? follow.teacher : follow.teacher ? [follow.teacher] : [])
    .filter((teacher) => teacher.role === 'teacher' && !teacher.is_blocked);

  return attachTeacherStats(teachers);
}

export async function getMyFollowedTeachers() {
  const studentId = await getStudentId('follows.mine');
  return getFollowedTeachers(studentId);
}

export async function getLatestCoursesFromFollowedTeachers() {
  const studentId = await getStudentId('follows.latestCourses');
  const teacherIds = await followedTeacherIds(studentId);
  if (!teacherIds.length) return [];

  const { data, error } = await supabase
    .from('courses')
    .select(latestCourseSelect)
    .in('teacher_id', teacherIds)
    .eq('is_published', true)
    .eq('is_hidden', false)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(6);

  if (error) {
    logSupabaseError('follows.latestCourses', error);
    throw error;
  }

  return (data ?? []) as unknown as CourseWithTeacher[];
}
