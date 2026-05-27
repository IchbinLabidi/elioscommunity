import { BookOpen, Eye, EyeOff, MessageSquare, Star, Users } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActionDialog from '../components/ui/ActionDialog';
import { formatDate, money } from '../lib/utils';
import { AdminSubjectAction, AdminSubjectSummary, getAdminSubjectById, getSubjectCourses, getSubjectQuestions, manageSubject } from '../services/adminSubjectsService';
import { CourseWithTeacher, QuestionWithStudent } from '../types/database';

export default function AdminSubjectDetailPage() {
  const { subjectId = '' } = useParams();
  const [subject, setSubject] = useState<AdminSubjectSummary | null>(null);
  const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
  const [questions, setQuestions] = useState<QuestionWithStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [hideOpen, setHideOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [nextSubject, nextCourses, nextQuestions] = await Promise.all([getAdminSubjectById(subjectId), getSubjectCourses(subjectId), getSubjectQuestions(subjectId)]);
      setSubject(nextSubject);
      setCourses(nextCourses);
      setQuestions(nextQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la matière.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [subjectId]);

  const act = async (action: AdminSubjectAction, suppliedReason?: string) => {
    if (!subject) return;
    if (action === 'hide' && suppliedReason === undefined) {
      setHideOpen(true);
      return;
    }
    const reason = action === 'hide' ? suppliedReason?.trim() : undefined;
    if (action === 'hide' && !reason) return;
    try {
      await manageSubject(subject.id, action, reason);
      setHideOpen(false);
      setNotice('La matière a été mise à jour.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  if (loading) return <LoadingSpinner label="Chargement de la matière" />;
  if (!subject) return <section className="space-y-5"><BackButton label="Retour aux matières" fallbackTo="/admin/subjects" /><p className="rounded-xl bg-red-50 p-5 text-sm font-bold text-red-700">Cette matière est introuvable.</p></section>;

  return (
    <section className="space-y-6">
      <BackButton label="Retour à la gestion des matières" fallbackTo="/admin/subjects" />
      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
      <header className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
        {subject.cover_url ? <img src={subject.cover_url} alt="" className="h-44 w-full object-cover" /> : null}
        <div className="flex flex-col justify-between gap-5 p-6 lg:flex-row lg:items-start">
          <div className="flex gap-4">
            <span style={subject.color ? { backgroundColor: `${subject.color}18`, color: subject.color } : undefined} className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-50 text-xl font-bold text-brand-orange">
              {subject.icon_url ? <img src={subject.icon_url} alt="" className="h-full w-full object-cover" /> : subject.icon || subject.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Matière</p>
              <h1 className="mt-2 text-3xl font-black text-brand-navy">{subject.name}</h1>
              <p className="mt-1 text-sm text-slate-500">/{subject.slug} · ordre {subject.subject_order}</p>
              {subject.description ? <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">{subject.description}</p> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/admin/subjects/${subject.id}/edit`} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Modifier</Link>
            <button onClick={() => void act(subject.is_published ? 'unpublish' : 'publish')} className="rounded-xl bg-brand-navy px-4 py-3 text-sm font-bold text-white">{subject.is_published ? 'Dépublier' : 'Publier'}</button>
            <button onClick={() => void act(subject.is_hidden ? 'unhide' : 'hide')} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">{subject.is_hidden ? 'Restaurer' : 'Masquer'}</button>
            <button onClick={() => void act(subject.is_featured ? 'unfeature' : 'feature')} className="rounded-xl border border-orange-100 px-4 py-3 text-sm font-bold text-brand-orange">{subject.is_featured ? 'Retirer de la une' : 'Mettre en avant'}</button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Cours associés" value={subject.coursesCount} icon={<BookOpen />} />
        <Metric label="Questions associées" value={subject.questionsCount} icon={<MessageSquare />} />
        <Metric label="Profs concernés" value={subject.teachersCount} icon={<Users />} />
        <Metric label="Statut" value={subject.is_hidden ? 'Masquée' : subject.is_published ? 'Publiée' : 'Brouillon'} icon={subject.is_featured ? <Star /> : subject.is_hidden ? <EyeOff /> : <Eye />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Cours liés">
          {courses.length ? courses.slice(0, 10).map((course) => (
            <div key={course.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
              <div><p className="font-bold text-brand-navy">{course.title}</p><p className="text-sm text-slate-500">{course.profiles?.full_name || 'Prof'} · {money(Number(course.price), course.currency)}</p></div>
              <Link to={`/admin/courses/${course.id}`} className="text-sm font-bold text-brand-orange">Ouvrir</Link>
            </div>
          )) : <Empty text="Aucun cours associé." />}
        </Panel>
        <Panel title="Questions liées">
          {questions.length ? questions.slice(0, 10).map((question) => (
            <div key={question.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
              <div><p className="font-bold text-brand-navy">{question.title}</p><p className="text-sm text-slate-500">{question.profiles?.full_name || 'Étudiant'} · {question.answer_count ?? question.answers?.length ?? 0} réponse(s) · {formatDate(question.created_at)}</p></div>
              <Link to="/admin/moderation?tab=questions" className="text-sm font-bold text-brand-orange">Modérer</Link>
            </div>
          )) : <Empty text="Aucune question associée." />}
        </Panel>
      </div>
      <ActionDialog open={hideOpen} title="Masquer cette matière ?" fieldLabel="Motif du masquage" required confirmLabel="Masquer" resetKey={subject.id} onClose={() => setHideOpen(false)} onConfirm={(reason) => act('hide', reason)} />
    </section>
  );
}
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-2xl border border-brand-border bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-brand-navy">{title}</h2>{children}</section>;
}
function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm"><span className="block h-5 w-5 text-brand-orange">{icon}</span><p className="mt-3 text-2xl font-black text-brand-navy">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></article>;
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">{text}</p>;
}
