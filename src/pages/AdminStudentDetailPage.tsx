import { BookOpen, CreditCard, MessageSquare, ShieldOff, ShieldCheck, Star, StickyNote, UserRound } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EnrollmentStatusBadge from '../components/EnrollmentStatusBadge';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatDate, money } from '../lib/utils';
import { hideContent, unhideContent } from '../services/adminService';
import {
  addStudentAdminNote,
  AdminStudentStats,
  blockStudent,
  getStudentActivityTimeline,
  getStudentAdminNotes,
  getStudentById,
  getStudentComments,
  getStudentEnrollments,
  getStudentQuestions,
  getStudentRatings,
  getStudentReports,
  getStudentStats,
  StudentTimelineItem,
  unblockStudent,
} from '../services/adminStudentsService';
import { reviewEnrollment } from '../services/enrollmentsService';
import { AnswerComment, CourseEnrollmentWithCourse, Profile, Question, Rating, Report, StudentAdminNote } from '../types/database';

export default function AdminStudentDetailPage() {
  const { studentId = '' } = useParams();
  const [student, setStudent] = useState<Profile | null>(null);
  const [stats, setStats] = useState<AdminStudentStats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [comments, setComments] = useState<AnswerComment[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollmentWithCourse[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [reports, setReports] = useState<{ submitted: Report[]; received: Report[] }>({ submitted: [], received: [] });
  const [notes, setNotes] = useState<StudentAdminNote[]>([]);
  const [timeline, setTimeline] = useState<StudentTimelineItem[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const profile = await getStudentById(studentId);
      if (!profile) throw new Error('Student not found.');
      setStudent(profile);
      const [nextStats, nextQuestions, nextComments, nextEnrollments, nextRatings, nextReports, nextNotes, nextTimeline] = await Promise.all([
        getStudentStats(studentId),
        getStudentQuestions(studentId),
        getStudentComments(studentId),
        getStudentEnrollments(studentId),
        getStudentRatings(studentId),
        getStudentReports(studentId),
        getStudentAdminNotes(studentId),
        getStudentActivityTimeline(profile),
      ]);
      setStats(nextStats);
      setQuestions(nextQuestions);
      setComments(nextComments);
      setEnrollments(nextEnrollments);
      setRatings(nextRatings);
      setReports(nextReports);
      setNotes(nextNotes);
      setTimeline(nextTimeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load student account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [studentId]);

  const toggleBlocked = async () => {
    if (!student) return;
    setBusy('status');
    try {
      if (student.is_blocked) await unblockStudent(student.id);
      else {
        const reason = window.prompt('Reason for blocking this student');
        if (!reason?.trim()) return;
        await blockStudent(student.id, reason.trim());
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change student status.');
    } finally {
      setBusy('');
    }
  };

  const submitNote = async (event: FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    setBusy('note');
    try {
      await addStudentAdminNote(studentId, note.trim());
      setNote('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add note.');
    } finally {
      setBusy('');
    }
  };

  const moderate = async (type: 'question' | 'answer_comment' | 'rating', id: string, hidden?: boolean) => {
    setBusy(id);
    try {
      if (hidden) await unhideContent(type, id);
      else await hideContent(type, id, window.prompt('Moderation reason') || 'Moderated by admin');
      await load();
    } finally {
      setBusy('');
    }
  };

  const review = async (enrollmentId: string, status: 'approved' | 'rejected') => {
    setBusy(enrollmentId);
    try {
      const reason = status === 'rejected' ? window.prompt('Rejection reason') || '' : '';
      await reviewEnrollment(enrollmentId, status, reason);
      await load();
    } finally {
      setBusy('');
    }
  };

  if (loading) return <LoadingSpinner label="Loading student account" />;

  return (
    <section className="space-y-6">
      <BackButton label="Back to students" fallbackTo="/admin/students" />
      {error ? <p className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}
      {student ? (
        <>
          <header className="flex flex-col justify-between gap-5 rounded-2xl border border-brand-border bg-white p-6 shadow-sm md:flex-row md:items-start">
            <div className="flex gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-elios-sky text-elios-blue"><UserRound className="h-7 w-7" /></span>
              <div>
                <p className="text-xs font-black uppercase text-brand-orange">Student profile</p>
                <h1 className="mt-1 text-3xl font-black text-elios-navy">{student.full_name}</h1>
                <p className="mt-1 text-slate-600">{student.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-3 py-1 font-black ${student.is_blocked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{student.is_blocked ? 'Blocked' : 'Active'}</span>
                  <span className="text-slate-500">Joined {formatDate(student.created_at)}</span>
                </div>
                {student.blocked_reason ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Reason: {student.blocked_reason}</p> : null}
              </div>
            </div>
            <button disabled={busy === 'status'} onClick={toggleBlocked} className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-bold disabled:opacity-50 ${student.is_blocked ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'}`}>
              {student.is_blocked ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5" />}
              {student.is_blocked ? 'Unblock student' : 'Block student'}
            </button>
          </header>

          {stats ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Questions asked', value: stats.questionsCount, icon: MessageSquare },
                { label: 'Answers received', value: stats.answersReceivedCount, icon: MessageSquare },
                { label: 'Comments posted', value: stats.commentsCount, icon: MessageSquare },
                { label: 'Purchased courses', value: stats.purchasedCoursesCount, icon: BookOpen },
                { label: 'Pending enrollments', value: stats.pendingEnrollmentsCount, icon: CreditCard },
                { label: 'Ratings submitted', value: stats.ratingsCount, icon: Star },
                { label: 'Reports submitted', value: stats.reportsSubmittedCount, icon: ShieldOff },
                { label: 'Reports received', value: stats.reportsReceivedCount, icon: ShieldOff },
              ].map(({ label, value, icon: Icon }) => (
                <article key={label} className="rounded-xl border border-brand-border bg-white p-4 shadow-sm">
                  <Icon className="h-5 w-5 text-brand-orange" />
                  <p className="mt-3 text-2xl font-black text-elios-navy">{value}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </article>
              ))}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
            <div className="space-y-6">
              <Panel title="Questions">
                {questions.map((question) => (
                  <AdminContentRow key={question.id} title={question.title} subtitle={`${question.status} - ${formatDate(question.created_at)}`} hidden={question.is_hidden} busy={busy === question.id} onToggle={() => moderate('question', question.id, question.is_hidden)}>
                    <Link to={`/questions/${question.id}`} className="text-sm font-bold text-elios-blue">Open question</Link>
                  </AdminContentRow>
                ))}
                {!questions.length ? <Empty text="No questions submitted." /> : null}
              </Panel>

              <Panel title="Comments and replies">
                {comments.map((comment) => (
                  <AdminContentRow key={comment.id} title={comment.content} subtitle={formatDate(comment.created_at)} hidden={comment.is_hidden} busy={busy === comment.id} onToggle={() => moderate('answer_comment', comment.id, comment.is_hidden)}>
                    <Link to={`/questions/${comment.question_id}`} className="text-sm font-bold text-elios-blue">Open discussion</Link>
                  </AdminContentRow>
                ))}
                {!comments.length ? <Empty text="No comments posted." /> : null}
              </Panel>

              <Panel title="Enrollments and purchased courses">
                {enrollments.map((enrollment) => (
                  <article key={enrollment.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="font-bold text-elios-navy">{enrollment.courses?.title ?? 'Course'}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {enrollment.courses ? money(Number(enrollment.courses.price), enrollment.courses.currency) : ''} - {formatDate(enrollment.created_at)}
                        </p>
                      </div>
                      <EnrollmentStatusBadge status={enrollment.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {enrollment.payment_proof_url ? <a href={enrollment.payment_proof_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-elios-blue">View proof</a> : null}
                      {enrollment.status === 'pending' ? (
                        <>
                          <button disabled={busy === enrollment.id} onClick={() => review(enrollment.id, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white">Approve</button>
                          <button disabled={busy === enrollment.id} onClick={() => review(enrollment.id, 'rejected')} className="rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700">Reject</button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
                {!enrollments.length ? <Empty text="No enrollments found." /> : null}
              </Panel>

              <Panel title="Ratings and reviews">
                {ratings.map((rating) => (
                  <AdminContentRow key={rating.id} title={`${rating.rating}/5 - ${rating.review || 'No written review'}`} subtitle={formatDate(rating.created_at)} hidden={rating.is_hidden} busy={busy === rating.id} onToggle={() => moderate('rating', rating.id, rating.is_hidden)} />
                ))}
                {!ratings.length ? <Empty text="No ratings submitted." /> : null}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Admin notes" icon={<StickyNote className="h-5 w-5 text-brand-orange" />}>
                <form onSubmit={submitNote}>
                  <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={4000} placeholder="Private note for admin staff only" className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-orange focus:ring-4 focus:ring-orange-100" />
                  <button disabled={busy === 'note' || !note.trim()} className="mt-3 w-full rounded-xl bg-elios-navy px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Add private note</button>
                </form>
                {notes.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="text-slate-700">{item.note}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.admin?.full_name ?? 'Admin'} - {formatDate(item.created_at)}</p>
                  </div>
                ))}
              </Panel>

              <Panel title="Reports">
                <p className="text-sm font-bold text-elios-navy">Submitted ({reports.submitted.length})</p>
                {reports.submitted.map((report) => <ReportRow key={report.id} report={report} />)}
                <p className="mt-3 text-sm font-bold text-elios-navy">Against content ({reports.received.length})</p>
                {reports.received.map((report) => <ReportRow key={report.id} report={report} />)}
              </Panel>

              <Panel title="Activity timeline">
                {timeline.map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="relative border-l-2 border-slate-100 pb-4 pl-4 last:pb-0">
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-brand-orange" />
                    <p className="text-sm font-bold text-elios-navy">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2"><h2 className="text-lg font-black text-elios-navy">{title}</h2>{icon}</div>
      {children}
    </section>
  );
}

function AdminContentRow({ title, subtitle, hidden, busy, onToggle, children }: { title: string; subtitle: string; hidden?: boolean; busy: boolean; onToggle: () => void; children?: ReactNode }) {
  return (
    <article className="rounded-xl border border-slate-100 p-3">
      <p className="line-clamp-2 text-sm font-bold text-elios-navy">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {children}
        <button disabled={busy} onClick={onToggle} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{hidden ? 'Unhide' : 'Hide'}</button>
      </div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">{text}</p>;
}

function ReportRow({ report }: { report: Report }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-sm">
      <p className="font-semibold text-elios-navy">{report.reason}</p>
      <p className="mt-1 text-xs text-slate-500">{report.target_type} - {report.status} - {formatDate(report.created_at)}</p>
    </div>
  );
}
