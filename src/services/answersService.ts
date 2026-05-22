import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { AnswerWithTeacher, TeacherStats } from '../types/database';
import { ensureCurrentUserIsNotBlocked } from './accountGuards';

const answerSelect = '*, profiles:teacher_id(full_name, avatar_url, specialty)';

function validateAnswerContent(content: string) {
  const trimmed = content.trim();
  if (trimmed.length < 20) return 'Answer must be at least 20 characters.';
  if (trimmed.length > 5000) return 'Answer must be 5000 characters or less.';
  return '';
}

async function attachTeacherRatings(answers: AnswerWithTeacher[]) {
  const teacherIds = Array.from(new Set(answers.map((answer) => answer.teacher_id)));
  if (!teacherIds.length) return answers;

  const { data, error } = await supabase
    .from('teacher_stats')
    .select('teacher_id, rating_average')
    .in('teacher_id', teacherIds);

  if (error) {
    logSupabaseError('answers.teacherRatings', error);
    return answers;
  }

  const ratings = new Map((data as Pick<TeacherStats, 'teacher_id' | 'rating_average'>[]).map((stat) => [stat.teacher_id, stat.rating_average]));
  return answers.map((answer) => ({
    ...answer,
    rating_average: ratings.get(answer.teacher_id) ?? 0,
  }));
}

export async function getAnswersByQuestionId(questionId: string) {
  const { data, error } = await supabase
    .from('answers')
    .select(answerSelect)
    .eq('question_id', questionId)
    .eq('is_hidden', false)
    .order('is_best', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError('answers.list', error);
    throw error;
  }

  return attachTeacherRatings((data ?? []) as AnswerWithTeacher[]);
}

export async function createAnswer(questionId: string, content: string) {
  const validationError = validateAnswerContent(content);
  if (validationError) throw new Error(validationError);

  const userId = await ensureCurrentUserIsNotBlocked('answers.create');

  const { data, error } = await supabase
    .from('answers')
    .insert({
      question_id: questionId,
      teacher_id: userId,
      content: content.trim(),
    })
    .select(answerSelect)
    .single();

  if (error) {
    logSupabaseError('answers.create', error);
    if (error.code === '23505') {
      throw new Error('You have already answered this question. You can edit your existing answer instead.');
    }
    throw error;
  }

  return data as AnswerWithTeacher;
}

export async function getTeacherAnsweredQuestionIds(teacherId: string) {
  const { data, error } = await supabase
    .from('answers')
    .select('question_id')
    .eq('teacher_id', teacherId);

  if (error) {
    logSupabaseError('answers.teacherQuestionIds', error);
    throw error;
  }

  return new Set((data ?? []).map((answer) => answer.question_id as string));
}

export async function hasTeacherAnsweredQuestion(questionId: string, teacherId: string) {
  const { data, error } = await supabase
    .from('answers')
    .select('id')
    .eq('question_id', questionId)
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (error) {
    logSupabaseError('answers.hasTeacherAnswered', error);
    throw error;
  }

  return Boolean(data);
}

export async function getTeacherAnswerForQuestion(questionId: string, teacherId: string) {
  const { data, error } = await supabase
    .from('answers')
    .select(answerSelect)
    .eq('question_id', questionId)
    .eq('teacher_id', teacherId)
    .maybeSingle();

  if (error) {
    logSupabaseError('answers.teacherAnswerForQuestion', error);
    throw error;
  }

  if (!data) return null;
  const [answer] = await attachTeacherRatings([data as AnswerWithTeacher]);
  return answer;
}

export async function updateAnswer(answerId: string, content: string) {
  const validationError = validateAnswerContent(content);
  if (validationError) throw new Error(validationError);

  const { data: currentAnswer, error: currentAnswerError } = await supabase
    .from('answers')
    .select('is_best')
    .eq('id', answerId)
    .maybeSingle();

  if (currentAnswerError) {
    logSupabaseError('answers.update.precheck', currentAnswerError);
    throw currentAnswerError;
  }

  if (currentAnswer?.is_best) {
    throw new Error('This answer is selected as best answer and cannot be edited. Add a reply instead.');
  }

  const { data, error } = await supabase
    .from('answers')
    .update({ content: content.trim() })
    .eq('id', answerId)
    .select(answerSelect)
    .single();

  if (error) {
    logSupabaseError('answers.update', error);
    throw error;
  }

  return data as AnswerWithTeacher;
}

export async function deleteAnswer(answerId: string, options: { allowBestAnswerDelete?: boolean } = {}) {
  if (!options.allowBestAnswerDelete) {
    const { data: currentAnswer, error: currentAnswerError } = await supabase
      .from('answers')
      .select('is_best')
      .eq('id', answerId)
      .maybeSingle();

    if (currentAnswerError) {
      logSupabaseError('answers.delete.precheck', currentAnswerError);
      throw currentAnswerError;
    }

    if (currentAnswer?.is_best) {
      throw new Error('This answer is selected as best answer and cannot be deleted.');
    }
  }

  const { error } = await supabase.from('answers').delete().eq('id', answerId);

  if (error) {
    logSupabaseError('answers.delete', error);
    throw error;
  }
}

export async function markBestAnswer(questionId: string, answerId: string) {
  const { data, error } = await supabase.rpc('mark_best_answer', {
    target_question_id: questionId,
    target_answer_id: answerId,
  });

  if (error) {
    logSupabaseError('answers.markBest', error);
    throw error;
  }

  return data;
}
