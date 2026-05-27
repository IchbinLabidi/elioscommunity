alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'question_answered', 'answer_replied', 'best_answer_selected',
  'teacher_followed', 'teacher_new_course', 'course_published',
  'course_enrollment_submitted', 'course_enrollment_approved',
  'course_enrollment_rejected', 'enrollment_request',
  'enrollment_approved', 'enrollment_rejected',
  'video_comment', 'rating_received', 'report_resolved', 'admin_message',
  'live_session_scheduled', 'live_session_created',
  'live_session_recurring_created', 'live_session_updated',
  'live_session_postponed', 'live_session_cancelled',
  'live_session_deleted', 'live_session_recording_available',
  'live_session_recording_added', 'live_session_reminder'
));
