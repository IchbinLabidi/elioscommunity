import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Subject } from '../types/database';

export async function getPublishedSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('is_published', true)
    .order('subject_order');

  if (error) {
    logSupabaseError('subjects.published', error);
    throw error;
  }

  return (data ?? []) as Subject[];
}

export async function getSubjectBySlug(slug: string) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    logSupabaseError('subjects.bySlug', error);
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
