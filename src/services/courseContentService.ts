import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import {
  ChapterAttachment,
  ChapterVideo,
  Course,
  CourseChapter,
  CourseChapterWithContent,
  CourseModuleWithContent,
  CourseWithContent,
  CourseWithTeacher,
} from '../types/database';
import { ensureCurrentUserIsNotBlocked } from './accountGuards';

type ChapterPayload = Pick<CourseChapter, 'title' | 'description' | 'chapter_order' | 'is_free_preview' | 'is_published'>;
type VideoPayload = Pick<ChapterVideo, 'title' | 'description' | 'video_order' | 'video_url' | 'video_path' | 'duration_seconds' | 'is_published'>;
type AttachmentPayload = Pick<ChapterAttachment, 'title' | 'file_url' | 'file_path' | 'file_type' | 'file_size' | 'attachment_order' | 'is_published'>;

async function signedUrl(bucket: 'course-videos' | 'course-attachments' | 'chapter-videos' | 'chapter-attachments', path: string, action: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  if (error) {
    logSupabaseError(action, error);
    return null;
  }
  return data.signedUrl;
}

async function signedUrlWithFallback(
  primaryBucket: 'chapter-videos' | 'chapter-attachments',
  legacyBucket: 'course-videos' | 'course-attachments',
  path: string,
  action: string,
) {
  const primary = await signedUrl(primaryBucket, path, action);
  if (primary) return primary;
  return signedUrl(legacyBucket, path, `${action}.legacy`);
}

async function attachSignedUrls(videos: ChapterVideo[], attachments: ChapterAttachment[]) {
  const signedVideos = await Promise.all(videos.map(async (video) => ({
    ...video,
    video_url: video.video_path ? await signedUrlWithFallback('chapter-videos', 'course-videos', video.video_path, 'chapterVideos.signedUrl') ?? video.video_url : video.video_url,
  })));
  const signedAttachments = await Promise.all(attachments.map(async (attachment) => ({
    ...attachment,
    file_url: attachment.file_path ? await signedUrlWithFallback('chapter-attachments', 'course-attachments', attachment.file_path, 'chapterAttachments.signedUrl') ?? attachment.file_url : attachment.file_url,
  })));
  return { signedVideos, signedAttachments };
}

function composeContent(course: CourseWithTeacher, chapters: CourseChapter[], videos: ChapterVideo[], attachments: ChapterAttachment[]): CourseWithContent {
  const chapterMap = new Map<string, CourseChapterWithContent>();
  chapters.forEach((chapter) => chapterMap.set(chapter.id, { ...chapter, videos: [], attachments: [] }));
  videos.forEach((video) => chapterMap.get(video.chapter_id)?.videos.push(video));
  attachments.forEach((attachment) => chapterMap.get(attachment.chapter_id)?.attachments.push(attachment));

  const chaptersWithContent = Array.from(chapterMap.values()).sort((a, b) => a.chapter_order - b.chapter_order);
  const legacyModule: CourseModuleWithContent = {
    id: `${course.id}-chapters`,
    course_id: course.id,
    teacher_id: course.teacher_id,
    title: 'Chapters',
    description: null,
    module_order: 1,
    is_published: true,
    created_at: '',
    chapters: chaptersWithContent,
  };

  return { ...course, chapters: chaptersWithContent, modules: [legacyModule] };
}

export async function getCourseContentForBuilder(course: CourseWithTeacher | Course) {
  const [modulesResult, chaptersResult, videosResult, attachmentsResult] = await Promise.all([
    Promise.resolve({ data: [], error: null }),
    supabase.from('course_chapters').select('*').eq('course_id', course.id).order('chapter_order'),
    supabase.from('chapter_videos').select('*').eq('course_id', course.id).order('video_order'),
    supabase.from('chapter_attachments').select('*').eq('course_id', course.id).order('attachment_order'),
  ]);

  const error = modulesResult.error ?? chaptersResult.error ?? videosResult.error ?? attachmentsResult.error;
  if (error) {
    logSupabaseError('courseContent.builder', error);
    throw error;
  }

  const { signedVideos, signedAttachments } = await attachSignedUrls((videosResult.data ?? []) as ChapterVideo[], (attachmentsResult.data ?? []) as ChapterAttachment[]);
  return composeContent(
    course as CourseWithTeacher,
    (chaptersResult.data ?? []) as CourseChapter[],
    signedVideos,
    signedAttachments,
  );
}

export async function getPublicCourseContent(course: CourseWithTeacher) {
  const { data: outline, error: outlineError } = await supabase
    .from('course_curriculum_public')
    .select('*')
    .eq('course_id', course.id)
    .order('chapter_order');
  if (outlineError) {
    logSupabaseError('courseContent.publicOutline', outlineError);
    throw outlineError;
  }

  const [videosResult, attachmentsResult] = await Promise.all([
    supabase.from('chapter_videos').select('*').eq('course_id', course.id).eq('is_hidden', false).order('video_order'),
    supabase.from('chapter_attachments').select('*').eq('course_id', course.id).eq('is_hidden', false).order('attachment_order'),
  ]);
  const error = videosResult.error ?? attachmentsResult.error;
  if (error) {
    logSupabaseError('courseContent.publicMedia', error);
    throw error;
  }

  const chapters = new Map<string, CourseChapterWithContent>();
  (outline ?? []).forEach((row) => {
    if (row.chapter_id && !chapters.has(row.chapter_id)) {
      const chapter: CourseChapterWithContent = {
        id: row.chapter_id,
        subject_id: row.subject_id,
        module_id: null,
        course_id: row.course_id,
        teacher_id: row.teacher_id,
        title: row.chapter_title,
        description: row.chapter_description,
        chapter_order: row.chapter_order,
        is_free_preview: row.is_free_preview,
        is_published: true,
        created_at: '',
        videos: [],
        attachments: [],
      };
      chapters.set(row.chapter_id, chapter);
    }
  });

  const { signedVideos, signedAttachments } = await attachSignedUrls((videosResult.data ?? []) as ChapterVideo[], (attachmentsResult.data ?? []) as ChapterAttachment[]);
  signedVideos.forEach((video) => chapters.get(video.chapter_id)?.videos.push(video));
  signedAttachments.forEach((attachment) => chapters.get(attachment.chapter_id)?.attachments.push(attachment));

  const chapterList = Array.from(chapters.values()).sort((a, b) => a.chapter_order - b.chapter_order);
  return {
    ...course,
    chapters: chapterList,
    modules: [{
      id: `${course.id}-chapters`,
      course_id: course.id,
      teacher_id: course.teacher_id,
      title: 'Chapters',
      description: null,
      module_order: 1,
      is_published: true,
      created_at: '',
      chapters: chapterList,
    }],
  } as CourseWithContent;
}

export async function createChapter(course: Course, data: ChapterPayload) {
  await ensureCurrentUserIsNotBlocked('courseChapters.create');
  const { data: created, error } = await supabase.from('course_chapters').insert({ ...data, subject_id: course.subject_id, module_id: null, course_id: course.id, teacher_id: course.teacher_id }).select().single();
  if (error) { logSupabaseError('courseChapters.create', error); throw error; }
  return created as CourseChapter;
}

export async function updateChapter(chapterId: string, data: Partial<ChapterPayload>) {
  await ensureCurrentUserIsNotBlocked('courseChapters.update');
  const { data: updated, error } = await supabase.from('course_chapters').update(data).eq('id', chapterId).select().single();
  if (error) { logSupabaseError('courseChapters.update', error); throw error; }
  return updated as CourseChapter;
}

export async function deleteChapter(chapterId: string) {
  await ensureCurrentUserIsNotBlocked('courseChapters.delete');
  const { error } = await supabase.from('course_chapters').delete().eq('id', chapterId);
  if (error) { logSupabaseError('courseChapters.delete', error); throw error; }
}

export async function createVideo(chapter: CourseChapter, data: VideoPayload) {
  await ensureCurrentUserIsNotBlocked('chapterVideos.create');
  const { data: created, error } = await supabase.from('chapter_videos').insert({ ...data, subject_id: chapter.subject_id, chapter_id: chapter.id, module_id: null, course_id: chapter.course_id, teacher_id: chapter.teacher_id }).select().single();
  if (error) { logSupabaseError('chapterVideos.create', error); throw error; }
  return created as ChapterVideo;
}

export async function updateVideo(videoId: string, data: Partial<VideoPayload & Pick<ChapterVideo, 'video_path'>>) {
  await ensureCurrentUserIsNotBlocked('chapterVideos.update');
  const { data: updated, error } = await supabase.from('chapter_videos').update(data).eq('id', videoId).select().single();
  if (error) { logSupabaseError('chapterVideos.update', error); throw error; }
  return updated as ChapterVideo;
}

export async function deleteVideo(videoId: string) {
  await ensureCurrentUserIsNotBlocked('chapterVideos.delete');
  const { error } = await supabase.from('chapter_videos').delete().eq('id', videoId);
  if (error) { logSupabaseError('chapterVideos.delete', error); throw error; }
}

export async function createAttachment(chapter: CourseChapter, data: AttachmentPayload) {
  await ensureCurrentUserIsNotBlocked('chapterAttachments.create');
  const { data: created, error } = await supabase.from('chapter_attachments').insert({ ...data, subject_id: chapter.subject_id, chapter_id: chapter.id, module_id: null, course_id: chapter.course_id, teacher_id: chapter.teacher_id }).select().single();
  if (error) { logSupabaseError('chapterAttachments.create', error); throw error; }
  return created as ChapterAttachment;
}

export async function updateAttachment(attachmentId: string, data: Partial<AttachmentPayload>) {
  await ensureCurrentUserIsNotBlocked('chapterAttachments.update');
  const { data: updated, error } = await supabase.from('chapter_attachments').update(data).eq('id', attachmentId).select().single();
  if (error) { logSupabaseError('chapterAttachments.update', error); throw error; }
  return updated as ChapterAttachment;
}

export async function deleteAttachment(attachmentId: string) {
  await ensureCurrentUserIsNotBlocked('chapterAttachments.delete');
  const { error } = await supabase.from('chapter_attachments').delete().eq('id', attachmentId);
  if (error) { logSupabaseError('chapterAttachments.delete', error); throw error; }
}
