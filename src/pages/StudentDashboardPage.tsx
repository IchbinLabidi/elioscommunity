import { BookOpen, GraduationCap, MessageSquare, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import DashboardStats from '../components/DashboardStats';
import QuestionCard from '../components/QuestionCard';
import TeacherCard from '../components/TeacherCard';
import EmptyState from '../components/ui/EmptyState';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../lib/debug';
import { getMyQuestions } from '../lib/questionsService';
import { formatDate, money } from '../lib/utils';
import { getMyEnrollments } from '../services/enrollmentsService';
import { getLatestCoursesFromFollowedTeachers, getMyFollowedTeachers } from '../services/followsService';
import { getRecommendedCourses } from '../services/coursesService';
import { CourseEnrollmentWithCourse, CourseWithTeacher, QuestionWithStudent, TeacherWithStats } from '../types/database';

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<QuestionWithStudent[]>([]);
  const [followedTeachers, setFollowedTeachers] = useState<TeacherWithStats[]>([]);
  const [followedCourses, setFollowedCourses] = useState<CourseWithTeacher[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<CourseWithTeacher[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [followedLoading, setFollowedLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setDashboardError('');
    setFollowedLoading(true);
    Promise.all([
      getMyQuestions(profile.id),
      getMyFollowedTeachers(),
      getLatestCoursesFromFollowedTeachers(),
      getMyEnrollments(),
      getRecommendedCourses(profile.id),
    ]).then(([questionResult, teacherResult, courseResult, enrollmentResult, recommendedResult]) => {
      setQuestions(questionResult as QuestionWithStudent[]);
      setFollowedTeachers(teacherResult);
      setFollowedCourses(courseResult);
      setEnrollments(enrollmentResult);
      setRecommendedCourses(recommendedResult);
    }).catch((err) => {
      setDashboardError(getErrorMessage(err, 'Unable to load all dashboard data right now.'));
    }).finally(() => {
      setFollowedLoading(false);
    });
  }, [profile]);

  const answered = questions.filter((question) => question.status === 'answered').length;
  const purchasedEnrollments = enrollments.filter((enrollment) => enrollment.status === 'approved');
  const pendingEnrollments = enrollments.filter((enrollment) => enrollment.status === 'pending');

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">Student dashboard</h1>
          <p className="mt-2 text-slate-600">Track your questions, answers, teachers, and courses.</p>
        </div>
        <Link to="/questions/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">
          <MessageSquare className="h-5 w-5" />
          Ask Question
        </Link>
      </div>
      <DashboardStats stats={[
        { label: 'Questions', value: questions.length, icon: MessageSquare },
        { label: 'Answered', value: answered, icon: Star },
        { label: 'Following', value: followedTeachers.length, icon: Users },
        { label: 'Courses to explore', value: 'Live', icon: BookOpen },
      ]} />
      {dashboardError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{dashboardError}</p> : null}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-elios-navy">My purchased courses</h2>
          <Link to="/student/courses" className="text-sm font-bold text-elios-blue">View all my courses</Link>
        </div>
        {purchasedEnrollments.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {purchasedEnrollments.slice(0, 4).map((enrollment) => (
              <article key={enrollment.id} className="rounded-xl border border-emerald-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase text-emerald-700">Purchased</p>
                <h3 className="mt-2 text-xl font-black text-elios-navy">{enrollment.courses?.title ?? 'Course'}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {enrollment.teacher?.full_name ?? 'Elios teacher'} - Full access approved {enrollment.reviewed_at ? formatDate(enrollment.reviewed_at) : 'now'}.
                </p>
                <div className="mt-4 h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-0 rounded-full bg-elios-yellow" />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-500">Progress appears after learning begins</span>
                  {enrollment.courses ? <Link to={`/courses/${enrollment.courses.id}/learn`} className="rounded-lg bg-elios-yellow px-4 py-3 text-sm font-black text-elios-navy">Continue learning</Link> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="No purchased courses yet" message="Approved course enrollments will appear here with quick access to learning." />
        )}
      </section>
      {pendingEnrollments.length ? (
        <section>
          <h2 className="mb-4 text-xl font-bold text-elios-navy">Pending enrollments</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingEnrollments.map((enrollment) => (
              <article key={enrollment.id} className="rounded-xl border border-amber-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase text-amber-700">Pending review</p>
                <h3 className="mt-2 text-lg font-black text-elios-navy">{enrollment.courses?.title ?? 'Course'}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {enrollment.courses ? money(Number(enrollment.courses.price), enrollment.courses.currency ?? 'TND') : 'Payment'} submitted {formatDate(enrollment.created_at)}.
                </p>
                <Link to="/student/enrollments" className="mt-4 inline-flex rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-elios-blue">View status</Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-elios-navy">Recommended courses</h2>
          <Link to="/courses" className="text-sm font-bold text-elios-blue">Browse courses</Link>
        </div>
        {recommendedCourses.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendedCourses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title="Your next course is waiting" message="Browse published courses to find more lessons that fit your goals." />
        )}
      </section>
      <section>
        <h2 className="mb-4 text-xl font-bold text-elios-navy">Teachers you follow</h2>
        {followedLoading ? (
          <LoadingSpinner label="Loading followed teachers" />
        ) : followedTeachers.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {followedTeachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} />)}
          </div>
        ) : (
          <EmptyState icon={GraduationCap} title="Teachers you follow" message="Follow teachers to see their latest courses and updates." />
        )}
      </section>
      {followedCourses.length ? (
        <section>
          <h2 className="mb-4 text-xl font-bold text-elios-navy">Latest courses from followed teachers</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {followedCourses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        </section>
      ) : null}
      <div>
        <h2 className="mb-4 text-xl font-bold text-elios-navy">Your recent questions</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {questions.slice(0, 6).map((question) => <QuestionCard key={question.id} question={question} />)}
        </div>
      </div>
    </section>
  );
}
