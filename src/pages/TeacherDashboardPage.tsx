import { AlertTriangle, BookOpen, CheckCircle, Clock3, MessageSquare, MessageSquarePlus, ShieldOff, Star, Users, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import DashboardStats from '../components/DashboardStats';
import QuestionCard from '../components/QuestionCard';
import { useAuth } from '../contexts/AuthContext';
import { getQuestionsWithTeacherAnswerStatus } from '../lib/questionsService';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import { getTeacherRatings, getTeacherRatingStats } from '../services/ratingsService';
import { getMyTeacherVerificationDetails } from '../services/teachersService';
import { Course, QuestionWithStudent, TeacherRatingStats, TeacherRatingWithStudent, TeacherStats, TeacherVerificationDetails, TeacherVerificationStatus } from '../types/database';
import RatingStars from '../components/ui/RatingStars';

export default function TeacherDashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [ratingStats, setRatingStats] = useState<TeacherRatingStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [ratings, setRatings] = useState<TeacherRatingWithStudent[]>([]);
  const [openQuestions, setOpenQuestions] = useState<QuestionWithStudent[]>([]);
  const [verificationDetails, setVerificationDetails] = useState<TeacherVerificationDetails | null>(null);
  const [dashboardError, setDashboardError] = useState('');

  useEffect(() => {
    if (!profile) return;
    setDashboardError('');
    Promise.all([
      supabase.from('teacher_stats').select('*').eq('teacher_id', profile.id).maybeSingle(),
      supabase.from('courses').select('*').eq('teacher_id', profile.id).order('created_at', { ascending: false }),
      getTeacherRatingStats(profile.id),
      getTeacherRatings(profile.id),
      getQuestionsWithTeacherAnswerStatus(profile.id),
      getMyTeacherVerificationDetails(),
    ]).then(([statsResult, coursesResult, ratingStatsResult, ratingsResult, questionsResult, detailsResult]) => {
      setStats(statsResult.data as TeacherStats | null);
      setCourses((coursesResult.data ?? []) as Course[]);
      setRatingStats(ratingStatsResult);
      setRatings(ratingsResult.slice(0, 5));
      setOpenQuestions(questionsResult.filter((question) => question.status === 'open').slice(0, 4));
      setVerificationDetails(detailsResult);
    }).catch(() => {
      setDashboardError('Unable to load all dashboard data right now.');
    });
  }, [profile]);

  const verificationStatus: TeacherVerificationStatus = profile?.verification_status ?? (profile?.is_blocked ? 'blocked' : profile?.is_verified ? 'verified' : 'pending');

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-elios-navy">Teacher dashboard</h1>
          <p className="mt-2 text-slate-600">Answer questions, manage courses, and grow your reputation.</p>
        </div>
        <Link to="/questions" className="inline-flex items-center justify-center gap-2 rounded-lg bg-elios-yellow px-4 py-3 font-bold text-elios-navy">
          <MessageSquarePlus className="h-5 w-5" />
          Browse open questions
        </Link>
      </div>
      <VerificationStatusCard status={verificationStatus} reason={verificationDetails?.verification_rejected_reason ?? verificationDetails?.suspension_reason ?? verificationDetails?.blocked_reason ?? profile?.blocked_reason ?? null} />
      <DashboardStats stats={[
        { label: 'Average rating', value: Number(ratingStats?.average_rating ?? stats?.rating_average ?? 0).toFixed(1), icon: Star },
        { label: 'Reviews', value: ratingStats?.total_ratings ?? stats?.rating_count ?? 0, icon: Users },
        { label: 'Answers', value: stats?.answer_count ?? 0, icon: MessageSquare },
        { label: 'Courses', value: courses.length, icon: BookOpen },
      ]} />
      {dashboardError ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{dashboardError}</p> : null}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-elios-navy">Open questions</h2>
          <Link to="/questions" className="text-sm font-bold text-elios-blue">View all</Link>
        </div>
        {openQuestions.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {openQuestions.map((question) => <QuestionCard key={question.id} question={question} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No open questions right now.
          </div>
        )}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="mb-4 text-xl font-bold text-elios-navy">Your courses</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {courses.slice(0, 4).map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold text-elios-navy">Recent reviews</h2>
          <div className="space-y-3">
            {ratings.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-elios-navy">{item.profiles?.full_name || 'Student'}</p>
                    {item.question_title ? <p className="text-xs text-slate-500">{item.question_title}</p> : null}
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                </div>
                <div className="mt-2"><RatingStars value={item.rating} size="sm" /></div>
                <p className="mt-2 text-sm text-slate-600">{item.review || 'No written review.'}</p>
              </div>
            ))}
            {!ratings.length ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No ratings yet.</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function VerificationStatusCard({ status, reason }: { status: TeacherVerificationStatus; reason: string | null }) {
  const content = {
    pending: { icon: Clock3, title: 'Votre profil est en cours de verification.', text: 'Notre equipe examinera votre profil avant d afficher le badge de confiance.', className: 'border-amber-100 bg-amber-50 text-amber-900' },
    verified: { icon: CheckCircle, title: 'Votre profil est verifie.', text: 'Votre badge Prof verifie est visible sur votre profil public.', className: 'border-emerald-100 bg-emerald-50 text-emerald-900' },
    rejected: { icon: XCircle, title: 'Votre verification a ete refusee.', text: 'Mettez a jour votre profil avant une nouvelle verification.', className: 'border-red-100 bg-red-50 text-red-800' },
    suspended: { icon: AlertTriangle, title: 'Votre compte professeur est suspendu.', text: 'Vous ne pouvez pas publier de cours ni repondre aux questions pour le moment.', className: 'border-orange-100 bg-orange-50 text-orange-900' },
    blocked: { icon: ShieldOff, title: 'Votre compte professeur est bloque.', text: 'Contactez le support sosprof.tn pour obtenir de l aide.', className: 'border-red-200 bg-red-50 text-red-900' },
  }[status];
  const Icon = content.icon;
  return (
    <div className={`rounded-2xl border p-5 ${content.className}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">{content.title}</p>
          <p className="mt-1 text-sm">{content.text}</p>
          {reason ? <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm"><strong>Motif:</strong> {reason}</p> : null}
        </div>
      </div>
    </div>
  );
}
