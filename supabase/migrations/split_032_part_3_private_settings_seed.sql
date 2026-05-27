insert into public.platform_settings(key, value, description, is_public) values
('payments', '{
  "paymentProofEnabled":true,
  "teacherCanApproveEnrollments":true,
  "adminCanApproveEnrollments":true,
  "platformCommissionPercent":0,
  "defaultPaymentInstructions":"",
  "defaultPaymentMethod":"",
  "defaultPaymentPhone":"",
  "defaultBankAccount":""
}'::jsonb, 'Private payment workflow controls.', false),
('community', '{
  "publicReadOnlyQuestions":true,
  "allowAnonymousRead":true,
  "studentsCanAskQuestions":true,
  "teachersCanAnswerQuestions":true,
  "studentsCanComment":true,
  "studentsCanRateTeachers":true,
  "maxQuestionsPerStudentPerDay":10,
  "maxCommentsPerUserPerDay":50
}'::jsonb, 'Private community controls.', false),
('moderation', '{
  "reportsEnabled":true,
  "autoHideAfterReports":false,
  "autoHideReportThreshold":5,
  "teacherVerificationRequired":true,
  "courseReviewRequired":false
}'::jsonb, 'Private moderation controls.', false),
('notifications', '{
  "emailNotificationsEnabled":false,
  "inAppNotificationsEnabled":true,
  "teacherNewCourseNotifications":true,
  "answerNotifications":true,
  "enrollmentNotifications":true
}'::jsonb, 'Private notification controls.', false)
on conflict (key) do nothing;
