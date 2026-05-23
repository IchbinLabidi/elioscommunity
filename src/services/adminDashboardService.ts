import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { AdminTeacherSummary, getAdminTeachers } from './adminTeachersService';

export type AdminDateRange = 'today' | '7d' | '30d' | 'all';

export type DashboardResult<T> = {
  data: T;
  error: boolean;
};

export type UserDashboardStats = {
  students: number;
  teachers: number;
  verifiedTeachers: number;
  pendingTeachers: number;
  rejectedTeachers: number;
  suspendedTeachers: number;
  blockedUsers: number;
};

export type QuestionDashboardStats = {
  totalQuestions: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  answerRate: number;
  averageAnswers: number;
};

export type CourseDashboardStats = {
  publishedCourses: number;
  draftCourses: number;
  totalCourses: number;
};

export type EnrollmentDashboardStats = {
  totalEnrollments: number;
  approvedEnrollments: number;
  pendingEnrollments: number;
  rejectedEnrollments: number;
  estimatedRevenue: number;
};

export type ModerationDashboardStats = {
  pendingReports: number;
  hiddenQuestions: number;
  hiddenAnswers: number;
  hiddenComments: number;
  blockedStudents: number;
  suspendedTeachers: number;
};

export type RatingDashboardStats = {
  averageRating: number;
  totalRatings: number;
};

export type ActivityItem = {
  id: string;
  kind: 'question' | 'answer' | 'enrollment' | 'report' | 'teacher' | 'student';
  title: string;
  description: string;
  createdAt: string;
  to: string;
};

export type TopSubject = {
  name: string;
  questionCount: number;
  answeredCount: number;
  answerRate: number;
};

export type TopCourse = {
  id: string;
  title: string;
  subject: string;
  enrollmentCount: number;
  approvedCount: number;
};

const blankUsers: UserDashboardStats = {
  students: 0,
  teachers: 0,
  verifiedTeachers: 0,
  pendingTeachers: 0,
  rejectedTeachers: 0,
  suspendedTeachers: 0,
  blockedUsers: 0,
};
const blankQuestions: QuestionDashboardStats = {
  totalQuestions: 0,
  answeredQuestions: 0,
  unansweredQuestions: 0,
  answerRate: 0,
  averageAnswers: 0,
};
const blankCourses: CourseDashboardStats = { publishedCourses: 0, draftCourses: 0, totalCourses: 0 };
const blankEnrollments: EnrollmentDashboardStats = {
  totalEnrollments: 0,
  approvedEnrollments: 0,
  pendingEnrollments: 0,
  rejectedEnrollments: 0,
  estimatedRevenue: 0,
};
const blankModeration: ModerationDashboardStats = {
  pendingReports: 0,
  hiddenQuestions: 0,
  hiddenAnswers: 0,
  hiddenComments: 0,
  blockedStudents: 0,
  suspendedTeachers: 0,
};

function sinceFor(range: AdminDateRange) {
  if (range === 'all') return null;
  const since = new Date();
  if (range === 'today') since.setHours(0, 0, 0, 0);
  else since.setDate(since.getDate() - (range === '7d' ? 7 : 30));
  return since.toISOString();
}

function inRange(createdAt: string, range: AdminDateRange) {
  const since = sinceFor(range);
  return !since || createdAt >= since;
}

async function safely<T>(action: string, fallback: T, loader: () => Promise<T>): Promise<DashboardResult<T>> {
  try {
    return { data: await loader(), error: false };
  } catch (error) {
    logSupabaseError(action, error);
    return { data: fallback, error: true };
  }
}

export function getUserStats(range: AdminDateRange) {
  return safely('adminDashboard.users', blankUsers, async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, is_blocked, verification_status, is_verified, created_at');
    if (error) throw error;
    const rows = (data ?? []).filter((row) => inRange(String(row.created_at), range));
    const teachers = rows.filter((row) => row.role === 'teacher');
    const status = (row: typeof teachers[number]) => row.verification_status ?? (row.is_verified ? 'verified' : 'pending');
    return {
      students: rows.filter((row) => row.role === 'student').length,
      teachers: teachers.length,
      verifiedTeachers: teachers.filter((row) => status(row) === 'verified').length,
      pendingTeachers: teachers.filter((row) => status(row) === 'pending').length,
      rejectedTeachers: teachers.filter((row) => status(row) === 'rejected').length,
      suspendedTeachers: teachers.filter((row) => status(row) === 'suspended').length,
      blockedUsers: rows.filter((row) => row.is_blocked || status(row) === 'blocked').length,
    };
  });
}

export function getQuestionStats(range: AdminDateRange) {
  return safely('adminDashboard.questions', blankQuestions, async () => {
    const [questions, answers] = await Promise.all([
      supabase.from('questions').select('id, status, created_at'),
      supabase.from('answers').select('id, question_id, created_at'),
    ]);
    if (questions.error) throw questions.error;
    if (answers.error) throw answers.error;
    const rows = (questions.data ?? []).filter((question) => inRange(String(question.created_at), range));
    const ids = new Set(rows.map((question) => question.id));
    const answerRows = (answers.data ?? []).filter((answer) => ids.has(answer.question_id));
    const answeredIds = new Set(answerRows.map((answer) => answer.question_id));
    const answered = rows.filter((question) => question.status === 'answered' || answeredIds.has(question.id)).length;
    return {
      totalQuestions: rows.length,
      answeredQuestions: answered,
      unansweredQuestions: Math.max(0, rows.length - answered),
      answerRate: rows.length ? Math.round((answered / rows.length) * 100) : 0,
      averageAnswers: rows.length ? Number((answerRows.length / rows.length).toFixed(1)) : 0,
    };
  });
}

export function getTeacherStats(range: AdminDateRange) {
  return safely('adminDashboard.teachers', {
    total: 0, verified: 0, pending: 0, rejected: 0, suspended: 0, blocked: 0,
  }, async () => {
    const { data, error } = await supabase.from('profiles').select('verification_status, is_verified, is_blocked, created_at').eq('role', 'teacher');
    if (error) throw error;
    const rows = (data ?? []).filter((teacher) => inRange(String(teacher.created_at), range));
    const status = (teacher: typeof rows[number]) => teacher.verification_status ?? (teacher.is_verified ? 'verified' : 'pending');
    return {
      total: rows.length,
      verified: rows.filter((teacher) => status(teacher) === 'verified').length,
      pending: rows.filter((teacher) => status(teacher) === 'pending').length,
      rejected: rows.filter((teacher) => status(teacher) === 'rejected').length,
      suspended: rows.filter((teacher) => status(teacher) === 'suspended').length,
      blocked: rows.filter((teacher) => teacher.is_blocked || status(teacher) === 'blocked').length,
    };
  });
}

export function getCourseStats(range: AdminDateRange) {
  return safely('adminDashboard.courses', blankCourses, async () => {
    const { data, error } = await supabase.from('courses').select('id, is_published, created_at');
    if (error) throw error;
    const rows = (data ?? []).filter((course) => inRange(String(course.created_at), range));
    return {
      totalCourses: rows.length,
      publishedCourses: rows.filter((course) => course.is_published).length,
      draftCourses: rows.filter((course) => !course.is_published).length,
    };
  });
}

export function getEnrollmentStats(range: AdminDateRange) {
  return safely('adminDashboard.enrollments', blankEnrollments, async () => {
    const { data, error } = await supabase.from('course_enrollments').select('id, status, created_at, courses:course_id(price)');
    if (error) throw error;
    const rows = (data ?? []).filter((enrollment) => inRange(String(enrollment.created_at), range));
    const approved = rows.filter((enrollment) => enrollment.status === 'approved');
    return {
      totalEnrollments: rows.length,
      approvedEnrollments: approved.length,
      pendingEnrollments: rows.filter((enrollment) => enrollment.status === 'pending').length,
      rejectedEnrollments: rows.filter((enrollment) => enrollment.status === 'rejected').length,
      estimatedRevenue: approved.reduce((sum, enrollment) => {
        const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
        return sum + Number(course?.price ?? 0);
      }, 0),
    };
  });
}

export function getModerationStats(range: AdminDateRange) {
  return safely('adminDashboard.moderation', blankModeration, async () => {
    const [reports, questions, answers, comments, students, teachers] = await Promise.all([
      supabase.from('reports').select('id, status, created_at'),
      supabase.from('questions').select('id, is_hidden, created_at'),
      supabase.from('answers').select('id, is_hidden, created_at'),
      supabase.from('answer_comments').select('id, is_hidden, created_at'),
      supabase.from('profiles').select('id, is_blocked, created_at').eq('role', 'student'),
      supabase.from('profiles').select('id, verification_status, created_at').eq('role', 'teacher'),
    ]);
    const error = reports.error ?? questions.error ?? answers.error ?? comments.error ?? students.error ?? teachers.error;
    if (error) throw error;
    return {
      pendingReports: (reports.data ?? []).filter((row) => inRange(String(row.created_at), range) && row.status === 'pending').length,
      hiddenQuestions: (questions.data ?? []).filter((row) => inRange(String(row.created_at), range) && row.is_hidden).length,
      hiddenAnswers: (answers.data ?? []).filter((row) => inRange(String(row.created_at), range) && row.is_hidden).length,
      hiddenComments: (comments.data ?? []).filter((row) => inRange(String(row.created_at), range) && row.is_hidden).length,
      blockedStudents: (students.data ?? []).filter((row) => inRange(String(row.created_at), range) && row.is_blocked).length,
      suspendedTeachers: (teachers.data ?? []).filter((row) => inRange(String(row.created_at), range) && row.verification_status === 'suspended').length,
    };
  });
}

export function getRatingStats(range: AdminDateRange) {
  return safely('adminDashboard.ratings', { averageRating: 0, totalRatings: 0 } as RatingDashboardStats, async () => {
    const { data, error } = await supabase.from('ratings').select('rating, created_at');
    if (error) throw error;
    const ratings = (data ?? []).filter((item) => inRange(String(item.created_at), range));
    return {
      averageRating: ratings.length ? Number((ratings.reduce((sum, item) => sum + Number(item.rating), 0) / ratings.length).toFixed(1)) : 0,
      totalRatings: ratings.length,
    };
  });
}

export function getRecentActivity(range: AdminDateRange, limit = 10) {
  return safely('adminDashboard.activity', [] as ActivityItem[], async () => {
    const [questions, answers, enrollments, reports, profiles] = await Promise.all([
      supabase.from('questions').select('id, title, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('answers').select('id, question_id, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('course_enrollments').select('id, status, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('reports').select('id, reason, created_at').order('created_at', { ascending: false }).limit(limit),
      supabase.from('profiles').select('id, full_name, role, created_at').in('role', ['student', 'teacher']).order('created_at', { ascending: false }).limit(limit),
    ]);
    const error = questions.error ?? answers.error ?? enrollments.error ?? reports.error ?? profiles.error;
    if (error) throw error;
    const items: ActivityItem[] = [
      ...(questions.data ?? []).map((item) => ({ id: `question-${item.id}`, kind: 'question' as const, title: 'Nouvelle question posée', description: item.title, createdAt: item.created_at, to: `/questions/${item.id}` })),
      ...(answers.data ?? []).map((item) => ({ id: `answer-${item.id}`, kind: 'answer' as const, title: 'Nouvelle réponse publiée', description: 'Une réponse a été ajoutée à une discussion.', createdAt: item.created_at, to: `/questions/${item.question_id}` })),
      ...(enrollments.data ?? []).map((item) => ({ id: `enrollment-${item.id}`, kind: 'enrollment' as const, title: 'Preuve de paiement envoyée', description: `Inscription ${item.status}.`, createdAt: item.created_at, to: '/admin/enrollments' })),
      ...(reports.data ?? []).map((item) => ({ id: `report-${item.id}`, kind: 'report' as const, title: 'Nouveau report reçu', description: item.reason, createdAt: item.created_at, to: '/admin/reports' })),
      ...(profiles.data ?? []).map((item) => ({ id: `profile-${item.id}`, kind: item.role === 'teacher' ? 'teacher' as const : 'student' as const, title: item.role === 'teacher' ? 'Nouveau prof inscrit' : 'Nouvel étudiant inscrit', description: item.full_name, createdAt: item.created_at, to: item.role === 'teacher' ? `/admin/teachers/${item.id}` : `/admin/students/${item.id}` })),
    ];
    return items.filter((item) => inRange(item.createdAt, range)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  });
}

export function getTopTeachers(limit = 5) {
  return safely('adminDashboard.topTeachers', [] as AdminTeacherSummary[], async () => {
    const rows = await getAdminTeachers({ sort: 'most-answers' });
    return rows.filter((teacher) => teacher.total_answers || teacher.total_courses || teacher.total_ratings).slice(0, limit);
  });
}

export function getTopSubjects(range: AdminDateRange, limit = 5) {
  return safely('adminDashboard.topSubjects', [] as TopSubject[], async () => {
    const [questions, answers] = await Promise.all([
      supabase.from('questions').select('id, subject, status, created_at'),
      supabase.from('answers').select('question_id'),
    ]);
    if (questions.error) throw questions.error;
    if (answers.error) throw answers.error;
    const answeredIds = new Set((answers.data ?? []).map((answer) => answer.question_id));
    const grouped = new Map<string, { questions: number; answered: number }>();
    (questions.data ?? []).filter((question) => inRange(String(question.created_at), range)).forEach((question) => {
      const name = question.subject || 'Autre';
      const current = grouped.get(name) ?? { questions: 0, answered: 0 };
      current.questions += 1;
      if (question.status === 'answered' || answeredIds.has(question.id)) current.answered += 1;
      grouped.set(name, current);
    });
    return [...grouped.entries()].map(([name, data]) => ({
      name,
      questionCount: data.questions,
      answeredCount: data.answered,
      answerRate: data.questions ? Math.round((data.answered / data.questions) * 100) : 0,
    })).sort((a, b) => b.questionCount - a.questionCount).slice(0, limit);
  });
}

export function getTopCourses(range: AdminDateRange, limit = 5) {
  return safely('adminDashboard.topCourses', [] as TopCourse[], async () => {
    const [courses, enrollments] = await Promise.all([
      supabase.from('courses').select('id, title, subject, created_at'),
      supabase.from('course_enrollments').select('course_id, status, created_at'),
    ]);
    if (courses.error) throw courses.error;
    if (enrollments.error) throw enrollments.error;
    return (courses.data ?? []).map((course) => {
      const linked = (enrollments.data ?? []).filter((enrollment) => enrollment.course_id === course.id && inRange(String(enrollment.created_at), range));
      return { id: course.id, title: course.title, subject: course.subject, enrollmentCount: linked.length, approvedCount: linked.filter((item) => item.status === 'approved').length };
    }).filter((course) => range === 'all' || course.enrollmentCount > 0).sort((a, b) => b.enrollmentCount - a.enrollmentCount).slice(0, limit);
  });
}

export async function getAdminDashboardStats(range: AdminDateRange) {
  const [users, questions, courses, enrollments, moderation, ratings] = await Promise.all([
    getUserStats(range), getQuestionStats(range), getCourseStats(range), getEnrollmentStats(range), getModerationStats(range), getRatingStats(range),
  ]);
  return { users, questions, courses, enrollments, moderation, ratings };
}
