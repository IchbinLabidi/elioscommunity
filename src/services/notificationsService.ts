import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Notification, NotificationType } from '../types/database';

export type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetUrl?: string | null;
};

async function currentActor() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Authentication required.');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  return {
    id: data.user.id,
    name: profile?.full_name || 'Elios member',
    role: profile?.role as string | undefined,
  };
}

async function bestEffort<T>(name: string, action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    console.error(`Notification failed: ${name}`, error);
    return null;
  }
}

export async function getMyNotifications(limit?: number) {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    logSupabaseError('notifications.mine', error);
    throw error;
  }
  return (data ?? []) as Notification[];
}

export async function getUnreadNotificationCount() {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);

  if (error) {
    logSupabaseError('notifications.unreadCount', error);
    throw error;
  }
  return count ?? 0;
}

export async function markNotificationAsRead(notificationId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select('*')
    .single();

  if (error) {
    logSupabaseError('notifications.markRead', error);
    throw error;
  }
  return data as Notification;
}

export async function markAllNotificationsAsRead() {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false);

  if (error) {
    logSupabaseError('notifications.markAllRead', error);
    throw error;
  }
}

export async function createNotification(input: CreateNotificationInput) {
  const { data, error } = await supabase.rpc('create_notification', {
    target_user_id: input.userId,
    actor_user_id: input.actorId ?? null,
    notification_type: input.type,
    notification_title: input.title,
    notification_message: input.message ?? null,
    notification_target_type: input.targetType ?? null,
    notification_target_id: input.targetId ?? null,
    notification_target_url: input.targetUrl ?? null,
  });

  if (error) {
    logSupabaseError('notifications.create', error);
    throw error;
  }
  return data as Notification;
}

export function notifyQuestionAnswered(questionId: string, answerId: string) {
  return bestEffort('question answered', async () => {
    const [actor, questionResult] = await Promise.all([
      currentActor(),
      supabase.from('questions').select('student_id').eq('id', questionId).single(),
    ]);
    if (questionResult.error) throw questionResult.error;
    if (questionResult.data.student_id === actor.id) return null;
    return createNotification({
      userId: questionResult.data.student_id,
      actorId: actor.id,
      type: 'question_answered',
      title: 'New answer to your question',
      message: `${actor.name} answered your question.`,
      targetType: 'answer',
      targetId: answerId,
      targetUrl: `/questions/${questionId}`,
    });
  });
}

export function notifyAnswerReplied(questionId: string, answerId: string, commentId: string) {
  return bestEffort('answer replied', async () => {
    const [actor, answerResult, questionResult] = await Promise.all([
      currentActor(),
      supabase.from('answers').select('teacher_id').eq('id', answerId).single(),
      supabase.from('questions').select('student_id').eq('id', questionId).single(),
    ]);
    if (answerResult.error) throw answerResult.error;
    if (questionResult.error) throw questionResult.error;

    const notifyStudent = actor.id === answerResult.data.teacher_id;
    const targetUserId = notifyStudent ? questionResult.data.student_id : answerResult.data.teacher_id;
    if (targetUserId === actor.id) return null;
    return createNotification({
      userId: targetUserId,
      actorId: actor.id,
      type: 'answer_replied',
      title: notifyStudent ? 'Teacher replied' : 'New reply on your answer',
      message: notifyStudent ? `${actor.name} replied in your question discussion.` : `${actor.name} replied to your answer.`,
      targetType: 'answer_comment',
      targetId: commentId,
      targetUrl: `/questions/${questionId}`,
    });
  });
}

export function notifyBestAnswerSelected(questionId: string, answerId: string) {
  return bestEffort('best answer selected', async () => {
    const [actor, answerResult] = await Promise.all([
      currentActor(),
      supabase.from('answers').select('teacher_id').eq('id', answerId).single(),
    ]);
    if (answerResult.error) throw answerResult.error;
    if (answerResult.data.teacher_id === actor.id) return null;
    return createNotification({
      userId: answerResult.data.teacher_id,
      actorId: actor.id,
      type: 'best_answer_selected',
      title: 'Your answer was selected',
      message: 'Your answer was marked as the best answer.',
      targetType: 'answer',
      targetId: answerId,
      targetUrl: `/questions/${questionId}`,
    });
  });
}

export function notifyRatingReceived(teacherId: string, ratingId: string) {
  return bestEffort('rating received', async () => {
    const actor = await currentActor();
    if (teacherId === actor.id) return null;
    return createNotification({
      userId: teacherId,
      actorId: actor.id,
      type: 'rating_received',
      title: 'New rating received',
      message: 'A student rated your help.',
      targetType: 'rating',
      targetId: ratingId,
      targetUrl: `/teachers/${teacherId}`,
    });
  });
}

export function notifyTeacherFollowed(teacherId: string) {
  return bestEffort('teacher followed', async () => {
    const actor = await currentActor();
    return createNotification({
      userId: teacherId,
      actorId: actor.id,
      type: 'teacher_followed',
      title: 'New follower',
      message: `${actor.name} started following you.`,
      targetType: 'teacher',
      targetId: teacherId,
      targetUrl: `/teachers/${teacherId}`,
    });
  });
}

export function notifyTeacherNewCourse(teacherId: string, courseId: string) {
  return bestEffort('teacher new course', async () => {
    const [actor, followsResult] = await Promise.all([
      currentActor(),
      supabase.from('teacher_follows').select('student_id').eq('teacher_id', teacherId),
    ]);
    if (followsResult.error) throw followsResult.error;
    await Promise.all((followsResult.data ?? []).map((follow) => createNotification({
      userId: String(follow.student_id),
      actorId: actor.id,
      type: 'teacher_new_course',
      title: 'New course published',
      message: `${actor.name} published a new course.`,
      targetType: 'course',
      targetId: courseId,
      targetUrl: `/courses/${courseId}`,
    })));
    return null;
  });
}

export function notifyEnrollmentSubmitted(enrollmentId: string) {
  return bestEffort('enrollment submitted', async () => {
    const [actor, enrollmentResult] = await Promise.all([
      currentActor(),
      supabase.from('course_enrollments').select('teacher_id').eq('id', enrollmentId).single(),
    ]);
    if (enrollmentResult.error) throw enrollmentResult.error;
    return createNotification({
      userId: enrollmentResult.data.teacher_id,
      actorId: actor.id,
      type: 'course_enrollment_submitted',
      title: 'New enrollment request',
      message: `${actor.name} submitted payment proof.`,
      targetType: 'course_enrollment',
      targetId: enrollmentId,
      targetUrl: '/teacher/enrollments',
    });
  });
}

async function notifyEnrollmentReview(enrollmentId: string, type: 'course_enrollment_approved' | 'course_enrollment_rejected') {
  return bestEffort(type, async () => {
    const [actor, enrollmentResult] = await Promise.all([
      currentActor(),
      supabase.from('course_enrollments').select('student_id, course_id').eq('id', enrollmentId).single(),
    ]);
    if (enrollmentResult.error) throw enrollmentResult.error;
    const approved = type === 'course_enrollment_approved';
    return createNotification({
      userId: enrollmentResult.data.student_id,
      actorId: actor.id,
      type,
      title: approved ? 'Course access approved' : 'Enrollment rejected',
      message: approved
        ? 'Your enrollment has been approved. You can start learning now.'
        : 'Your payment proof was rejected. Please check the reason and resubmit.',
      targetType: 'course_enrollment',
      targetId: enrollmentId,
      targetUrl: approved ? `/courses/${enrollmentResult.data.course_id}/learn` : '/student/enrollments',
    });
  });
}

export function notifyEnrollmentApproved(enrollmentId: string) {
  return notifyEnrollmentReview(enrollmentId, 'course_enrollment_approved');
}

export function notifyEnrollmentRejected(enrollmentId: string) {
  return notifyEnrollmentReview(enrollmentId, 'course_enrollment_rejected');
}
