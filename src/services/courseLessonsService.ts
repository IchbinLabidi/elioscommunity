import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { CourseLesson } from '../types/database';
import { UploadProgressOptions, uploadCoursePdf as uploadPdfFile, uploadCourseVideo as uploadVideoFile } from './uploadService';

export type LessonPayload = Omit<CourseLesson, 'id' | 'created_at' | 'updated_at'>;

export type LessonFormPayload = Pick<
  CourseLesson,
  'title' | 'description' | 'lesson_order' | 'video_url' | 'is_free_preview' | 'is_published'
>;

async function createSignedUrl(bucket: 'course-videos' | 'course-pdfs', path: string, action: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) {
    logSupabaseError(action, error);
    return null;
  }
  return data.signedUrl;
}

async function attachSignedContentUrls(lessons: CourseLesson[]) {
  return Promise.all(lessons.map(async (lesson) => {
    const [videoSignedUrl, pdfSignedUrl] = await Promise.all([
      lesson.video_path ? createSignedUrl('course-videos', lesson.video_path, 'courseLessons.video.signedUrl') : Promise.resolve(null),
      lesson.pdf_path ? createSignedUrl('course-pdfs', lesson.pdf_path, 'courseLessons.pdf.signedUrl') : Promise.resolve(null),
    ]);

    return {
      ...lesson,
      video_url: videoSignedUrl ?? lesson.video_url,
      pdf_url: pdfSignedUrl ?? lesson.pdf_url,
    };
  }));
}

export async function getLessonsByCourseId(courseId: string) {
  const { data, error } = await supabase
    .from('course_lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('lesson_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError('courseLessons.list', error);
    throw error;
  }

  return attachSignedContentUrls((data ?? []) as CourseLesson[]);
}

export async function getPublicLessonsByCourseId(courseId: string) {
  const { data, error } = await supabase
    .from('course_lesson_public_outline')
    .select('*')
    .eq('course_id', courseId)
    .order('lesson_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    logSupabaseError('courseLessons.publicList', error);
    throw error;
  }

  return attachSignedContentUrls((data ?? []) as CourseLesson[]);
}

export async function getTeacherLessonsByCourseId(courseId: string) {
  return getLessonsByCourseId(courseId);
}

export async function createLesson(courseId: string, teacherId: string, lessonData: LessonFormPayload) {
  const payload: LessonPayload = {
    course_id: courseId,
    teacher_id: teacherId,
    title: lessonData.title,
    description: lessonData.description,
    lesson_order: lessonData.lesson_order,
    video_url: lessonData.video_url,
    video_path: null,
    pdf_url: null,
    pdf_path: null,
    is_free_preview: lessonData.is_free_preview,
    is_published: lessonData.is_published,
  };

  const { data, error } = await supabase.from('course_lessons').insert(payload).select().single();
  if (error) {
    logSupabaseError('courseLessons.create', error);
    throw error;
  }
  return data as CourseLesson;
}

export async function updateLesson(lessonId: string, lessonData: Partial<LessonPayload>) {
  const { data, error } = await supabase.from('course_lessons').update(lessonData).eq('id', lessonId).select().single();
  if (error) {
    logSupabaseError('courseLessons.update', error);
    throw error;
  }
  return data as CourseLesson;
}

export async function deleteLesson(lessonId: string) {
  const { error } = await supabase.from('course_lessons').delete().eq('id', lessonId);
  if (error) {
    logSupabaseError('courseLessons.delete', error);
    throw error;
  }
}

export async function toggleLessonPublished(lessonId: string, isPublished: boolean) {
  return updateLesson(lessonId, { is_published: isPublished });
}

export async function uploadLessonVideo(file: File, teacherId: string, courseId: string, lessonId: string, options?: UploadProgressOptions) {
  return uploadVideoFile(file, teacherId, courseId, lessonId, options);
}

export async function uploadLessonPdf(file: File, teacherId: string, courseId: string, lessonId: string, options?: UploadProgressOptions) {
  return uploadPdfFile(file, teacherId, courseId, lessonId, options);
}
