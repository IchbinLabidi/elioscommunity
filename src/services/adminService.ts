import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import {
  AdminAuditLog,
  Answer,
  AnswerComment,
  ChapterAttachment,
  ChapterVideo,
  Course,
  CourseChapter,
  Profile,
  Question,
  Rating,
  Report,
} from '../types/database';

export type AdminTargetType = 'question' | 'answer' | 'answer_comment' | 'rating' | 'course' | 'module' | 'chapter' | 'video' | 'attachment' | 'user';

export async function getAdminStats() {
  const [profiles, reports, questions, answers, comments, ratings, courses] = await Promise.all([
    supabase.from('profiles').select('id, role, is_blocked, is_verified, created_at'),
    supabase.from('reports').select('id, status'),
    supabase.from('questions').select('id, is_hidden'),
    supabase.from('answers').select('id, is_hidden'),
    supabase.from('answer_comments').select('id, is_hidden'),
    supabase.from('ratings').select('id, is_hidden'),
    supabase.from('courses').select('id, is_hidden'),
  ]);
  const error = profiles.error ?? reports.error ?? questions.error ?? answers.error ?? comments.error ?? ratings.error ?? courses.error;
  if (error) { logSupabaseError('admin.stats', error); throw error; }
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const profileRows = profiles.data ?? [];
  return {
    totalStudents: profileRows.filter((p) => p.role === 'student').length,
    totalTeachers: profileRows.filter((p) => p.role === 'teacher').length,
    pendingReports: (reports.data ?? []).filter((r) => r.status === 'pending').length,
    blockedUsers: profileRows.filter((p) => p.is_blocked).length,
    hiddenQuestions: (questions.data ?? []).filter((q) => q.is_hidden).length,
    hiddenAnswers: (answers.data ?? []).filter((a) => a.is_hidden).length,
    hiddenComments: (comments.data ?? []).filter((c) => c.is_hidden).length,
    totalCourses: (courses.data ?? []).length,
    hiddenCourses: (courses.data ?? []).filter((c) => c.is_hidden).length,
    newUsersThisWeek: profileRows.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length,
  };
}

export async function getUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.users', error); throw error; }
  return (data ?? []) as Profile[];
}

export async function blockUser(userId: string, reason: string) {
  const { error } = await supabase.rpc('admin_block_user', { target_user_id: userId, reason });
  if (error) { logSupabaseError('admin.blockUser', error); throw error; }
}

export async function unblockUser(userId: string) {
  const { error } = await supabase.rpc('admin_unblock_user', { target_user_id: userId });
  if (error) { logSupabaseError('admin.unblockUser', error); throw error; }
}

export async function verifyTeacher(teacherId: string) {
  const { error } = await supabase.rpc('admin_verify_teacher', { target_teacher_id: teacherId });
  if (error) { logSupabaseError('admin.verifyTeacher', error); throw error; }
}

export async function unverifyTeacher(teacherId: string) {
  const { error } = await supabase.rpc('admin_unverify_teacher', { target_teacher_id: teacherId });
  if (error) { logSupabaseError('admin.unverifyTeacher', error); throw error; }
}

export async function getReports() {
  const { data, error } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.reports', error); throw error; }
  return (data ?? []) as Report[];
}

export async function updateReportStatus(reportId: string, status: 'reviewed' | 'resolved' | 'rejected', adminNote: string) {
  const { error } = await supabase.rpc('admin_update_report_status', { target_report_id: reportId, new_status: status, admin_note_text: adminNote || null });
  if (error) { logSupabaseError('admin.reportStatus', error); throw error; }
}

export async function hideContent(targetType: AdminTargetType, targetId: string, reason: string) {
  const { error } = await supabase.rpc('admin_hide_content', { target_type: targetType, target_id: targetId, reason });
  if (error) { logSupabaseError('admin.hideContent', error); throw error; }
}

export async function unhideContent(targetType: AdminTargetType, targetId: string) {
  const { error } = await supabase.rpc('admin_unhide_content', { target_type: targetType, target_id: targetId });
  if (error) { logSupabaseError('admin.unhideContent', error); throw error; }
}

export async function deleteContent(targetType: AdminTargetType, targetId: string, reason: string) {
  const { error } = await supabase.rpc('admin_delete_content', { target_type: targetType, target_id: targetId, reason });
  if (error) { logSupabaseError('admin.deleteContent', error); throw error; }
}

export async function getAuditLogs() {
  const { data, error } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) { logSupabaseError('admin.auditLogs', error); throw error; }
  return (data ?? []) as AdminAuditLog[];
}

export async function getAdminQuestions() {
  const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.questions', error); throw error; }
  return (data ?? []) as Question[];
}

export async function getAdminAnswers() {
  const { data, error } = await supabase.from('answers').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.answers', error); throw error; }
  return (data ?? []) as Answer[];
}

export async function getAdminComments() {
  const { data, error } = await supabase.from('answer_comments').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.comments', error); throw error; }
  return (data ?? []) as AnswerComment[];
}

export async function getAdminRatings() {
  const { data, error } = await supabase.from('ratings').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.ratings', error); throw error; }
  return (data ?? []) as Rating[];
}

export async function getAdminCourses() {
  const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.courses', error); throw error; }
  return (data ?? []) as Course[];
}

export async function getAdminChapters() {
  const { data, error } = await supabase.from('course_chapters').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.chapters', error); throw error; }
  return (data ?? []) as CourseChapter[];
}

export async function getAdminVideos() {
  const { data, error } = await supabase.from('chapter_videos').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.videos', error); throw error; }
  return (data ?? []) as ChapterVideo[];
}

export async function getAdminAttachments() {
  const { data, error } = await supabase.from('chapter_attachments').select('*').order('created_at', { ascending: false });
  if (error) { logSupabaseError('admin.attachments', error); throw error; }
  return (data ?? []) as ChapterAttachment[];
}
