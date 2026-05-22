import { logSupabaseError } from './debug';
import { supabase } from './supabase';
import { QuestionWithStudent } from '../types/database';
import { getTeacherAnsweredQuestionIds } from '../services/answersService';
import { ensureCurrentUserIsNotBlocked } from '../services/accountGuards';

const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const maxImageSize = 5 * 1024 * 1024;

function withAnswerCount(question: QuestionWithStudent): QuestionWithStudent {
  return {
    ...question,
    answer_count: question.answers?.length ?? question.answer_count ?? 0,
  };
}

export function validateQuestionImage(file: File) {
  if (!allowedImageTypes.includes(file.type)) {
    return 'Image must be JPG, PNG, or WebP.';
  }

  if (file.size > maxImageSize) {
    return 'Image must be less than 5MB.';
  }

  return '';
}

export async function uploadQuestionImage(file: File, userId: string) {
  const validationError = validateQuestionImage(file);
  if (validationError) throw new Error(validationError);

  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-');
  const path = `questions/${userId}/${Date.now()}-${safeName || 'question-image'}.webp`;
  const { error } = await supabase.storage.from('question-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    logSupabaseError('question.image.upload', error);
    throw error;
  }

  return supabase.storage.from('question-images').getPublicUrl(path).data.publicUrl;
}

export async function createQuestion(input: {
  studentId: string;
  title: string;
  description: string;
  subject: string;
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
