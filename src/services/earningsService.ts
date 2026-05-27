import { logSupabaseError } from '../lib/debug';
import { supabase } from '../lib/supabase';
import { Profile, TeacherEarning, TeacherEarningStatus } from '../types/database';

export type EarningsFilters = {
  year?: number | '';
  month?: number | '';
  teacherId?: string;
  courseId?: string;
  status?: TeacherEarningStatus | 'all';
  currency?: string;
};

export type EarningsSummary = {
  gross: number;
  teacherAmount: number;
  platformAmount: number;
  pending: number;
  sales: number;
  monthTeacherAmount: number;
  yearTeacherAmount: number;
  monthGross: number;
  yearGross: number;
};

export type TeacherRevenueRow = {
  teacher: Pick<Profile, 'id' | 'full_name' | 'email' | 'teacher_revenue_share_percent'>;
  coursesCount: number;
  gross: number;
  teacherAmount: number;
  platformAmount: number;
  sales: number;
};

export type CourseRevenueRow = {
  courseId: string;
  courseTitle: string;
  teacherName: string;
  gross: number;
  teacherAmount: number;
  platformAmount: number;
  sales: number;
};

const select = `
  *,
  courses:course_id(id,title,currency),
  teacher:profiles!teacher_earnings_teacher_id_fkey(id,full_name,email,teacher_revenue_share_percent),
  enrollment:course_enrollments!teacher_earnings_enrollment_id_fkey(
    student:profiles!course_enrollments_student_id_fkey(id,full_name)
  )
`;

function fail(action: string, error: unknown): never {
  logSupabaseError(action, error);
  throw error;
}

function isActive(row: TeacherEarning) {
  return row.status === 'earned' || row.status === 'paid_out';
}

function filterEarnings(rows: TeacherEarning[], filters: EarningsFilters) {
  return rows.filter((row) => {
    const date = new Date(row.earned_at);
    if (filters.year && date.getFullYear() !== filters.year) return false;
    if (filters.month && date.getMonth() + 1 !== filters.month) return false;
    if (filters.teacherId && row.teacher_id !== filters.teacherId) return false;
    if (filters.courseId && row.course_id !== filters.courseId) return false;
    if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false;
    if (filters.currency && row.currency !== filters.currency) return false;
    return true;
  });
}

async function getTransactions(action: string, filters: EarningsFilters) {
  const { data, error } = await supabase.from('teacher_earnings').select(select).order('earned_at', { ascending: false });
  if (error) return fail(action, error);
  return filterEarnings((data ?? []) as unknown as TeacherEarning[], filters);
}

export function getTeacherEarningsTransactions(filters: EarningsFilters = {}) {
  return getTransactions('earnings.teacher.transactions', filters);
}

export function getAdminEarningsTransactions(filters: EarningsFilters = {}) {
  return getTransactions('earnings.admin.transactions', filters);
}

export function summarizeEarnings(rows: TeacherEarning[]): EarningsSummary {
  const active = rows.filter(isActive);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const inMonth = active.filter((row) => {
    const earned = new Date(row.earned_at);
    return earned.getMonth() === month && earned.getFullYear() === year;
  });
  const inYear = active.filter((row) => new Date(row.earned_at).getFullYear() === year);
  return {
    gross: active.reduce((total, row) => total + Number(row.gross_amount), 0),
    teacherAmount: active.reduce((total, row) => total + Number(row.teacher_amount), 0),
    platformAmount: active.reduce((total, row) => total + Number(row.platform_amount), 0),
    pending: rows.filter((row) => row.status === 'pending').reduce((total, row) => total + Number(row.teacher_amount), 0),
    sales: active.length,
    monthTeacherAmount: inMonth.reduce((total, row) => total + Number(row.teacher_amount), 0),
    yearTeacherAmount: inYear.reduce((total, row) => total + Number(row.teacher_amount), 0),
    monthGross: inMonth.reduce((total, row) => total + Number(row.gross_amount), 0),
    yearGross: inYear.reduce((total, row) => total + Number(row.gross_amount), 0),
  };
}

export async function getTeacherEarningsSummary(filters: EarningsFilters = {}) {
  return summarizeEarnings(await getTeacherEarningsTransactions(filters));
}

export async function getAdminEarningsSummary(filters: EarningsFilters = {}) {
  return summarizeEarnings(await getAdminEarningsTransactions(filters));
}

export function groupEarningsByMonth(rows: TeacherEarning[], year: number) {
  const values = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, gross: 0, teacherAmount: 0, platformAmount: 0 }));
  rows.filter(isActive).forEach((row) => {
    const date = new Date(row.earned_at);
    if (date.getFullYear() !== year) return;
    const slot = values[date.getMonth()];
    slot.gross += Number(row.gross_amount);
    slot.teacherAmount += Number(row.teacher_amount);
    slot.platformAmount += Number(row.platform_amount);
  });
  return values;
}

export async function getAdminEarningsByTeacher(filters: EarningsFilters = {}) {
  const [transactions, teacherResult, courseResult] = await Promise.all([
    getAdminEarningsTransactions(filters),
    supabase.from('profiles').select('id,full_name,email,teacher_revenue_share_percent').eq('role', 'teacher').order('full_name'),
    supabase.from('courses').select('id,teacher_id'),
  ]);
  if (teacherResult.error) return fail('earnings.admin.teachers', teacherResult.error);
  if (courseResult.error) return fail('earnings.admin.teacherCourses', courseResult.error);
  return ((teacherResult.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'email' | 'teacher_revenue_share_percent'>[])
    .filter((teacher) => !filters.teacherId || teacher.id === filters.teacherId)
    .map((teacher): TeacherRevenueRow => {
      const rows = transactions.filter((row) => row.teacher_id === teacher.id && isActive(row));
      return {
        teacher,
        coursesCount: (courseResult.data ?? []).filter((course) => course.teacher_id === teacher.id).length,
        gross: rows.reduce((total, row) => total + Number(row.gross_amount), 0),
        teacherAmount: rows.reduce((total, row) => total + Number(row.teacher_amount), 0),
        platformAmount: rows.reduce((total, row) => total + Number(row.platform_amount), 0),
        sales: rows.length,
      };
    });
}

export function groupEarningsByCourse(rows: TeacherEarning[]): CourseRevenueRow[] {
  const result = new Map<string, CourseRevenueRow>();
  rows.filter(isActive).forEach((row) => {
    const current = result.get(row.course_id) ?? {
      courseId: row.course_id,
      courseTitle: row.courses?.title ?? 'Cours',
      teacherName: row.teacher?.full_name ?? 'Prof',
      gross: 0,
      teacherAmount: 0,
      platformAmount: 0,
      sales: 0,
    };
    current.gross += Number(row.gross_amount);
    current.teacherAmount += Number(row.teacher_amount);
    current.platformAmount += Number(row.platform_amount);
    current.sales += 1;
    result.set(row.course_id, current);
  });
  return [...result.values()].sort((left, right) => right.gross - left.gross);
}

export async function getTeacherEarningCourses() {
  const { data, error } = await supabase.from('teacher_earnings').select('course_id, courses:course_id(id,title)');
  if (error) return fail('earnings.courses', error);
  const rows = (data ?? []) as unknown as Array<{ course_id: string; courses?: { id: string; title: string } | null }>;
  return Array.from(new Map(rows.filter((row) => row.courses).map((row) => [row.course_id, row.courses!])).values())
    .sort((first, second) => first.title.localeCompare(second.title, 'fr'));
}

export async function updateTeacherRevenueSharePercent(teacherId: string, percent: number, note?: string) {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('Pourcentage invalide.');
  const { data, error } = await supabase.rpc('admin_update_teacher_revenue_share', {
    target_teacher_id: teacherId,
    new_percent: percent,
    admin_note: note?.trim() || null,
  });
  if (error) return fail('earnings.admin.updateShare', error);
  return data as Profile;
}
