import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { ChapterVideo, CourseWithContent, CourseWithTeacher, VideoCommentWithUser, VideoNote, VideoProgress } from '../types/database';
import { getPublicCourseContent } from './courseContentService';
import { getPublishedCourseById } from './coursesService';
import { ensureCurrentUserCanParticipate } from './accountGuards';

type VideoCommentRow = {
  id: string;
  video_id: string;
  course_id: string;
  chapter_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  timestamp_seconds: number | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at?: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'student' | 'teacher' | 'admin' | null;
};

function mapVideoComment(row: VideoCommentRow): VideoCommentWithUser {
  return {
    id: row.id,
    video_id: row.video_id,
    course_id: row.course_id,
    chapter_id: row.chapter_id,
    user_id: row.user_id,
    parent_comment_id: row.parent_comment_id,
    content: row.content,
    timestamp_seconds: row.timestamp_seconds,
    is_hidden: row.is_hidden,
    hidden_reason: row.hidden_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
    profiles: {
      full_name: row.full_name ?? 'User',
      avatar_url: row.avatar_url,
      role: row.role ?? 'student',
    },
  };
}

export async function getCourseLearningContent(courseId: string): Promise<CourseWithContent> {
  const course = await getPublishedCourseById(courseId);
  return getPublicCourseContent(course as CourseWithTeacher);
}

export async function getVideoById(videoId: string) {
  const { data, error } = await supabase.from('chapter_videos').select('*').eq('id', videoId).maybeSingle();
  if (error) {
    logSupabaseError('videoLearning.videoById', error);
    throw error;
  }
  return data as ChapterVideo | null;
}

export async function hasCourseVideoAccess(videoId: string) {
  const { data, error } = await supabase.rpc('can_access_course_video', { target_video_id: videoId });
  if (error) {
    logSupabaseError('videoLearning.videoAccess', error);
    return false;
  }
  return Boolean(data);
}

export async function getVideoComments(videoId: string) {
  const { data, error } = await supabase.rpc('list_video_comments', { target_video_id: videoId });
  if (error) {
    logSupabaseError('videoLearning.comments.list', error);
    throw error;
  }
  return ((data ?? []) as VideoCommentRow[]).map(mapVideoComment);
}

export async function createVideoComment(videoId: string, content: string, timestampSeconds?: number | null, parentCommentId?: string | null) {
  await ensureCurrentUserCanParticipate('videoLearning.comments.create');
  const { error } = await supabase.rpc('create_video_comment', {
    target_video_id: videoId,
    comment_content: content,
    timestamp_seconds: timestampSeconds ?? null,
    parent_comment_id: parentCommentId ?? null,
  });
  if (error) {
    logSupabaseError('videoLearning.comments.create', error);
    throw error;
  }
}

export async function updateVideoComment(commentId: string, content: string) {
  const { error } = await supabase.rpc('update_video_comment', {
    target_comment_id: commentId,
    comment_content: content,
  });
  if (error) {
    logSupabaseError('videoLearning.comments.update', error);
    throw error;
  }
}

export async function deleteVideoComment(commentId: string) {
  const { error } = await supabase.rpc('delete_video_comment', { target_comment_id: commentId });
  if (error) {
    logSupabaseError('videoLearning.comments.delete', error);
    throw error;
  }
}

export async function getMyVideoNotes(videoId: string) {
  const { data, error } = await supabase.from('video_notes').select('*').eq('video_id', videoId).order('created_at');
  if (error) {
    logSupabaseError('videoLearning.notes.list', error);
    throw error;
  }
  return (data ?? []) as VideoNote[];
}

export async function createVideoNote(videoId: string, content: string, timestampSeconds?: number | null) {
  const { data, error } = await supabase.rpc('create_video_note', {
    target_video_id: videoId,
    note_content: content,
    timestamp_seconds: timestampSeconds ?? null,
  });
  if (error) {
    logSupabaseError('videoLearning.notes.create', error);
    throw error;
  }
  return data as VideoNote;
}

export async function updateVideoNote(noteId: string, content: string, timestampSeconds?: number | null) {
  const { data, error } = await supabase.rpc('update_video_note', {
    target_note_id: noteId,
    note_content: content,
    timestamp_seconds: timestampSeconds ?? null,
  });
  if (error) {
    logSupabaseError('videoLearning.notes.update', error);
    throw error;
  }
  return data as VideoNote;
}

export async function deleteVideoNote(noteId: string) {
  const { error } = await supabase.rpc('delete_video_note', { target_note_id: noteId });
  if (error) {
    logSupabaseError('videoLearning.notes.delete', error);
    throw error;
  }
}

export async function updateVideoProgress(videoId: string, watchedSeconds: number, completed = false) {
  const { data, error } = await supabase.rpc('update_video_progress', {
    target_video_id: videoId,
    watched_seconds: Math.max(0, Math.floor(watchedSeconds)),
    completed,
  });
  if (error) {
    logSupabaseError('videoLearning.progress.update', error);
    throw error;
  }
  return data as VideoProgress;
}

export async function getCourseProgressSummary(courseId: string) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (!authData.user && authError?.message.toLowerCase().includes('auth session missing')) return null;
  if (authError) {
    logSupabaseError('videoLearning.progress.authUser', authError);
    return null;
  }

  const { data, error } = await supabase
    .from('video_progress')
    .select('video_id, completed, watched_seconds')
    .eq('course_id', courseId);

  if (error) {
    logSupabaseError('videoLearning.progress.course', error);
    return null;
  }

  const rows = (data ?? []) as Pick<VideoProgress, 'video_id' | 'completed' | 'watched_seconds'>[];
  return {
    started: rows.some((row) => row.completed || row.watched_seconds > 0),
    completedLessons: rows.filter((row) => row.completed).length,
    completedVideoIds: rows.filter((row) => row.completed).map((row) => row.video_id),
  };
}
