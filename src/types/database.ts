export type UserRole = 'student' | 'teacher' | 'admin';
export type QuestionStatus = 'open' | 'answered' | 'closed';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'rejected' | 'dismissed';
export type ReportTargetType =
  | 'question'
  | 'answer'
  | 'answer_comment'
  | 'rating'
  | 'course'
  | 'module'
  | 'chapter'
  | 'video'
  | 'attachment'
  | 'user';
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TeacherVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended' | 'blocked';
export type CourseReviewStatus = 'pending' | 'approved' | 'needs_changes' | 'rejected';

export type Subject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  icon: string | null;
  is_published: boolean;
  subject_order: number;
  created_at: string;
  updated_at?: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
  experience: string | null;
  headline?: string | null;
  location?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  facebook_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  subjects?: string[] | null;
  education?: string | null;
  languages?: string[] | null;
  is_verified?: boolean;
  verification_status?: TeacherVerificationStatus;
  verified_at?: string | null;
  is_blocked: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  blocked_by?: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at?: string;
};

export type TeacherStats = {
  teacher_id: string;
  rating_average: number;
  rating_count: number;
  answer_count: number;
  course_count: number;
};

export type TeacherPublicStats = {
  teacher_id: string;
  average_rating: number;
  total_ratings: number;
  total_reviews: number;
  total_answers: number;
  total_best_answers: number;
  total_courses: number;
  follower_count?: number;
  /** @deprecated Older teacher_public_stats views used this column name. */
  total_followers?: number;
};

export type Question = {
  id: string;
  student_id: string;
  title: string;
  description: string;
  subject: string;
  image_url: string | null;
  status: QuestionStatus;
  best_answer_id: string | null;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type Answer = {
  id: string;
  question_id: string;
  teacher_id: string;
  content: string;
  is_best: boolean;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type AnswerComment = {
  id: string;
  answer_id: string;
  question_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
  is_deleted?: boolean;
  deleted_by?: string | null;
  deleted_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type TeacherRating = {
  id: string;
  student_id: string;
  teacher_id: string;
  question_id: string;
  answer_id: string | null;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
};

export type Rating = TeacherRating;

export type Course = {
  id: string;
  subject_id?: string;
  teacher_id: string;
  title: string;
  description: string;
  subject: string;
  level: string;
  price: number;
  currency: string;
  duration: string | null;
  format: 'online' | 'onsite' | 'hybrid' | 'recorded';
  cover_url: string | null;
  course_link: string | null;
  contact_whatsapp: string | null;
  payment_instructions?: string | null;
  payment_method?: string | null;
  payment_phone?: string | null;
  payment_bank_account?: string | null;
  is_published: boolean;
  lesson_count?: number;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
  is_featured?: boolean;
  featured_at?: string | null;
  featured_by?: string | null;
  admin_review_status?: CourseReviewStatus;
  admin_review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  deleted_reason?: string | null;
};

export type CourseLesson = {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  lesson_order: number;
  video_url: string | null;
  video_path: string | null;
  pdf_url: string | null;
  pdf_path: string | null;
  is_free_preview: boolean;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
};

export type TeacherFollow = {
  id: string;
  student_id: string;
  teacher_id: string;
  created_at: string;
};

export type NotificationType =
  | 'question_answered'
  | 'answer_replied'
  | 'best_answer_selected'
  | 'teacher_followed'
  | 'teacher_new_course'
  | 'course_enrollment_submitted'
  | 'course_enrollment_approved'
  | 'course_enrollment_rejected'
  | 'video_comment'
  | 'rating_received'
  | 'report_resolved'
  | 'admin_message';

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  target_type: string | null;
  target_id: string | null;
  target_url: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type Follow = TeacherFollow;

export type Report = {
  id: string;
  reporter_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description?: string | null;
  status: ReportStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  admin_note?: string | null;
  created_at: string;
  updated_at?: string;
};

export type QuestionWithStudent = Question & {
  profiles?: Pick<Profile, 'full_name' | 'avatar_url'> | null;
  answer_count?: number;
  answers?: Array<{ id: string }>;
  teacher_answered?: boolean;
  teacher_answer_id?: string | null;
};

export type SubjectOption =
  | 'Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Computer Science'
  | 'Philosophy'
  | 'Arabic'
  | 'French'
  | 'English'
  | 'History'
  | 'Geography'
  | 'Economics'
  | 'Other';

export type AnswerWithTeacher = Answer & {
  profiles?: Pick<Profile, 'full_name' | 'avatar_url' | 'specialty'> | null;
  rating_average?: number;
};

export type AnswerCommentWithUser = AnswerComment & {
  profiles?: Pick<Profile, 'full_name' | 'avatar_url' | 'role'> | null;
};

export type TeacherRatingWithStudent = TeacherRating & {
  profiles?: Pick<Profile, 'full_name' | 'avatar_url'> | null;
  question_title?: string | null;
};

export type TeacherRatingStats = {
  teacher_id: string;
  average_rating: number;
  total_ratings: number;
  total_reviews: number;
};

export type TeacherWithStats = Profile & {
  teacher_stats?: TeacherStats[] | TeacherStats | null;
  teacher_public_stats?: TeacherPublicStats[] | TeacherPublicStats | null;
};

export type CourseWithTeacher = Course & {
  profiles?: (Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'specialty'> & {
    teacher_public_stats?: TeacherPublicStats[] | TeacherPublicStats | null;
    teacher_stats?: TeacherStats[] | TeacherStats | null;
  }) | null;
  subjects?: Subject | null;
};

export type CourseWithLessons = CourseWithTeacher & {
  course_lessons?: CourseLesson[];
  lessons?: CourseLesson[];
};

export type CourseModule = {
  id: string;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  module_order: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
};

export type CourseChapter = {
  id: string;
  subject_id?: string;
  module_id?: string | null;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  chapter_order: number;
  is_free_preview: boolean;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
};

export type ChapterVideo = {
  id: string;
  chapter_id: string;
  subject_id?: string;
  module_id?: string | null;
  course_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  video_order: number;
  video_url: string | null;
  video_path: string | null;
  duration_seconds: number | null;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
};

export type ChapterAttachment = {
  id: string;
  chapter_id: string;
  subject_id?: string;
  module_id?: string | null;
  course_id: string;
  teacher_id: string;
  title: string;
  file_url: string | null;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;
  attachment_order: number;
  is_published: boolean;
  created_at: string;
  updated_at?: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  hidden_at?: string | null;
  hidden_by?: string | null;
};

export type VideoComment = {
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
};

export type VideoCommentWithUser = VideoComment & {
  profiles?: Pick<Profile, 'full_name' | 'avatar_url' | 'role'> | null;
};

export type VideoNote = {
  id: string;
  video_id: string;
  course_id: string;
  chapter_id: string;
  student_id: string;
  content: string;
  timestamp_seconds: number | null;
  created_at: string;
  updated_at?: string;
};

export type VideoProgress = {
  id: string;
  video_id: string;
  course_id: string;
  student_id: string;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string;
  created_at: string;
  updated_at?: string;
};

export type AdminAuditLog = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type StudentAdminNote = {
  id: string;
  student_id: string;
  admin_id: string | null;
  note: string;
  created_at: string;
  admin?: Pick<Profile, 'id' | 'full_name'> | null;
};

export type StudentAccountAction = {
  id: string;
  student_id: string;
  admin_id: string | null;
  action: 'blocked' | 'unblocked' | 'note_added';
  reason: string | null;
  created_at: string;
  admin?: Pick<Profile, 'id' | 'full_name'> | null;
};

export type TeacherVerificationDetails = {
  teacher_id: string;
  verified_by: string | null;
  verification_rejected_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  blocked_reason: string | null;
  updated_at: string;
};

export type TeacherVerificationHistory = {
  id: string;
  teacher_id: string;
  admin_id: string | null;
  action: 'verified' | 'rejected' | 'suspended' | 'unsuspended' | 'blocked' | 'unblocked' | 'verification_removed' | 'note_added';
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  created_at: string;
  admin?: Pick<Profile, 'id' | 'full_name'> | null;
};

export type TeacherAdminNote = {
  id: string;
  teacher_id: string;
  admin_id: string | null;
  note: string;
  created_at: string;
  admin?: Pick<Profile, 'id' | 'full_name'> | null;
};

export type CourseEnrollment = {
  id: string;
  course_id: string;
  subject_id?: string;
  student_id: string;
  teacher_id: string;
  status: EnrollmentStatus;
  payment_proof_url: string | null;
  payment_proof_path: string | null;
  payment_note: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at?: string;
};

export type CourseEnrollmentWithCourse = CourseEnrollment & {
  courses?: Pick<Course, 'id' | 'title' | 'cover_url' | 'price' | 'currency' | 'subject'> | null;
  teacher?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null;
  student?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'> | null;
};

export type CourseChapterWithContent = CourseChapter & {
  videos: ChapterVideo[];
  attachments: ChapterAttachment[];
};

export type CourseModuleWithContent = CourseModule & {
  chapters: CourseChapterWithContent[];
};

export type CourseWithContent = CourseWithTeacher & {
  chapters: CourseChapterWithContent[];
  modules: CourseModuleWithContent[];
  subjects?: Subject | null;
};
