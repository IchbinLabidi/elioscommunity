import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LayoutAwarePage from './components/layout/LayoutAwarePage';
import PublicLayout from './components/layout/PublicLayout';
import { useAuth } from './contexts/AuthContext';
import { dashboardPathForRole } from './lib/auth';
import AdminAuditLogsPage from './pages/AdminAuditLogsPage';
import AdminCourseContentPage from './pages/AdminCourseContentPage';
import AdminCourseDetailPage from './pages/AdminCourseDetailPage';
import AdminCoursesPage from './pages/AdminCoursesPage';
import AdminContentListPage from './pages/AdminContentListPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminEnrollmentsPage from './pages/AdminEnrollmentsPage';
import AdminModerationPage from './pages/AdminModerationPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminStudentDetailPage from './pages/AdminStudentDetailPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminTeacherDetailPage from './pages/AdminTeacherDetailPage';
import AdminTeachersPage from './pages/AdminTeachersPage';
import AdminUsersPage from './pages/AdminUsersPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import CourseEnrollmentPage from './pages/CourseEnrollmentPage';
import CourseBuilderPage from './pages/CourseBuilderPage';
import CourseDetailPage from './pages/CourseDetailPage';
import CourseFormPage from './pages/CourseFormPage';
import CourseLearnPage from './pages/CourseLearnPage';
import CoursesListPage from './pages/CoursesListPage';
import CreateQuestionPage from './pages/CreateQuestionPage';
import EditTeacherProfilePage from './pages/EditTeacherProfilePage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ManageCourseLessonsPage from './pages/ManageCourseLessonsPage';
import MyQuestionsPage from './pages/MyQuestionsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import QuestionDetailPage from './pages/QuestionDetailPage';
import QuestionsListPage from './pages/QuestionsListPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentEnrollmentsPage from './pages/StudentEnrollmentsPage';
import StudentMyCoursesPage from './pages/StudentMyCoursesPage';
import SubjectDetailPage from './pages/SubjectDetailPage';
import SubjectsListPage from './pages/SubjectsListPage';
import TeacherCoursesPage from './pages/TeacherCoursesPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import TeacherEnrollmentRequestsPage from './pages/TeacherEnrollmentRequestsPage';
import TeacherProfilePage from './pages/TeacherProfilePage';
import TeachersListPage from './pages/TeachersListPage';

function RoleHome() {
  const { profile } = useAuth();
  return <Navigate to={profile ? dashboardPathForRole(profile.role) : '/'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="complete-profile" element={<CompleteProfilePage />} />
        <Route path="courses/:courseId/learn" element={<CourseLearnPage />} />
        <Route path="courses/:courseId/learn/videos/:videoId" element={<CourseLearnPage />} />
      </Route>

      <Route element={<LayoutAwarePage />}>
        <Route path="teachers" element={<TeachersListPage />} />
        <Route path="teachers/:id" element={<TeacherProfilePage />} />
        <Route path="courses" element={<CoursesListPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="questions" element={<QuestionsListPage />} />
        <Route path="questions/:id" element={<QuestionDetailPage />} />
        <Route path="subjects" element={<SubjectsListPage />} />
        <Route path="subjects/:subjectSlug" element={<SubjectDetailPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="home" element={<RoleHome />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<ProfileSettingsPage />} />
        </Route>
      </Route>

      <Route element={<RoleBasedRoute roles={['student']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="student/dashboard" element={<StudentDashboardPage />} />
          <Route path="student/courses" element={<StudentMyCoursesPage />} />
          <Route path="student/questions" element={<MyQuestionsPage />} />
          <Route path="student/enrollments" element={<StudentEnrollmentsPage />} />
          <Route path="courses/:courseId/enroll" element={<CourseEnrollmentPage />} />
        </Route>
      </Route>

      <Route element={<RoleBasedRoute roles={['student']} unauthenticatedTo="/register?role=student&redirect=/questions/new" />}>
        <Route element={<DashboardLayout />}>
          <Route path="questions/new" element={<CreateQuestionPage />} />
        </Route>
      </Route>

      <Route element={<RoleBasedRoute roles={['teacher']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="teacher/dashboard" element={<TeacherDashboardPage />} />
          <Route path="teacher/enrollments" element={<TeacherEnrollmentRequestsPage />} />
          <Route path="teacher/profile/edit" element={<EditTeacherProfilePage />} />
          <Route path="teacher/courses" element={<TeacherCoursesPage />} />
          <Route path="teacher/courses/new" element={<CourseFormPage />} />
        </Route>
      </Route>

      <Route element={<RoleBasedRoute roles={['teacher', 'admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="teacher/courses/:id/edit" element={<CourseFormPage />} />
          <Route path="teacher/courses/:courseId/builder" element={<CourseBuilderPage />} />
          <Route path="teacher/courses/:courseId/lessons" element={<ManageCourseLessonsPage />} />
        </Route>
      </Route>

      <Route element={<RoleBasedRoute roles={['admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/students" element={<AdminStudentsPage />} />
          <Route path="admin/students/blocked" element={<Navigate to="/admin/students?status=blocked" replace />} />
          <Route path="admin/students/:studentId" element={<AdminStudentDetailPage />} />
          <Route path="admin/teachers" element={<AdminTeachersPage />} />
          <Route path="admin/teachers/pending" element={<Navigate to="/admin/teachers?status=pending" replace />} />
          <Route path="admin/teachers/verified" element={<Navigate to="/admin/teachers?status=verified" replace />} />
          <Route path="admin/teachers/suspended" element={<Navigate to="/admin/teachers?status=suspended" replace />} />
          <Route path="admin/teachers/blocked" element={<Navigate to="/admin/teachers?status=blocked" replace />} />
          <Route path="admin/teachers/:teacherId" element={<AdminTeacherDetailPage />} />
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/moderation" element={<AdminModerationPage />} />
          <Route path="admin/enrollments" element={<AdminEnrollmentsPage />} />
          <Route path="admin/student-enrollments" element={<AdminEnrollmentsPage />} />
          <Route path="admin/questions" element={<AdminModerationPage initialTab="question" />} />
          <Route path="admin/answers" element={<AdminModerationPage initialTab="answer" />} />
          <Route path="admin/comments" element={<AdminModerationPage initialTab="answer_comment" />} />
          <Route path="admin/ratings" element={<AdminContentListPage type="rating" heading="Ratings and reviews" />} />
          <Route path="admin/courses" element={<AdminCoursesPage />} />
          <Route path="admin/courses/:courseId" element={<AdminCourseDetailPage />} />
          <Route path="admin/courses/:courseId/content" element={<AdminCourseContentPage />} />
          <Route path="admin/chapters" element={<AdminContentListPage type="chapter" heading="Course chapters" />} />
          <Route path="admin/videos" element={<AdminContentListPage type="video" heading="Chapter videos" />} />
          <Route path="admin/attachments" element={<AdminContentListPage type="attachment" heading="Chapter attachments" />} />
          <Route path="admin/audit-logs" element={<AdminAuditLogsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
