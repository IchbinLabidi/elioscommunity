import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Profile, QuestionStatus, UserRole } from '../types/database';

export type ModerationTab = 'question' | 'answer' | 'answer_comment';
export type ModerationState = 'visible' | 'hidden' | 'deleted' | 'reviewed';
export type ModerationAction = 'hide' | 'restore' | 'delete' | 'mark_reviewed';

export type ModerationItem = {
  id: string;
  type: ModerationTab;
  title: string;
  content: string;
  subject: string | null;
  questionStatus: QuestionStatus | null;
  questionId: string;
  questionTitle: string;
  imageUrl: string | null;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorRole: UserRole;
  createdAt: string;
  isBest: boolean;
  isHidden: boolean;
  hiddenReason: string | null;
  isDeleted: boolean;
  deletedReason: string | null;
  reviewedAt: string | null;
  reportCount: number;
};

export type ModerationStats = {
  totalQuestions: number;
  hiddenQuestions: number;
  totalAnswers: number;
  hiddenAnswers: number;
  totalComments: number;
  hiddenComments: number;
  pendingReports: number;
  pendingReview: number;
};

type ModerationColumns = {
  id: string;
  created_at: string;
  is_hidden?: boolean | null;
  hidden_reason?: string | null;
  is_deleted?: boolean | null;
  deleted_reason?: string | null;
  reviewed_at?: string | null;
};

type RelatedProfile = Pick<Profile, 'id' | 'full_name' | 'email' | 'role'> | null;
type ReportRow = { target_id: string; status: string };

function singleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function author(profile: RelatedProfile, id: string, role: UserRole): Pick<ModerationItem, 'authorId' | 'authorName' | 'authorEmail' | 'authorRole'> {
  return {
    authorId: profile?.id ?? id,
    authorName: profile?.full_name || (role === 'teacher' ? 'Prof' : 'Etudiant'),
    authorEmail: profile?.email || '',
    authorRole: profile?.role ?? role,
  };
}

function reportsMap(rows: ReportRow[]) {
  const counts = new Map<string, number>();
  rows.filter((row) => row.status === 'pending').forEach((row) => counts.set(row.target_id, (counts.get(row.target_id) ?? 0) + 1));
  return counts;
}

async function pendingReports(type: ModerationTab) {
  const { data, error } = await supabase.from('reports').select('target_id, status').eq('target_type', type);
  if (error) {
    logSupabaseError(`adminModeration.reports.${type}`, error);
    return new Map<string, number>();
  }
  return reportsMap((data ?? []) as ReportRow[]);
}

function stateFields(row: ModerationColumns) {
  return {
    isHidden: Boolean(row.is_hidden),
    hiddenReason: row.hidden_reason ?? null,
    isDeleted: Boolean(row.is_deleted),
    deletedReason: row.deleted_reason ?? null,
    reviewedAt: row.reviewed_at ?? null,
  };
}

export function getModerationState(item: Pick<ModerationItem, 'isDeleted' | 'isHidden' | 'reviewedAt'>): ModerationState {
  if (item.isDeleted) return 'deleted';
  if (item.isHidden) return 'hidden';
  if (item.reviewedAt) return 'reviewed';
  return 'visible';
}

export async function getAdminQuestions() {
  const [content, reportCounts] = await Promise.all([
    supabase
      .from('questions')
      .select('id, student_id, title, description, subject, image_url, status, created_at, is_hidden, hidden_reason, is_deleted, deleted_reason, reviewed_at, profiles:student_id(id, full_name, email, role)')
      .order('created_at', { ascending: false }),
    pendingReports('question'),
  ]);
  if (content.error) {
    logSupabaseError('adminModeration.questions', content.error);
    throw content.error;
  }
  return (content.data ?? []).map((row) => ({
    id: row.id,
    type: 'question' as const,
    title: row.title,
    content: row.description,
    subject: row.subject,
    questionStatus: row.status as QuestionStatus,
    questionId: row.id,
    questionTitle: row.title,
    imageUrl: row.image_url,
    ...author(singleRelation(row.profiles) as RelatedProfile, row.student_id, 'student'),
    createdAt: row.created_at,
    isBest: false,
    ...stateFields(row),
    reportCount: reportCounts.get(row.id) ?? 0,
  })) satisfies ModerationItem[];
}

export async function getAdminAnswers() {
  const [content, reportCounts] = await Promise.all([
    supabase
      .from('answers')
      .select('id, question_id, teacher_id, content, is_best, created_at, is_hidden, hidden_reason, is_deleted, deleted_reason, reviewed_at, profiles:teacher_id(id, full_name, email, role), questions:question_id(id, title)')
      .order('created_at', { ascending: false }),
    pendingReports('answer'),
  ]);
  if (content.error) {
    logSupabaseError('adminModeration.answers', content.error);
    throw content.error;
  }
  return (content.data ?? []).map((row) => {
    const question = singleRelation(row.questions) as { id: string; title: string } | null;
    return {
      id: row.id,
      type: 'answer' as const,
      title: question?.title || 'Question associee',
      content: row.content,
      subject: null,
      questionStatus: null,
      questionId: row.question_id,
      questionTitle: question?.title || 'Question associee',
      imageUrl: null,
      ...author(singleRelation(row.profiles) as RelatedProfile, row.teacher_id, 'teacher'),
      createdAt: row.created_at,
      isBest: Boolean(row.is_best),
      ...stateFields(row),
      reportCount: reportCounts.get(row.id) ?? 0,
    };
  }) satisfies ModerationItem[];
}

export async function getAdminComments() {
  const [content, reportCounts] = await Promise.all([
    supabase
      .from('answer_comments')
      .select('id, answer_id, question_id, user_id, content, created_at, is_hidden, hidden_reason, is_deleted, deleted_reason, reviewed_at, profiles:user_id(id, full_name, email, role), questions:question_id(id, title)')
      .order('created_at', { ascending: false }),
    pendingReports('answer_comment'),
  ]);
  if (content.error) {
    logSupabaseError('adminModeration.comments', content.error);
    throw content.error;
  }
  return (content.data ?? []).map((row) => {
    const profile = singleRelation(row.profiles) as RelatedProfile;
    const question = singleRelation(row.questions) as { id: string; title: string } | null;
    return {
      id: row.id,
      type: 'answer_comment' as const,
      title: question?.title || 'Discussion associee',
      content: row.content,
      subject: null,
      questionStatus: null,
      questionId: row.question_id,
      questionTitle: question?.title || 'Discussion associee',
      imageUrl: null,
      ...author(profile, row.user_id, profile?.role ?? 'student'),
      createdAt: row.created_at,
      isBest: false,
      ...stateFields(row),
      reportCount: reportCounts.get(row.id) ?? 0,
    };
  }) satisfies ModerationItem[];
}

export async function getModerationStats(): Promise<ModerationStats> {
  const [questions, answers, comments, reports] = await Promise.all([
    supabase.from('questions').select('id, is_hidden, reviewed_at'),
    supabase.from('answers').select('id, is_hidden, reviewed_at'),
    supabase.from('answer_comments').select('id, is_hidden, reviewed_at'),
    supabase.from('reports').select('id, status, target_type').in('target_type', ['question', 'answer', 'answer_comment']),
  ]);
  const error = questions.error ?? answers.error ?? comments.error ?? reports.error;
  if (error) {
    logSupabaseError('adminModeration.stats', error);
    throw error;
  }
  const allRows = [...(questions.data ?? []), ...(answers.data ?? []), ...(comments.data ?? [])];
  return {
    totalQuestions: questions.data?.length ?? 0,
    hiddenQuestions: (questions.data ?? []).filter((row) => row.is_hidden).length,
    totalAnswers: answers.data?.length ?? 0,
    hiddenAnswers: (answers.data ?? []).filter((row) => row.is_hidden).length,
    totalComments: comments.data?.length ?? 0,
    hiddenComments: (comments.data ?? []).filter((row) => row.is_hidden).length,
    pendingReports: (reports.data ?? []).filter((row) => row.status === 'pending').length,
    pendingReview: allRows.filter((row) => !row.reviewed_at).length,
  };
}

export async function moderateContent(type: ModerationTab, targetId: string, action: ModerationAction, reason?: string) {
  const { error } = await supabase.rpc('admin_moderate_discussion_content', {
    target_type: type,
    target_id: targetId,
    moderation_action: action,
    reason: reason || null,
  });
  if (error) {
    logSupabaseError(`adminModeration.${action}`, error);
    throw error;
  }
}

export const hideQuestion = (id: string, reason: string) => moderateContent('question', id, 'hide', reason);
export const unhideQuestion = (id: string, reason?: string) => moderateContent('question', id, 'restore', reason);
export const deleteQuestion = (id: string, reason: string) => moderateContent('question', id, 'delete', reason);
export const markQuestionReviewed = (id: string) => moderateContent('question', id, 'mark_reviewed');
export const hideAnswer = (id: string, reason: string) => moderateContent('answer', id, 'hide', reason);
export const unhideAnswer = (id: string, reason?: string) => moderateContent('answer', id, 'restore', reason);
export const deleteAnswer = (id: string, reason: string) => moderateContent('answer', id, 'delete', reason);
export const markAnswerReviewed = (id: string) => moderateContent('answer', id, 'mark_reviewed');
export const hideComment = (id: string, reason: string) => moderateContent('answer_comment', id, 'hide', reason);
export const unhideComment = (id: string, reason?: string) => moderateContent('answer_comment', id, 'restore', reason);
export const deleteComment = (id: string, reason: string) => moderateContent('answer_comment', id, 'delete', reason);
export const markCommentReviewed = (id: string) => moderateContent('answer_comment', id, 'mark_reviewed');
