import { BookOpen, EyeOff, MessageSquare, ShieldAlert, Star, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminStatCard from '../components/admin/AdminStatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { getAdminStats } from '../services/adminService';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getAdminStats>> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats().then(setStats).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load admin stats.'));
  }, []);

  if (!stats && !error) return <LoadingSpinner />;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-elios-navy">Admin dashboard</h1>
        <p className="mt-2 text-slate-600">Moderate users, reports, questions, reviews, and courses.</p>
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AdminStatCard label="Students" value={stats.totalStudents} icon={Users} />
          <AdminStatCard label="Teachers" value={stats.totalTeachers} icon={BookOpen} />
          <AdminStatCard label="Pending reports" value={stats.pendingReports} icon={ShieldAlert} />
          <AdminStatCard label="Blocked users" value={stats.blockedUsers} icon={EyeOff} />
          <AdminStatCard label="Courses" value={stats.totalCourses} icon={Star} />
          <AdminStatCard label="Hidden questions" value={stats.hiddenQuestions} icon={MessageSquare} />
          <AdminStatCard label="Hidden answers" value={stats.hiddenAnswers} icon={MessageSquare} />
          <AdminStatCard label="Hidden comments" value={stats.hiddenComments} icon={MessageSquare} />
          <AdminStatCard label="Hidden courses" value={stats.hiddenCourses} icon={BookOpen} />
          <AdminStatCard label="New users this week" value={stats.newUsersThisWeek} icon={Users} />
        </div>
      ) : null}
    </section>
  );
}
