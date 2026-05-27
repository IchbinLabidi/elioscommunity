import { AlertTriangle, BookOpen, Eye, EyeOff, MessageSquare, Plus, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminStatCard from '../components/admin/AdminStatCard';
import BackButton from '../components/navigation/BackButton';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ActionDialog from '../components/ui/ActionDialog';
import { formatDate } from '../lib/utils';
import {
  AdminSubjectAction,
  AdminSubjectFilters,
  AdminSubjectSummary,
  AdminSubjectTotals,
  checkSubjectCanDelete,
  getAdminSubjects,
  getAdminSubjectTotals,
  manageSubject,
} from '../services/adminSubjectsService';

export default function AdminSubjectsPage() {
  const [params] = useSearchParams();
  const [subjects, setSubjects] = useState<AdminSubjectSummary[]>([]);
  const [totals, setTotals] = useState<AdminSubjectTotals | null>(null);
  const [filters, setFilters] = useState<AdminSubjectFilters>({
    status: (params.get('status') as AdminSubjectFilters['status']) || 'all',
    sort: 'order',
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingAction, setPendingAction] = useState<{ subject: AdminSubjectSummary; action: 'hide' | 'delete' } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [rows, nextTotals] = await Promise.all([getAdminSubjects(filters), getAdminSubjectTotals()]);
      setSubjects(rows);
      setTotals(nextTotals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les matières.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filters]);
  useEffect(() => {
    setFilters((current) => ({ ...current, status: (params.get('status') as AdminSubjectFilters['status']) || 'all' }));
  }, [params]);

  const act = async (subject: AdminSubjectSummary, action: AdminSubjectAction) => {
    if (action === 'hide' || action === 'delete') {
      setPendingAction({ subject, action });
      return;
    }
    await execute(subject, action);
  };

  const execute = async (subject: AdminSubjectSummary, action: AdminSubjectAction, suppliedReason?: string) => {
    setBusyId(subject.id);
    setError('');
    setNotice('');
    try {
      let reason: string | undefined = suppliedReason;
      if (action === 'hide') {
        reason = suppliedReason?.trim();
        if (!reason) return;
      }
      if (action === 'delete') {
        if (!(await checkSubjectCanDelete(subject.id))) {
          setError('Impossible de supprimer cette matière car elle est utilisée par des cours ou des questions. Masquez-la ou dépubliez-la à la place.');
          return;
        }
      }
      await manageSubject(subject.id, action, reason);
      setPendingAction(null);
      setNotice('La matière a été mise à jour.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.');
    } finally {
      setBusyId('');
    }
  };

  const activeFilters = Boolean(filters.query || filters.status !== 'all' || filters.sort !== 'order');

  return (
    <section className="space-y-6">
      <BackButton label="Retour au tableau de bord" fallbackTo="/admin/dashboard" />
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-orange">Administration</p>
          <h1 className="mt-2 text-3xl font-black text-brand-navy">Gestion des matières</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Organisez les matières utilisées dans les cours, questions et filtres de la plateforme.</p>
        </div>
        <Link to="/admin/subjects/new" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-orange px-5 py-3 text-sm font-bold text-white hover:bg-brand-orangeHover">
          <Plus className="h-4 w-4" /> Ajouter une matière
        </Link>
      </header>

      {totals ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <AdminStatCard label="Total matières" value={totals.total} icon={BookOpen} />
          <AdminStatCard label="Publiées" value={totals.published} icon={Eye} />
          <AdminStatCard label="Masquées" value={totals.hidden} icon={EyeOff} />
          <AdminStatCard label="À la une" value={totals.featured} icon={Star} />
          <AdminStatCard label="Cours associés" value={totals.courses} icon={BookOpen} />
          <AdminStatCard label="Questions associées" value={totals.questions} icon={MessageSquare} />
        </div>
      ) : null}

      <section className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_200px_210px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
            <input value={filters.query ?? ''} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="Rechercher nom ou slug" className="h-12 w-full rounded-xl border border-brand-border pl-10 pr-4 text-sm outline-none focus:border-brand-orange" />
          </label>
          <select value={filters.status ?? 'all'} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AdminSubjectFilters['status'] }))} className="h-12 rounded-xl border border-brand-border px-3 text-sm">
            <option value="all">Tous les statuts</option>
            <option value="published">Publiées</option>
            <option value="unpublished">Non publiées</option>
            <option value="hidden">Masquées</option>
            <option value="featured">À la une</option>
          </select>
          <select value={filters.sort ?? 'order'} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as AdminSubjectFilters['sort'] }))} className="h-12 rounded-xl border border-brand-border px-3 text-sm">
            <option value="order">Ordre d’affichage</option>
            <option value="newest">Plus récentes</option>
            <option value="courses">Plus de cours</option>
            <option value="questions">Plus de questions</option>
            <option value="alphabetical">Alphabétique</option>
          </select>
          {activeFilters ? <button type="button" onClick={() => setFilters({ status: 'all', sort: 'order' })} className="rounded-xl border border-brand-border px-4 py-3 text-sm font-bold text-brand-navy">Réinitialiser</button> : null}
        </div>
      </section>

      {notice ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</p> : null}
      {error ? <p className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700"><AlertTriangle className="h-5 w-5" />{error}</p> : null}
      {loading ? <LoadingSpinner label="Chargement des matières" /> : subjects.length ? (
        <div className="space-y-4">
          {subjects.map((subject) => <SubjectRow key={subject.id} subject={subject} busy={busyId === subject.id} onAction={(action) => void act(subject, action)} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-brand-border bg-white p-10 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-brand-orange" />
          <h2 className="mt-3 text-lg font-black text-brand-navy">{activeFilters ? 'Aucune matière ne correspond à vos filtres.' : 'Aucune matière trouvée.'}</h2>
        </div>
      )}
      <ActionDialog open={pendingAction?.action === 'hide'} title="Masquer cette matière ?" message={pendingAction?.subject.name} fieldLabel="Motif du masquage" required confirmLabel="Masquer" resetKey={pendingAction?.subject.id} onClose={() => setPendingAction(null)} onConfirm={(reason) => pendingAction ? execute(pendingAction.subject, 'hide', reason) : undefined} />
      <ActionDialog open={pendingAction?.action === 'delete'} title="Supprimer définitivement cette matière ?" message={pendingAction?.subject.name} confirmLabel="Supprimer" danger resetKey={pendingAction?.subject.id} onClose={() => setPendingAction(null)} onConfirm={() => pendingAction ? execute(pendingAction.subject, 'delete') : undefined} />
    </section>
  );
}

function SubjectRow({ subject, busy, onAction }: { subject: AdminSubjectSummary; busy: boolean; onAction: (action: AdminSubjectAction) => void }) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <SubjectVisual subject={subject} />
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2"><SubjectBadges subject={subject} /></div>
            <h2 className="mt-2 text-xl font-black text-brand-navy">{subject.name}</h2>
            <p className="text-sm text-slate-500">/{subject.slug} · ordre {subject.subject_order} · créée le {formatDate(subject.created_at)}</p>
            {subject.description ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{subject.description}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-slate-600">
          <span>{subject.coursesCount} cours</span>
          <span>{subject.questionsCount} questions</span>
          <span>{subject.teachersCount} profs</span>
        </div>
        <div className="flex flex-wrap gap-2 xl:max-w-md xl:justify-end">
          <Link to={`/admin/subjects/${subject.id}`} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">Voir</Link>
          <Link to={`/admin/subjects/${subject.id}/edit`} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy">Modifier</Link>
          <button disabled={busy} onClick={() => onAction(subject.is_published ? 'unpublish' : 'publish')} className="rounded-xl bg-brand-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{subject.is_published ? 'Dépublier' : 'Publier'}</button>
          <button disabled={busy} onClick={() => onAction(subject.is_hidden ? 'unhide' : 'hide')} className="rounded-xl border border-brand-border px-3 py-2 text-sm font-bold text-brand-navy disabled:opacity-50">{subject.is_hidden ? 'Restaurer' : 'Masquer'}</button>
          <button disabled={busy} onClick={() => onAction(subject.is_featured ? 'unfeature' : 'feature')} className="rounded-xl border border-orange-100 px-3 py-2 text-sm font-bold text-brand-orange disabled:opacity-50">{subject.is_featured ? 'Retirer de la une' : 'À la une'}</button>
          <button disabled={busy} onClick={() => onAction('delete')} className="rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50">Supprimer</button>
        </div>
      </div>
    </article>
  );
}

function SubjectVisual({ subject }: { subject: SubjectSummary }) {
  return <span style={subject.color ? { backgroundColor: `${subject.color}18`, color: subject.color } : undefined} className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange-50 text-lg font-bold text-brand-orange">{subject.icon_url ? <img src={subject.icon_url} alt="" className="h-full w-full object-cover" /> : subject.icon || subject.name.slice(0, 2).toUpperCase()}</span>;
}
type SubjectSummary = Pick<AdminSubjectSummary, 'icon_url' | 'icon' | 'color' | 'name'>;
function SubjectBadges({ subject }: { subject: AdminSubjectSummary }) {
  return (
    <>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${subject.is_published && !subject.is_hidden ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{subject.is_published ? 'Publiée' : 'Non publiée'}</span>
      {subject.is_hidden ? <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">Masquée</span> : null}
      {subject.is_featured ? <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-brand-orange">À la une</span> : null}
    </>
  );
}
