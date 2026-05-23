import {
  BookOpen,
  CircleAlert,
  CreditCard,
  GraduationCap,
  MessageSquare,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Star,
  UserRound,
  Users,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminActivityTimeline from '../components/admin/AdminActivityTimeline';
import AdminQuickActionCard from '../components/admin/AdminQuickActionCard';
import AdminSectionHeader from '../components/admin/AdminSectionHeader';
import AdminStatCard from '../components/admin/AdminStatCard';
import TeacherVerificationBadge, { teacherStatus } from '../components/admin/TeacherVerificationBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { money } from '../lib/utils';
import {
  AdminDateRange,
  ActivityItem,
  DashboardResult,
  getAdminDashboardStats,
  getRecentActivity,
  getTopCourses,
  getTopSubjects,
  getTopTeachers,
  TopCourse,
  TopSubject,
} from '../services/adminDashboardService';
import { AdminTeacherSummary } from '../services/adminTeachersService';

type DashboardStats = Awaited<ReturnType<typeof getAdminDashboardStats>>;

const periods: Array<{ value: AdminDateRange; label: string }> = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 derniers jours' },
  { value: '30d', label: '30 derniers jours' },
  { value: 'all', label: 'Depuis le début' },
];

export default function AdminDashboardPage() {
  const [range, setRange] = useState<AdminDateRange>('30d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<DashboardResult<ActivityItem[]> | null>(null);
  const [teachers, setTeachers] = useState<DashboardResult<AdminTeacherSummary[]> | null>(null);
  const [subjects, setSubjects] = useState<DashboardResult<TopSubject[]> | null>(null);
  const [courses, setCourses] = useState<DashboardResult<TopCourse[]> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      getAdminDashboardStats(range),
      getRecentActivity(range),
      getTopTeachers(),
      getTopSubjects(range),
      getTopCourses(range),
    ]).then(([nextStats, nextActivity, nextTeachers, nextSubjects, nextCourses]) => {
      setStats(nextStats);
      setActivity(nextActivity);
      setTeachers(nextTeachers);
      setSubjects(nextSubjects);
      setCourses(nextCourses);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [range]);

  if (loading && !stats) return <LoadingSpinner label="Chargement du tableau de bord" />;

  const failed = stats ? [stats.users.error, stats.questions.error, stats.courses.error, stats.enrollments.error, stats.moderation.error, stats.ratings.error].filter(Boolean).length : 0;
  const enrollment = stats?.enrollments.data;

  return (
    <section className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-brand-orange">Administration</p>
          <h1 className="mt-2 text-3xl font-black text-elios-navy">Tableau de bord admin</h1>
          <p className="mt-2 text-slate-600">Suivez l&apos;activité, la qualité et la croissance de sosprof.tn.</p>
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-brand-border bg-white p-1 shadow-sm" aria-label="Période">
          {periods.map((period) => (
            <button key={period.value} type="button" onClick={() => setRange(period.value)} className={`rounded-lg px-3 py-2 text-sm font-bold transition ${range === period.value ? 'bg-elios-navy text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {period.label}
            </button>
          ))}
        </div>
      </header>

      {failed ? (
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-orange-900">Certaines statistiques n&apos;ont pas pu être chargées. Les sections disponibles restent affichées.</p>
          <button type="button" onClick={load} className="rounded-xl bg-elios-navy px-4 py-2.5 text-sm font-bold text-white">Réessayer</button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Étudiants" value={stats?.users.data.students ?? 0} icon={Users} hint="Comptes créés" />
        <AdminStatCard label="Profs" value={stats?.users.data.teachers ?? 0} icon={GraduationCap} hint="Comptes créés" />
        <AdminStatCard label="Profs vérifiés" value={stats?.users.data.verifiedTeachers ?? 0} icon={ShieldCheck} />
        <AdminStatCard label="Profs en attente" value={stats?.users.data.pendingTeachers ?? 0} icon={ShieldAlert} />
        <AdminStatCard label="Questions" value={stats?.questions.data.totalQuestions ?? 0} icon={MessageSquare} />
        <AdminStatCard label="Questions répondues" value={stats?.questions.data.answeredQuestions ?? 0} icon={MessageSquare} />
        <AdminStatCard label="Taux de réponse" value={`${stats?.questions.data.answerRate ?? 0}%`} icon={ShieldCheck} />
        <AdminStatCard label="Cours publiés" value={stats?.courses.data.publishedCourses ?? 0} icon={BookOpen} />
        <AdminStatCard label="Inscriptions en attente" value={enrollment?.pendingEnrollments ?? 0} icon={CreditCard} />
        <AdminStatCard label="Reports en attente" value={stats?.moderation.data.pendingReports ?? 0} icon={CircleAlert} />
        <AdminStatCard label="Comptes bloqués" value={stats?.users.data.blockedUsers ?? 0} icon={ShieldOff} />
        <AdminStatCard label="Note moyenne" value={`${stats?.ratings.data.averageRating.toFixed(1) ?? '0.0'} / 5`} icon={Star} hint={`${stats?.ratings.data.totalRatings ?? 0} avis`} />
      </div>

      <section className="space-y-4">
        <AdminSectionHeader title="Actions rapides" subtitle="Les files qui demandent votre attention." />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AdminQuickActionCard to="/admin/teachers?status=pending" title="Vérifier les profs" description="Examiner les profils en attente." icon={ShieldCheck} count={stats?.users.data.pendingTeachers} />
          <AdminQuickActionCard to="/admin/reports?status=pending" title="Gérer les reports" description="Traiter les signalements ouverts." icon={CircleAlert} count={stats?.moderation.data.pendingReports} />
          <AdminQuickActionCard to="/admin/enrollments?status=pending" title="Voir les inscriptions" description="Valider les preuves de paiement." icon={CreditCard} count={enrollment?.pendingEnrollments} />
          <AdminQuickActionCard to="/admin/moderation" title="Modérer les discussions" description="Vérifier questions, réponses et commentaires." icon={MessageSquare} />
          <AdminQuickActionCard to="/admin/courses" title="Gérer les cours" description="Contrôler l'offre de formation." icon={BookOpen} />
          <AdminQuickActionCard to="/admin/students" title="Gérer les étudiants" description="Suivre comptes et activité." icon={UserRound} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Panel>
            <AdminSectionHeader title="Qualité des profs" subtitle="Vérification et réputation." action={<Link to="/admin/teachers" className="text-sm font-bold text-elios-blue">Gérer les profs</Link>} />
            {stats?.users.error ? <SectionError /> : (
              <div className="grid gap-3 sm:grid-cols-4">
                <SmallMetric label="Vérifiés" value={stats?.users.data.verifiedTeachers ?? 0} tone="success" />
                <SmallMetric label="En attente" value={stats?.users.data.pendingTeachers ?? 0} tone="warning" />
                <SmallMetric label="Refusés" value={stats?.users.data.rejectedTeachers ?? 0} tone="danger" />
                <SmallMetric label="Suspendus" value={stats?.users.data.suspendedTeachers ?? 0} tone="neutral" />
              </div>
            )}
            {teachers?.error ? <SectionError /> : teachers?.data.length ? (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
                {teachers.data.map((teacher) => (
                  <Link key={teacher.id} to={`/admin/teachers/${teacher.id}`} className="flex flex-col justify-between gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-bold text-elios-navy">{teacher.full_name}</p>
                      <p className="text-sm text-slate-500">{teacher.specialty || 'Spécialité non indiquée'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span>{Number(teacher.average_rating).toFixed(1)} / 5</span>
                      <span>{teacher.total_best_answers} meilleures réponses</span>
                      <TeacherVerificationBadge status={teacherStatus(teacher)} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : <Empty text="Aucun prof actif à classer pour le moment." />}
          </Panel>

          <Panel>
            <AdminSectionHeader title="Questions & réponses" subtitle="Engagement et qualité des échanges." action={<Link to="/admin/moderation" className="text-sm font-bold text-elios-blue">Modérer</Link>} />
            {stats?.questions.error ? <SectionError /> : (
              <div className="grid gap-3 sm:grid-cols-4">
                <SmallMetric label="Total" value={stats?.questions.data.totalQuestions ?? 0} />
                <SmallMetric label="Répondues" value={stats?.questions.data.answeredQuestions ?? 0} tone="success" />
                <SmallMetric label="Sans réponse" value={stats?.questions.data.unansweredQuestions ?? 0} tone="warning" />
                <SmallMetric label="Réponses / question" value={stats?.questions.data.averageAnswers ?? 0} />
              </div>
            )}
            <h3 className="pt-2 text-sm font-black uppercase text-slate-500">Matières les plus actives</h3>
            {subjects?.error ? <SectionError /> : subjects?.data.length ? subjects.data.map((subject) => (
              <div key={subject.name} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <p className="font-bold text-elios-navy">{subject.name}</p>
                <p className="text-slate-600">{subject.questionCount} questions - {subject.answerRate}% répondues</p>
              </div>
            )) : <Empty text="Aucune question par matière sur la période." />}
          </Panel>

          <Panel>
            <AdminSectionHeader title="Cours & inscriptions" subtitle="Accès payants et activité pédagogique." action={<div className="flex gap-3"><Link to="/admin/courses" className="text-sm font-bold text-elios-blue">Cours</Link><Link to="/admin/enrollments" className="text-sm font-bold text-elios-blue">Inscriptions</Link></div>} />
            {stats?.enrollments.error || stats?.courses.error ? <SectionError /> : (
              <div className="grid gap-3 sm:grid-cols-4">
                <SmallMetric label="Publiés" value={stats?.courses.data.publishedCourses ?? 0} />
                <SmallMetric label="Approuvées" value={enrollment?.approvedEnrollments ?? 0} tone="success" />
                <SmallMetric label="En attente" value={enrollment?.pendingEnrollments ?? 0} tone="warning" />
                <SmallMetric label="Refusées" value={enrollment?.rejectedEnrollments ?? 0} tone="danger" />
              </div>
            )}
            <div className="rounded-xl bg-elios-navy p-4 text-white">
              <p className="text-xs font-bold uppercase text-blue-100">Revenus estimés</p>
              <p className="mt-2 text-3xl font-black">{money(enrollment?.estimatedRevenue ?? 0, 'TND')}</p>
              <p className="mt-1 text-xs text-blue-100">Basés sur le prix des cours pour les inscriptions approuvées.</p>
            </div>
            {courses?.error ? <SectionError /> : courses?.data.length ? courses.data.map((course) => (
              <Link key={course.id} to={`/courses/${course.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3 text-sm hover:bg-slate-50">
                <div><p className="font-bold text-elios-navy">{course.title}</p><p className="text-slate-500">{course.subject}</p></div>
                <p className="text-right text-slate-600">{course.enrollmentCount} inscriptions<br /><span className="text-emerald-700">{course.approvedCount} approuvées</span></p>
              </Link>
            )) : <Empty text="Aucun cours inscrit sur la période." />}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <AdminSectionHeader title="Activité récente" subtitle="Derniers événements de la plateforme." />
            {activity?.error ? <SectionError /> : <AdminActivityTimeline items={activity?.data ?? []} />}
          </Panel>
          <Panel>
            <AdminSectionHeader title="Modération" subtitle="Éléments à surveiller." action={<Link to="/admin/reports" className="text-sm font-bold text-elios-blue">Voir les reports</Link>} />
            {stats?.moderation.error ? <SectionError /> : (
              <div className="space-y-2">
                <ModerationLine label="Reports en attente" value={stats?.moderation.data.pendingReports ?? 0} danger />
                <ModerationLine label="Questions masquées" value={stats?.moderation.data.hiddenQuestions ?? 0} />
                <ModerationLine label="Réponses masquées" value={stats?.moderation.data.hiddenAnswers ?? 0} />
                <ModerationLine label="Commentaires masqués" value={stats?.moderation.data.hiddenComments ?? 0} />
                <ModerationLine label="Étudiants bloqués" value={stats?.moderation.data.blockedStudents ?? 0} danger />
                <ModerationLine label="Profs suspendus" value={stats?.moderation.data.suspendedTeachers ?? 0} danger />
              </div>
            )}
          </Panel>
          <Panel>
            <AdminSectionHeader title="Paiements" subtitle="Synthèse des inscriptions." />
            <div className="flex items-center gap-3 rounded-xl bg-orange-50 p-4 text-brand-navy">
              <Receipt className="h-6 w-6 shrink-0 text-brand-orange" />
              <div><p className="text-sm font-bold">{enrollment?.totalEnrollments ?? 0} inscriptions</p><p className="text-xs text-slate-600">{enrollment?.pendingEnrollments ?? 0} paiements en attente de validation</p></div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm">{children}</section>;
}

function SectionError() {
  return <p className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">Impossible de charger cette section.</p>;
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">{text}</p>;
}

function SmallMetric({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const tones = { neutral: 'bg-slate-50 text-elios-navy', success: 'bg-emerald-50 text-emerald-800', warning: 'bg-amber-50 text-amber-800', danger: 'bg-red-50 text-red-800' };
  return <div className={`rounded-xl p-3 ${tones[tone]}`}><p className="text-2xl font-black">{value}</p><p className="text-xs font-semibold">{label}</p></div>;
}

function ModerationLine({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return <div className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 text-sm"><span className="font-semibold text-slate-600">{label}</span><span className={`rounded-full px-2.5 py-1 font-black ${danger && value ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-elios-navy'}`}>{value}</span></div>;
}
