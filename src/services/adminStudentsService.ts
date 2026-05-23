import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import {
  AnswerComment,
  CourseEnrollmentWithCourse,
  Profile,
  Question,
  Rating,
  Report,
  StudentAccountAction,
  StudentAdminNote,
} from '../types/database';

export type AdminStudentFilters = {
  query?: string;
  status?: 'all' | 'active' | 'blocked';
  registeredAfter?: string;
  sort?: 'newest' | 'most-active' | 'most-purchases';
};

export type AdminStudentStats = {
  questionsCount: number;
  commentsCount: number;
  purchasedCoursesCount: number;
  pendingEnrollmentsCount: number;
  ratingsCount: number;
  reportsSubmittedCount: number;
  reportsReceivedCount: number;
  answersReceivedCount: number;
};

export type AdminStudentSummary = Profile & AdminStudentStats;

export type StudentTimelineItem = {
  id: string;
  kind: 'account' | 'question' | 'comment' | 'enrollment' | 'rating' | 'report' | 'action';
  title: string;
  description: string;
  createdAt: string;
};

const enrollmentSelect = `
  *,
  courses:course_id(id,title,cover_url,price,currency,subject),
  teacher:profiles!course_enrollments_teacher_id_fkey(id,full_name,avatar_url),
  student:profiles!course_enrollments_student_id_fkey(id,full_name,avatar_url,email)
`;

function recordError(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

async function proofUrls(enrollments: CourseEnrollmentWithCourse[]) {
  return Promise.all(enrollments.map(async (enrollment) => {
    if (!enrollment.payment_proof_path) return enrollment;
    const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(enrollment.payment_proof_path, 60 * 60);
    if (error) {
      logSupabaseError('adminStudents.proofUrl', error);
      return enrollment;
    }
    return { ...enrollment, payment_proof_url: data.signedUrl };
  }));
}

export async function getStudents(filters: AdminStudentFilters = {}) {
  const [profiles, questions, comments, enrollments, ratings, reports] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false }),
    supabase.from('questions').select('id, student_id'),
    supabase.from('answer_comments').select('id, user_id'),
    supabase.from('course_enrollments').select('id, student_id, status'),
    supabase.from('ratings').select('id, student_id'),
    supabase.from('reports').select('id, reporter_id'),
  ]);
  const error = profiles.error ?? questions.error ?? comments.error ?? enrollments.error ?? ratings.error ?? reports.error;
  if (error) return recordError('adminStudents.list', error);

  let rows = ((profiles.data ?? []) as Profile[]).map((student) => ({
    ...student,
    questionsCount: (questions.data ?? []).filter((row) => row.student_id === student.id).length,
    commentsCount: (comments.data ?? []).filter((row) => row.user_id === student.id).length,
    purchasedCoursesCount: (enrollments.data ?? []).filter((row) => row.student_id === student.id && row.status === 'approved').length,
    pendingEnrollmentsCount: (enrollments.data ?? []).filter((row) => row.student_id === student.id && row.status === 'pending').length,
    ratingsCount: (ratings.data ?? []).filter((row) => row.student_id === student.id).length,
    reportsSubmittedCount: (reports.data ?? []).filter((row) => row.reporter_id === student.id).length,
    reportsReceivedCount: 0,
    answersReceivedCount: 0,
  }));

  const query = filters.query?.trim().toLowerCase() ?? '';
  if (query) rows = rows.filter((student) => `${student.full_name} ${student.email}`.toLowerCase().includes(query));
  if (filters.status === 'active') rows = rows.filter((student) => !student.is_blocked);
  if (filters.status === 'blocked') rows = rows.filter((student) => student.is_blocked);
  if (filters.registeredAfter) rows = rows.filter((student) => student.created_at >= filters.registeredAfter!);
  rows.sort((first, second) => {
    if (filters.sort === 'most-active') return second.questionsCount + second.commentsCount - first.questionsCount - first.commentsCount;
    if (filters.sort === 'most-purchases') return second.purchasedCoursesCount - first.purchasedCoursesCount;
    return new Date(second.created_at).getTime() - new Date(first.created_at).getTime();
  });
  return rows as AdminStudentSummary[];
}

export async function getStudentById(studentId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', studentId).eq('role', 'student').maybeSingle();
  if (error) return recordError('adminStudents.profile', error);
  return data as Profile | null;
}

export async function getStudentQuestions(studentId: string) {
  const { data, error } = await supabase.from('questions').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) return recordError('adminStudents.questions', error);
  return (data ?? []) as Question[];
}

export async function getStudentComments(studentId: string) {
  const { data, error } = await supabase.from('answer_comments').select('*').eq('user_id', studentId).order('created_at', { ascending: false });
  if (error) return recordError('adminStudents.comments', error);
  return (data ?? []) as AnswerComment[];
}

export async function getStudentEnrollments(studentId: string) {
  const { data, error } = await supabase.from('course_enrollments').select(enrollmentSelect).eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) return recordError('adminStudents.enrollments', error);
  return proofUrls((data ?? []) as CourseEnrollmentWithCourse[]);
}

export async function getStudentRatings(studentId: string) {
  const { data, error } = await supabase.from('ratings').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  if (error) return recordError('adminStudents.ratings', error);
  return (data ?? []) as Rating[];
}

export async function getStudentReports(studentId: string) {
  const [submitted, questions, comments, ratings] = await Promise.all([
    supabase.from('reports').select('*').eq('reporter_id', studentId).order('created_at', { ascending: false }),
    getStudentQuestions(studentId),
    getStudentComments(studentId),
    getStudentRatings(studentId),
  ]);
  if ('error' in submitted && submitted.error) return recordError('adminStudents.reports.submitted', submitted.error);
  const ownedIds = new Set([studentId, ...questions.map((item) => item.id), ...comments.map((item) => item.id), ...ratings.map((item) => item.id)]);
  const { data: received, error } = await supabase.from('reports').select('*').in('target_id', [...ownedIds]).order('created_at', { ascending: false });
  if (error) return recordError('adminStudents.reports.received', error);
  return { submitted: (submitted.data ?? []) as Report[], received: (received ?? []) as Report[] };
}

export async function getStudentAdminNotes(studentId: string) {
  const { data, error } = await supabase
    .from('student_admin_notes')
    .select('*, admin:profiles!student_admin_notes_admin_id_fkey(id, full_name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) return recordError('adminStudents.notes', error);
  return (data ?? []) as StudentAdminNote[];
}

export async function getStudentAccountActions(studentId: string) {
  const { data, error } = await supabase
    .from('student_account_actions')
    .select('*, admin:profiles!student_account_actions_admin_id_fkey(id, full_name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) return recordError('adminStudents.actions', error);
  return (data ?? []) as StudentAccountAction[];
}

export async function getStudentStats(studentId: string) {
  const [questions, comments, enrollments, ratings, reports] = await Promise.all([
    getStudentQuestions(studentId),
    getStudentComments(studentId),
    getStudentEnrollments(studentId),
    getStudentRatings(studentId),
    getStudentReports(studentId),
  ]);
  const questionIds = questions.map((question) => question.id);
  const answers = questionIds.length ? await supabase.from('answers').select('id').in('question_id', questionIds) : { data: [], error: null };
  if (answers.error) return recordError('adminStudents.answersReceived', answers.error);
  return {
    questionsCount: questions.length,
    commentsCount: comments.length,
    purchasedCoursesCount: enrollments.filter((item) => item.status === 'approved').length,
    pendingEnrollmentsCount: enrollments.filter((item) => item.status === 'pending').length,
    ratingsCount: ratings.length,
    reportsSubmittedCount: reports.submitted.length,
    reportsReceivedCount: reports.received.length,
    answersReceivedCount: (answers.data ?? []).length,
  } as AdminStudentStats;
}

export async function blockStudent(studentId: string, reason: string) {
  const { data, error } = await supabase.rpc('admin_block_student', { target_student_id: studentId, reason });
  if (error) return recordError('adminStudents.block', error);
  return data as Profile;
}

export async function unblockStudent(studentId: string) {
  const { data, error } = await supabase.rpc('admin_unblock_student', { target_student_id: studentId });
  if (error) return recordError('adminStudents.unblock', error);
  return data as Profile;
}

export async function addStudentAdminNote(studentId: string, note: string) {
  const { data, error } = await supabase.rpc('admin_add_student_note', { target_student_id: studentId, note_text: note });
  if (error) return recordError('adminStudents.note.add', error);
  return data as StudentAdminNote;
}

export async function getStudentActivityTimeline(student: Profile) {
  const [questions, comments, enrollments, ratings, reports, actions] = await Promise.all([
    getStudentQuestions(student.id),
    getStudentComments(student.id),
    getStudentEnrollments(student.id),
    getStudentRatings(student.id),
    getStudentReports(student.id),
    getStudentAccountActions(student.id),
  ]);
  const timeline: StudentTimelineItem[] = [
    { id: `account-${student.id}`, kind: 'account', title: 'Account created', description: 'Student joined sosprof.tn.', createdAt: student.created_at },
    ...questions.map((item) => ({ id: item.id, kind: 'question' as const, title: 'Question asked', description: item.title, createdAt: item.created_at })),
    ...comments.map((item) => ({ id: item.id, kind: 'comment' as const, title: 'Comment added', description: item.content.slice(0, 100), createdAt: item.created_at })),
    ...enrollments.map((item) => ({ id: item.id, kind: 'enrollment' as const, title: `Enrollment ${item.status}`, description: item.courses?.title ?? 'Course enrollment', createdAt: item.reviewed_at ?? item.created_at })),
    ...ratings.map((item) => ({ id: item.id, kind: 'rating' as const, title: 'Rating submitted', description: `${item.rating}/5 rating`, createdAt: item.created_at })),
    ...reports.submitted.map((item) => ({ id: item.id, kind: 'report' as const, title: 'Report submitted', description: item.reason, createdAt: item.created_at })),
    ...actions.map((item) => ({ id: item.id, kind: 'action' as const, title: `Account ${item.action}`, description: item.reason ?? 'Admin action', createdAt: item.created_at })),
  ];
  return timeline.sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
}
