import { logSupabaseError } from './debug';
import { supabase } from './supabase';
import { QuestionWithStudent } from '../types/database';
import { getTeacherAnsweredQuestionIds } from '../services/answersService';
import { ensureCurrentUserIsNotBlocked } from '../services/accountGuards';
import { UploadProgressOptions, uploadQuestionImage as uploadQuestionImageFile, validateImageFile as validateConfiguredImageFile } from '../services/uploadService';

function withAnswerCount(question: QuestionWithStudent): QuestionWithStudent {
  return {
    ...question,
    answer_count: question.answers?.length ?? question.answer_count ?? 0,
  };
}

export function validateQuestionImage(file: File) {
  return validateConfiguredImageFile(file);
}

export async function uploadQuestionImage(file: File, userId: string, options?: UploadProgressOptions) {
  return uploadQuestionImageFile(file, userId, options);
}

export async function createQuestion(input: {
  studentId: string;
  title: string;
  description: string;
  subject: string;
  subjectId?: string | null;
  imageUrl: string | null;
}) {
  await ensureCurrentUserIsNotBlocked('question.create');
  const { data, error } = await supabase
    .from('questions')
    .insert({
      student_id: input.studentId,
      title: input.title,
      description: input.description,
      subject: input.subject,
      subject_id: input.subjectId || null,
      image_url: input.imageUrl,
      status: 'open',
    })
    .select('id')
    .single();

  if (error) {
    logSupabaseError('question.create', error);
    throw error;
  }

  return data as { id: string };
}

export async function getQuestions() {
  const { data, error } = await supabase
    .from('questions')
    .select('*, profiles:student_id(full_name, avatar_url), answers:answers!answers_question_id_fkey(id)')
    .eq('is_hidden', false)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('questions.list', error);
    throw error;
  }

  return ((data ?? []) as QuestionWithStudent[]).map(withAnswerCount);
}

export async function getMyQuestions(studentId: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*, profiles:student_id(full_name, avatar_url), answers:answers!answers_question_id_fkey(id)')
    .eq('student_id', studentId)
    .eq('is_hidden', false)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('questions.mine', error);
    throw error;
  }

  return ((data ?? []) as QuestionWithStudent[]).map(withAnswerCount);
}

export async function getQuestionById(id: string) {
  const { data, error } = await supabase
    .from('questions')
    .select('*, profiles:student_id(full_name, avatar_url), answers:answers!answers_question_id_fkey(id)')
    .eq('id', id)
    .eq('is_hidden', false)
    .eq('is_deleted', false)
    .single();

  if (error) {
    logSupabaseError('question.detail', error);
    throw error;
  }

  return withAnswerCount(data as QuestionWithStudent);
}

export async function getQuestionsWithTeacherAnswerStatus(teacherId: string) {
  const [questions, answeredQuestionIds] = await Promise.all([
    getQuestions(),
    getTeacherAnsweredQuestionIds(teacherId),
  ]);

  return questions.map((question) => ({
    ...question,
    teacher_answered: answeredQuestionIds.has(question.id),
  }));
}
