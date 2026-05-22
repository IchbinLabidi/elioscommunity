import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { AnswerCommentWithUser, UserRole } from '../types/database';
import { ensureCurrentUserIsNotBlocked } from './accountGuards';

type RawAnswerComment = {
  id: string;
  answer_id: string;
  question_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  profile_full_name: string | null;
  profile_avatar_url: string | null;
  profile_role: UserRole | null;
};

function mapComment(comment: RawAnswerComment): AnswerCommentWithUser {
  return {
    id: comment.id,
    answer_id: comment.answer_id,
    question_id: comment.question_id,
    user_id: comment.user_id,
    content: comment.content,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    edited_at: comment.edited_at,
    deleted_at: comment.deleted_at,
    profiles: {
      full_name: comment.profile_full_name || 'User',
      avatar_url: comment.profile_avatar_url,
      role: comment.profile_role || 'student',
    },
  };
}

function validateCommentContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return 'Reply cannot be empty.';
  if (trimmed.length > 2000) return 'Reply must be 2000 characters or less.';
  return '';
}

export async function getCommentsByAnswerId(answerId: string) {
  const { data, error } = await supabase.rpc('list_answer_comments', {
    target_answer_id: answerId,
  });

  if (error) {
    logSupabaseError('answerComments.list', error);
    throw error;
  }

  return ((data ?? []) as RawAnswerComment[]).map(mapComment);
}

export async function createAnswerComment(answerId: string, content: string) {
  const validationError = validateCommentContent(content);
  if (validationError) throw new Error(validationError);
  await ensureCurrentUserIsNotBlocked('answerComments.create');

  const { data: created, error } = await supabase.rpc('create_answer_comment', {
    target_answer_id: answerId,
    comment_content: content.trim(),
  });

  if (error) {
    logSupabaseError('answerComments.create', error);
    throw error;
  }

  const createdComment = created as { id: string; answer_id: string };
  const comments = await getCommentsByAnswerId(createdComment.answer_id);
  // TODO: notify teacher/student when replies are created.
  return comments.find((comment) => comment.id === createdComment.id) ?? comments[comments.length - 1];
}

export async function updateAnswerComment(commentId: string, content: string) {
  const validationError = validateCommentContent(content);
  if (validationError) throw new Error(validationError);

  const { data: updated, error } = await supabase.rpc('update_answer_comment', {
    target_comment_id: commentId,
    new_content: content.trim(),
  });

  if (error) {
    logSupabaseError('answerComments.update', error);
    throw error;
  }

  const updatedComment = updated as { id: string; answer_id: string };
  const comments = await getCommentsByAnswerId(updatedComment.answer_id);
  return comments.find((comment) => comment.id === updatedComment.id) ?? comments[0];
}

export async function deleteAnswerComment(commentId: string) {
  const { error } = await supabase.rpc('delete_answer_comment', {
    target_comment_id: commentId,
  });

  if (error) {
    logSupabaseError('answerComments.delete', error);
    throw error;
  }
}
