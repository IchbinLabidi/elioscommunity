import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { TeacherRating, TeacherRatingStats, TeacherRatingWithStudent } from '../types/database';
import { ensureCurrentUserIsNotBlocked } from './accountGuards';

type RawTeacherRating = TeacherRating & {
  student_full_name?: string | null;
  student_avatar_url?: string | null;
  question_title?: string | null;
};

function mapTeacherRating(row: RawTeacherRating): TeacherRatingWithStudent {
  return {
    id: row.id,
    student_id: row.student_id,
    teacher_id: row.teacher_id,
    question_id: row.question_id,
    answer_id: row.answer_id,
    rating: row.rating,
    review: row.review,
    created_at: row.created_at,
    updated_at: row.updated_at,
    question_title: row.question_title ?? null,
    profiles: {
      full_name: row.student_full_name || 'Student',
      avatar_url: row.student_avatar_url ?? null,
    },
  };
}

export async function createTeacherRating(teacherId: string, questionId: string, answerId: string | null, rating: number, review: string) {
  await ensureCurrentUserIsNotBlocked('ratings.create');
  const { data, error } = await supabase.rpc('create_teacher_rating', {
    target_teacher_id: teacherId,
    target_question_id: questionId,
    target_answer_id: answerId,
    rating_value: rating,
    review_text: review || null,
  });

  if (error) {
    logSupabaseError('ratings.create', error);
    throw error;
  }

  return data as TeacherRating;
}

export async function updateTeacherRating(ratingId: string, rating: number, review: string) {
  const { data, error } = await supabase.rpc('update_teacher_rating', {
    target_rating_id: ratingId,
    rating_value: rating,
    review_text: review || null,
  });

  if (error) {
    logSupabaseError('ratings.update', error);
    throw error;
  }

  return data as TeacherRating;
}

export async function getTeacherRatings(teacherId: string) {
  const { data, error } = await supabase.rpc('list_teacher_ratings', {
    target_teacher_id: teacherId,
  });

  if (error) {
    logSupabaseError('ratings.teacherList', error);
    throw error;
  }

  return ((data ?? []) as RawTeacherRating[]).map(mapTeacherRating);
}

export async function getTeacherRatingStats(teacherId: string) {
  const { data, error } = await supabase.rpc('get_teacher_rating_stats', {
    target_teacher_id: teacherId,
  });

  if (error) {
    logSupabaseError('ratings.teacherStats', error);
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    teacher_id: teacherId,
    average_rating: Number(row?.average_rating ?? 0),
    total_ratings: Number(row?.total_ratings ?? 0),
    total_reviews: Number(row?.total_reviews ?? 0),
  } as TeacherRatingStats;
}

export async function getMyRatingForQuestionTeacher(questionId: string, teacherId: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logSupabaseError('ratings.authUser', authError);
    throw authError;
  }
  const studentId = authData.user?.id;
  if (!studentId) return null;

  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('question_id', questionId)
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .eq('is_hidden', false)
    .maybeSingle();

  if (error) {
    logSupabaseError('ratings.myQuestionTeacher', error);
    throw error;
  }

  return data as TeacherRating | null;
}

export async function getRatingsForAnswers(questionId: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logSupabaseError('ratings.authUser.answers', authError);
    throw authError;
  }
  const studentId = authData.user?.id;
  if (!studentId) return new Map<string, TeacherRating>();

  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('question_id', questionId)
    .eq('student_id', studentId)
    .eq('is_hidden', false);

  if (error) {
    logSupabaseError('ratings.forAnswers', error);
    throw error;
  }

  return new Map((data ?? []).map((rating) => [rating.teacher_id as string, rating as TeacherRating]));
}
