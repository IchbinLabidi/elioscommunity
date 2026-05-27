import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CourseWithTeacher, QuestionWithStudent, Subject } from '../types/database';

export type AdminSubjectStatus = 'all' | 'published' | 'unpublished' | 'hidden' | 'featured';
export type AdminSubjectAction = 'publish' | 'unpublish' | 'hide' | 'unhide' | 'feature' | 'unfeature' | 'delete';
export type AdminSubjectFilters = {
  query?: string;
  status?: AdminSubjectStatus;
  sort?: 'order' | 'newest' | 'courses' | 'questions' | 'alphabetical';
};
export type SubjectPayload = Pick<Subject, 'name' | 'slug' | 'description' | 'cover_url' | 'icon' | 'icon_url' | 'color' | 'subject_order' | 'is_published' | 'is_featured'>;
export type AdminSubjectSummary = Subject & {
  coursesCount: number;
  questionsCount: number;
  teachersCount: number;
};
export type AdminSubjectTotals = {
  total: number;
  published: number;
  hidden: number;
  featured: number;
  courses: number;
  questions: number;
};

function fail(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

function isLinked(subject: Subject, row: { subject_id?: string | null; subject?: string | null }) {
  return row.subject_id === subject.id || row.subject?.trim().toLowerCase() === subject.name.trim().toLowerCase();
}

async function summaries() {
  const [subjectsResult, coursesResult, questionsResult] = await Promise.all([
    supabase.from('subjects').select('*').order('subject_order').order('name'),
    supabase.from('courses').select('id, subject_id, subject, teacher_id'),
    supabase.from('questions').select('id, subject_id, subject'),
  ]);
  const error = subjectsResult.error ?? coursesResult.error ?? questionsResult.error;
  if (error) return fail('adminSubjects.list', error);

  return ((subjectsResult.data ?? []) as Subject[]).map((subject) => {
    const courses = (coursesResult.data ?? []).filter((row) => isLinked(subject, row));
    const questions = (questionsResult.data ?? []).filter((row) => isLinked(subject, row));
    return {
      ...subject,
      coursesCount: courses.length,
      questionsCount: questions.length,
      teachersCount: new Set(courses.map((course) => course.teacher_id)).size,
    };
  });
}

export async function getAdminSubjects(filters: AdminSubjectFilters = {}) {
  let rows = await summaries();
  const query = filters.query?.trim().toLowerCase() ?? '';
  if (query) rows = rows.filter((subject) => `${subject.name} ${subject.slug} ${subject.description ?? ''}`.toLowerCase().includes(query));
  if (filters.status && filters.status !== 'all') {
    rows = rows.filter((subject) => {
      if (filters.status === 'published') return subject.is_published && !subject.is_hidden;
      if (filters.status === 'unpublished') return !subject.is_published;
      if (filters.status === 'hidden') return Boolean(subject.is_hidden);
      return Boolean(subject.is_featured);
    });
  }
  return rows.sort((first, second) => {
    if (filters.sort === 'newest') return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
    if (filters.sort === 'courses') return second.coursesCount - first.coursesCount;
    if (filters.sort === 'questions') return second.questionsCount - first.questionsCount;
    if (filters.sort === 'alphabetical') return first.name.localeCompare(second.name, 'fr');
    return first.subject_order - second.subject_order || first.name.localeCompare(second.name, 'fr');
  });
}

export async function getAdminSubjectTotals(): Promise<AdminSubjectTotals> {
  const rows = await summaries();
  return {
    total: rows.length,
    published: rows.filter((subject) => subject.is_published && !subject.is_hidden).length,
    hidden: rows.filter((subject) => subject.is_hidden).length,
    featured: rows.filter((subject) => subject.is_featured).length,
    courses: rows.reduce((sum, subject) => sum + subject.coursesCount, 0),
    questions: rows.reduce((sum, subject) => sum + subject.questionsCount, 0),
  };
}

export async function getAdminSubjectById(subjectId: string) {
  return (await summaries()).find((subject) => subject.id === subjectId) ?? null;
}

export async function getSubjectCourses(subjectId: string) {
  const subject = await getAdminSubjectById(subjectId);
  if (!subject) return [];
  const { data, error } = await supabase.from('courses').select('*, profiles:teacher_id(id,full_name,avatar_url,specialty)').order('created_at', { ascending: false });
  if (error) return fail('adminSubjects.courses', error);
  return (data ?? []).filter((course) => isLinked(subject, course)) as unknown as CourseWithTeacher[];
}

export async function getSubjectQuestions(subjectId: string) {
  const subject = await getAdminSubjectById(subjectId);
  if (!subject) return [];
  const { data, error } = await supabase.from('questions').select('*, profiles:student_id(full_name,avatar_url), answers:answers!answers_question_id_fkey(id)').order('created_at', { ascending: false });
  if (error) return fail('adminSubjects.questions', error);
  return (data ?? []).filter((question) => isLinked(subject, question)) as QuestionWithStudent[];
}

export function generateSubjectSlug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function isSubjectSlugAvailable(slug: string, exceptId?: string) {
  let query = supabase.from('subjects').select('id').eq('slug', slug);
  if (exceptId) query = query.neq('id', exceptId);
  const { data, error } = await query.maybeSingle();
  if (error) return fail('adminSubjects.slug', error);
  return !data;
}

export async function createSubject(payload: SubjectPayload) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('subjects').insert({ ...payload, created_by: auth.user?.id, updated_by: auth.user?.id }).select().single();
  if (error) return fail('adminSubjects.create', error);
  return data as Subject;
}

export async function updateSubject(subjectId: string, payload: Partial<SubjectPayload>) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('subjects').update({ ...payload, updated_by: auth.user?.id }).eq('id', subjectId).select().single();
  if (error) return fail('adminSubjects.update', error);
  return data as Subject;
}

export async function manageSubject(subjectId: string, action: AdminSubjectAction, reason?: string) {
  const { data, error } = await supabase.rpc('admin_manage_subject', { target_subject_id: subjectId, admin_action: action, reason: reason || null });
  if (error) return fail(`adminSubjects.${action}`, error);
  return data as Subject;
}

export async function checkSubjectCanDelete(subjectId: string) {
  const subject = await getAdminSubjectById(subjectId);
  return Boolean(subject && subject.coursesCount === 0 && subject.questionsCount === 0);
}
