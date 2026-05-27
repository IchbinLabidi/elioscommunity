import { logSupabaseError } from '../lib/debug';
import { subjects as fallbackNames } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { Subject } from '../types/database';

function subjectSlug(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function fallbackSubjects(): Subject[] {
  return fallbackNames.map((name, index) => ({
    id: `fallback-${subjectSlug(name)}`,
    name,
    slug: subjectSlug(name),
    description: null,
    cover_url: null,
    icon: null,
    is_published: true,
    subject_order: index + 1,
    created_at: '',
  }));
}

export async function getPublishedSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('is_published', true)
    .eq('is_hidden', false)
    .order('subject_order')
    .order('name');

  if (error) {
    logSupabaseError('subjects.published', error);
    return fallbackSubjects();
  }

  return data?.length ? data as Subject[] : fallbackSubjects();
}

export async function getSubjectBySlug(slug: string) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .eq('is_hidden', false)
    .single();

  if (error) {
    logSupabaseError('subjects.bySlug', error);
    const fallback = fallbackSubjects().find((subject) => subject.slug === slug);
    if (fallback) return fallback;
    throw error;
  }

  return data as Subject;
}

export async function getSubjectsWithCourseCount() {
  const subjects = await getPublishedSubjects();
  const { data, error } = await supabase
    .from('courses')
    .select('id, subject_id')
    .eq('is_published', true)
    .eq('is_hidden', false);

  if (error) {
    logSupabaseError('subjects.courseCounts', error);
    return subjects.map((subject) => ({ ...subject, course_count: 0, lesson_count: 0 }));
  }

  return subjects.map((subject) => {
    const rows = (data ?? []).filter((course) => course.subject_id === subject.id);
    return {
      ...subject,
      course_count: rows.length,
      lesson_count: 0,
    };
  });
}

export async function adminCreateSubject(data: Partial<Subject>) {
  const { data: created, error } = await supabase.from('subjects').insert(data).select().single();
  if (error) {
    logSupabaseError('subjects.adminCreate', error);
    throw error;
  }
  return created as Subject;
}

export async function adminUpdateSubject(subjectId: string, data: Partial<Subject>) {
  const { data: updated, error } = await supabase.from('subjects').update(data).eq('id', subjectId).select().single();
  if (error) {
    logSupabaseError('subjects.adminUpdate', error);
    throw error;
  }
  return updated as Subject;
}
